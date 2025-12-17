// ============================================
// REWARD SERVICE
// ============================================

import { db, members, rewards, memberClosure, layerCounters } from "../db";
import { eq, and, sql, lte } from "drizzle-orm";
import { LAYER_REWARD_AMOUNTS, PENDING_REWARD_EXPIRY_MS } from "@beehive/shared";

export class RewardService {
  /**
   * Process direct sponsor reward when a new member joins
   * RULE: 
   * - First 2 direct referrals: Instant reward (100 USDT)
   * - 3rd+ direct referral: Pending reward (until referral purchases Level 2)
   */
  async processDirectSponsorReward(
    sponsorWallet: string,
    newMemberWallet: string,
    newMemberLevel: number = 1
  ): Promise<void> {
    console.log(`\n🎁 ============================================`);
    console.log(`🎁 PROCESSING DIRECT SPONSOR REWARD`);
    console.log(`🎁 ============================================`);
    console.log(`🎁 Sponsor: ${sponsorWallet}`);
    console.log(`🎁 New Member: ${newMemberWallet}`);
    console.log(`🎁 New Member Level: ${newMemberLevel}`);
    
    // Normalize wallet addresses
    const normalizedSponsorWallet = sponsorWallet.toLowerCase();
    const normalizedNewMemberWallet = newMemberWallet.toLowerCase();
    
    const sponsor = await db.query.members.findFirst({
      where: eq(members.walletAddress, normalizedSponsorWallet),
    });

    if (!sponsor) {
      console.error(`❌ Sponsor not found: ${normalizedSponsorWallet}`);
      return;
    }

    const directSponsorReward = 100; // 100 USDT

    // Get the new member to check their level
    const newMember = await db.query.members.findFirst({
      where: eq(members.walletAddress, normalizedNewMemberWallet),
    });

    if (!newMember) {
      console.error(`❌ New member not found: ${normalizedNewMemberWallet}`);
      return;
    }

    // Count existing direct referrals (includes the current one being added since member is already in DB)
    const directReferralsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(members)
      .where(eq(members.sponsorId, sponsor.id));
    const totalDirectReferralsCount = directReferralsResult[0]?.count || 0;

    console.log(`🎁 Total Direct Referrals Count: ${totalDirectReferralsCount}`);

    // RULE: First 2 direct referrals get instant reward, 3rd+ get pending (if referral is Level 1)
    // Since the new member is already in DB, count includes them, so check <= 2 for first 2 referrals
    const isFirstTwoReferrals = totalDirectReferralsCount <= 2;
    const isLevel1Referral = newMemberLevel === 1 || newMember.currentLevel === 1;

    console.log(`🎁 Is First Two Referrals: ${isFirstTwoReferrals}`);
    console.log(`🎁 Is Level 1 Referral: ${isLevel1Referral}`);

    if (isFirstTwoReferrals) {
      // First 2 referrals: Instant reward
      console.log(`🎁 Inserting instant reward for ${normalizedSponsorWallet}`);
      await db.insert(rewards).values({
        recipientWallet: normalizedSponsorWallet,
        sourceWallet: normalizedNewMemberWallet,
        rewardType: "direct_sponsor",
        amount: directSponsorReward.toString(),
        currency: "USDT",
        status: "instant",
      });
      console.log(`✅ Reward inserted successfully into database`);

      // Process USDT reward payment from company account (just records transaction, doesn't use blockchain)
      try {
        const { processUSDTRewardPayment } = await import("../utils/paymentDistribution");
        await processUSDTRewardPayment(
          normalizedSponsorWallet,
          directSponsorReward,
          "direct_sponsor",
          normalizedNewMemberWallet
        );
        console.log(`✅ Reward payment transaction recorded`);
      } catch (error: any) {
        console.error(`❌ Failed to record reward payment transaction (non-blocking):`, error.message);
        // Don't throw - reward is already in database
      }

      console.log(`✅ Direct sponsor reward (100 USDT) INSTANT for ${normalizedSponsorWallet} - referral #${totalDirectReferralsCount}`);
    } else if (isLevel1Referral) {
      // 3rd+ referral and referral is Level 1: Pending until referral purchases Level 2
      console.log(`🎁 Inserting pending reward for ${normalizedSponsorWallet}`);
      await db.insert(rewards).values({
        recipientWallet: normalizedSponsorWallet,
        sourceWallet: normalizedNewMemberWallet,
        rewardType: "direct_sponsor",
        amount: directSponsorReward.toString(),
        currency: "USDT",
        status: "pending",
        notes: `Pending - will be released when ${normalizedNewMemberWallet} purchases Level 2`,
      });
      console.log(`✅ Pending reward inserted successfully`);
      
      console.log(`⏳ Direct sponsor reward (100 USDT) PENDING for ${normalizedSponsorWallet} - referral #${totalDirectReferralsCount} (will release when ${normalizedNewMemberWallet} purchases Level 2)`);
    } else {
      // 3rd+ referral but referral is Level 2+: Instant reward
      console.log(`🎁 Inserting instant reward for ${normalizedSponsorWallet} (referral is Level 2+)`);
      await db.insert(rewards).values({
        recipientWallet: normalizedSponsorWallet,
        sourceWallet: normalizedNewMemberWallet,
        rewardType: "direct_sponsor",
        amount: directSponsorReward.toString(),
        currency: "USDT",
        status: "instant",
      });
      console.log(`✅ Reward inserted successfully`);

      // Process USDT reward payment from company account
      const { processUSDTRewardPayment } = await import("../utils/paymentDistribution");
      await processUSDTRewardPayment(
        normalizedSponsorWallet,
        directSponsorReward,
        "direct_sponsor",
        normalizedNewMemberWallet
      );

      console.log(`✅ Direct sponsor reward (100 USDT) INSTANT for ${normalizedSponsorWallet} - referral #${totalDirectReferralsCount} (referral is Level 2+)`);
    }

    // Update sponsor's direct referral count
    await db
      .update(members)
      .set({ directSponsorCount: sql`${members.directSponsorCount} + 1` })
      .where(eq(members.walletAddress, sponsorWallet));
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

      // Process USDT reward payment from company account
      const { processUSDTRewardPayment } = await import("../utils/paymentDistribution");
      await processUSDTRewardPayment(
        upline.walletAddress,
        rewardAmount,
        "layer_payout",
        memberWallet
      );
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
    // First, get the rewards that will be updated
    const rewardsToRelease = await db.query.rewards.findMany({
      where: and(
        eq(rewards.recipientWallet, wallet),
        eq(rewards.status, "pending"),
        eq(rewards.rewardType, "layer_payout"),
        lte(rewards.layerNumber, newLevel)
      ),
    });

    // Update the rewards
    await db
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
      );

    // Process USDT payments for released layer rewards
    const { processUSDTRewardPayment } = await import("../utils/paymentDistribution");
    for (const reward of rewardsToRelease) {
      if (reward.amount && reward.currency === "USDT") {
        await processUSDTRewardPayment(
          wallet,
          parseFloat(reward.amount),
          "layer_payout",
          reward.sourceWallet || undefined
        );
      }
    }

    let releasedCount = rewardsToRelease.length;

    // Release direct sponsor rewards when member upgrades to Level 2
    // These are rewards where THIS member (wallet) is the sourceWallet (they triggered the reward)
    // The recipient is their sponsor, who will now receive the reward
    if (newLevel === 2) {
      // First, get the rewards that will be updated
      const directRewardsToRelease = await db.query.rewards.findMany({
        where: and(
          eq(rewards.sourceWallet, wallet), // This member triggered the reward
          eq(rewards.status, "pending"),
          eq(rewards.rewardType, "direct_sponsor")
        ),
      });

      // Update the rewards
      await db
        .update(rewards)
        .set({
          status: "instant",
          pendingExpiresAt: null,
          notes: sql`CONCAT(COALESCE(${rewards.notes}, ''), ' (released after member upgraded to Level 2)')`,
        })
        .where(
          and(
            eq(rewards.sourceWallet, wallet), // This member triggered the reward
            eq(rewards.status, "pending"),
            eq(rewards.rewardType, "direct_sponsor")
          )
        );

      // Process USDT payments for released direct sponsor rewards
      // The recipient is the sponsor who gets the reward
      for (const reward of directRewardsToRelease) {
        if (reward.amount && reward.currency === "USDT" && reward.recipientWallet) {
          await processUSDTRewardPayment(
            reward.recipientWallet,
            parseFloat(reward.amount),
            "direct_sponsor",
            wallet // sourceWallet is the member who just upgraded
          );
        }
      }

      releasedCount += directRewardsToRelease.length;
    }

    return releasedCount;
  }

  /**
   * Get reward summary for a member
   */
  async getRewardSummary(wallet: string) {
    try {
      // Normalize wallet address to lowercase for consistent querying
      const normalizedWallet = wallet.toLowerCase();
      
      const allRewards = await db
        .select()
        .from(rewards)
        .where(eq(rewards.recipientWallet, normalizedWallet));

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
        const amount = parseFloat(reward.amount || "0");
        if (isNaN(amount)) continue;

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
        } else if (reward.status === "claimed" || reward.status === "instant") {
          // "instant" status means withdrawn/claimed
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
    } catch (error: any) {
      console.error("Error in getRewardSummary:", error);
      // Return default summary on error
      return {
        totalDirectSponsor: "0",
        totalLayerPayout: "0",
        totalBCC: "0",
        pendingUSDT: "0",
        pendingBCC: "0",
        claimedUSDT: "0",
        claimedBCC: "0",
      };
    }
  }

  /**
   * Process expired pending rewards
   */
  async processExpiredRewards(): Promise<number> {
    const now = new Date();
    
    // First, get the expired rewards
    const expiredRewards = await db.query.rewards.findMany({
      where: and(
        eq(rewards.status, "pending"),
        lte(rewards.pendingExpiresAt, now)
      ),
    });

    // Update the expired rewards
    await db
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
      );

    return expiredRewards.length;
  }
}

// Export singleton instance
export const rewardService = new RewardService();

