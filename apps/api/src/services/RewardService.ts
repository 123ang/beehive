// ============================================
// REWARD SERVICE
// ============================================

import { db, members, rewards, memberClosure, layerCounters } from "../db";
import { eq, and, sql, lte } from "drizzle-orm";
import { LAYER_REWARD_AMOUNTS, PENDING_REWARD_EXPIRY_MS } from "@beehive/shared";

export class RewardService {
  /**
   * Process direct sponsor reward when a new member joins
   */
  async processDirectSponsorReward(
    sponsorWallet: string,
    newMemberWallet: string
  ): Promise<void> {
    const sponsor = await db.query.members.findFirst({
      where: eq(members.walletAddress, sponsorWallet),
    });

    if (!sponsor) {
      console.log(`Sponsor not found: ${sponsorWallet}`);
      return;
    }

    const directSponsorReward = 100; // 100 USDT

    // Get actual direct referrals count for business logic
    const directReferralsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(members)
      .where(eq(members.sponsorId, sponsor.id));
    const actualDirectReferrals = directReferralsResult[0]?.count || 0;

    // Check sponsor's level to determine reward status
    if (sponsor.currentLevel === 0) {
      // Pending - sponsor not activated yet
      await db.insert(rewards).values({
        recipientWallet: sponsorWallet,
        sourceWallet: newMemberWallet,
        rewardType: "direct_sponsor",
        amount: directSponsorReward.toString(),
        currency: "USDT",
        status: "pending",
        notes: "Pending - sponsor must activate first",
      });
    } else if (sponsor.currentLevel === 1 && actualDirectReferrals >= 2) {
      // Pending - Level 1 members can only receive 2 direct sponsor rewards
      await db.insert(rewards).values({
        recipientWallet: sponsorWallet,
        sourceWallet: newMemberWallet,
        rewardType: "direct_sponsor",
        amount: directSponsorReward.toString(),
        currency: "USDT",
        status: "pending",
        notes: "Pending - upgrade to Level 2 required",
      });
    } else {
      // Instant payout
      await db.insert(rewards).values({
        recipientWallet: sponsorWallet,
        sourceWallet: newMemberWallet,
        rewardType: "direct_sponsor",
        amount: directSponsorReward.toString(),
        currency: "USDT",
        status: "instant",
      });

      // Update sponsor's direct referral count
      await db
        .update(members)
        .set({ directSponsorCount: sql`${members.directSponsorCount} + 1` })
        .where(eq(members.walletAddress, sponsorWallet));
    }
  }

  /**
   * Process layer reward when a member upgrades to a new level
   */
  async processLayerReward(
    memberWallet: string,
    level: number,
    paymentAmount: number
  ): Promise<void> {
    // Layer rewards start from Level 2
    if (level < 2) return;

    const member = await db.query.members.findFirst({
      where: eq(members.walletAddress, memberWallet),
    });

    if (!member) {
      console.log(`Member not found: ${memberWallet}`);
      return;
    }

    // Find the upline at the target layer depth
    const upline = await this.findUplineAtLayer(member.id, level);

    if (!upline) {
      console.log(`No upline at layer ${level} for ${memberWallet}`);
      return;
    }

    const rewardAmount = LAYER_REWARD_AMOUNTS[level] || 0;

    if (rewardAmount === 0) return;

    // Check if upline has reached the required level
    if ((upline.currentLevel ?? 0) >= level) {
      // Instant reward
      await db.insert(rewards).values({
        recipientWallet: upline.walletAddress,
        sourceWallet: memberWallet,
        rewardType: "layer_payout",
        amount: rewardAmount.toString(),
        currency: "USDT",
        status: "instant",
        layerNumber: level,
      });
    } else {
      // Pending reward with 72-hour expiration
      const expiresAt = new Date(Date.now() + PENDING_REWARD_EXPIRY_MS);
      await db.insert(rewards).values({
        recipientWallet: upline.walletAddress,
        sourceWallet: memberWallet,
        rewardType: "layer_payout",
        amount: rewardAmount.toString(),
        currency: "USDT",
        status: "pending",
        layerNumber: level,
        pendingExpiresAt: expiresAt,
        notes: `Need Level ${level}, current: ${upline.currentLevel}`,
      });
    }

    // Update layer counter
    await this.updateLayerCounter(upline.id, level);
  }

  /**
   * Find upline at a specific layer depth using Closure Table
   */
  async findUplineAtLayer(
    memberId: number,
    depth: number
  ): Promise<{ id: number; walletAddress: string; currentLevel: number | null } | null> {
    const result = await db
      .select({
        id: members.id,
        walletAddress: members.walletAddress,
        currentLevel: members.currentLevel,
      })
      .from(memberClosure)
      .innerJoin(members, eq(memberClosure.ancestorId, members.id))
      .where(
        and(
          eq(memberClosure.descendantId, memberId),
          eq(memberClosure.depth, depth)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Update layer counter for an upline
   */
  private async updateLayerCounter(uplineId: number, layerNumber: number): Promise<void> {
    // Check if counter exists
    const existing = await db.query.layerCounters.findFirst({
      where: and(
        eq(layerCounters.uplineMemberId, uplineId),
        eq(layerCounters.layerNumber, layerNumber)
      ),
    });

    if (existing) {
      // Update existing counter
      await db
        .update(layerCounters)
        .set({ upgradeCount: sql`${layerCounters.upgradeCount} + 1` })
        .where(
          and(
            eq(layerCounters.uplineMemberId, uplineId),
            eq(layerCounters.layerNumber, layerNumber)
          )
        );
    } else {
      // Insert new counter
      await db.insert(layerCounters).values({
        uplineMemberId: uplineId,
        layerNumber,
        upgradeCount: 1,
      });
    }
  }

  /**
   * Release pending rewards when a member upgrades
   */
  async releasePendingRewards(wallet: string, newLevel: number): Promise<number> {
    // Release layer payout rewards for levels <= newLevel
    const layerResult = await db
      .update(rewards)
      .set({
        status: "instant",
        pendingExpiresAt: null,
        notes: sql`CONCAT(COALESCE(${rewards.notes}, ''), ' (released after upgrade)')`,
      })
      .where(
        and(
          eq(rewards.recipientWallet, wallet),
          eq(rewards.status, "pending"),
          eq(rewards.rewardType, "layer_payout"),
          lte(rewards.layerNumber, newLevel)
        )
      )
      .returning({ id: rewards.id });

    let releasedCount = layerResult.length;

    // Release direct sponsor rewards if upgrading to Level 2+
    if (newLevel >= 2) {
      const directResult = await db
        .update(rewards)
        .set({
          status: "instant",
          pendingExpiresAt: null,
        })
        .where(
          and(
            eq(rewards.recipientWallet, wallet),
            eq(rewards.status, "pending"),
            eq(rewards.rewardType, "direct_sponsor")
          )
        )
        .returning({ id: rewards.id });

      releasedCount += directResult.length;
    }

    return releasedCount;
  }

  /**
   * Get reward summary for a member
   */
  async getRewardSummary(wallet: string) {
    const allRewards = await db
      .select()
      .from(rewards)
      .where(eq(rewards.recipientWallet, wallet));

    const summary = {
      totalDirectSponsor: "0",
      totalLayerPayout: "0",
      totalBCC: "0",
      pendingUSDT: "0",
      pendingBCC: "0",
      claimedUSDT: "0",
      claimedBCC: "0",
    };

    for (const reward of allRewards) {
      const amount = parseFloat(reward.amount);

      if (reward.rewardType === "direct_sponsor") {
        summary.totalDirectSponsor = (
          parseFloat(summary.totalDirectSponsor) + amount
        ).toString();
      } else if (reward.rewardType === "layer_payout") {
        summary.totalLayerPayout = (
          parseFloat(summary.totalLayerPayout) + amount
        ).toString();
      } else if (reward.rewardType === "bcc_token") {
        summary.totalBCC = (parseFloat(summary.totalBCC) + amount).toString();
      }

      if (reward.status === "pending") {
        if (reward.currency === "USDT") {
          summary.pendingUSDT = (
            parseFloat(summary.pendingUSDT) + amount
          ).toString();
        } else {
          summary.pendingBCC = (
            parseFloat(summary.pendingBCC) + amount
          ).toString();
        }
      } else if (reward.status === "claimed") {
        if (reward.currency === "USDT") {
          summary.claimedUSDT = (
            parseFloat(summary.claimedUSDT) + amount
          ).toString();
        } else {
          summary.claimedBCC = (
            parseFloat(summary.claimedBCC) + amount
          ).toString();
        }
      }
    }

    return summary;
  }

  /**
   * Process expired pending rewards
   */
  async processExpiredRewards(): Promise<number> {
    const now = new Date();
    
    const expired = await db
      .update(rewards)
      .set({
        status: "expired",
        notes: sql`CONCAT(COALESCE(${rewards.notes}, ''), ' (expired)')`,
      })
      .where(
        and(
          eq(rewards.status, "pending"),
          lte(rewards.pendingExpiresAt, now)
        )
      )
      .returning({ id: rewards.id });

    return expired.length;
  }
}

// Export singleton instance
export const rewardService = new RewardService();

