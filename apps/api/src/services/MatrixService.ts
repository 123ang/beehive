// ============================================
// MATRIX SERVICE (3x3 Tree Structure)
// ============================================

import { db, members, placements, memberClosure } from "../db";
import { eq, and, sql, asc } from "drizzle-orm";

interface PlacementResult {
  parentId: number;
  position: number;
}

interface TreeNode {
  id: number;
  walletAddress: string;
  username: string | null;
  currentLevel: number | null;
  position: number;
  depth: number;
  children: TreeNode[];
}

export class MatrixService {
  /**
   * Find placement position for a new member following the Direct Sales Tree algorithm
   * Phase A: Direct under sponsor if < 3 children
   * Phase B: Even spillover with round-robin, slot-based algorithm
   */
  async findPlacement(sponsorId: number): Promise<PlacementResult | null> {
    // Phase A: Try to place directly under sponsor
    const directCount = await this.getChildCount(sponsorId);

    if (directCount < 3) {
      const usedPositions = await this.getUsedPositions(sponsorId);
      const availablePosition = [1, 2, 3].find((p) => !usedPositions.includes(p));

      if (availablePosition) {
        return {
          parentId: sponsorId,
          position: availablePosition,
        };
      }
    }

    // Phase B: Even Spillover (Round-Robin, Slot-Based Algorithm)
    // Step 1: Get all candidates in sponsor's entire subtree with < 3 children
    const candidates = await db
      .select({
        memberId: members.id,
        depth: memberClosure.depth,
        joinedAt: members.joinedAt,
      })
      .from(memberClosure)
      .innerJoin(members, eq(memberClosure.descendantId, members.id))
      .where(eq(memberClosure.ancestorId, sponsorId))
      .orderBy(asc(memberClosure.depth), asc(members.joinedAt), asc(members.id));

    // Step 2: Build slots from candidates
    interface Slot {
      parentId: number;
      position: number; // 1, 2, or 3 (the actual position number)
      slotIndex: number; // 1, 2, or 3 (which free slot this is: 1st free, 2nd free, 3rd free)
      depth: number;
      parentJoinedAt: Date;
    }

    const slots: Slot[] = [];

    for (const candidate of candidates) {
      const childCount = await this.getChildCount(candidate.memberId);
      const usedPositions = await this.getUsedPositions(candidate.memberId);
      const freeCount = 3 - childCount;

      if (freeCount > 0) {
        // Get available positions in order (1, 2, 3)
        const availablePositions = [1, 2, 3].filter((p) => !usedPositions.includes(p));
        
        // Create slots for each free position
        // slotIndex = 1 for first free, 2 for second free, 3 for third free
        for (let slotIndex = 1; slotIndex <= freeCount; slotIndex++) {
          slots.push({
            parentId: candidate.memberId,
            position: availablePositions[slotIndex - 1], // actual position number (1, 2, or 3)
            slotIndex: slotIndex, // which free slot this is (1st, 2nd, or 3rd)
            depth: candidate.depth,
            parentJoinedAt: candidate.joinedAt,
          });
        }
      }
    }

    if (slots.length === 0) {
      return null; // No available slots
    }

    // Step 3: Sort slots deterministically
    // 1) slot index ASC (slot #1 before #2 before #3)
    // 2) depth ASC (shallower first)
    // 3) parent's joined_at ASC (earlier first)
    // 4) parent_id ASC (stable tiebreak)
    slots.sort((a, b) => {
      // First: slot index (1st free slot before 2nd free slot before 3rd free slot)
      if (a.slotIndex !== b.slotIndex) {
        return a.slotIndex - b.slotIndex;
      }
      
      // Second: depth (shallower first)
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }
      
      // Third: parent's joined_at (earlier first)
      const timeDiff = a.parentJoinedAt.getTime() - b.parentJoinedAt.getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      
      // Fourth: parent_id (stable tiebreak)
      return a.parentId - b.parentId;
    });

    // Step 4: Round-robin selection
    // Count how many members this sponsor referred BEFORE this new one
    const referralsBefore = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(members)
      .where(eq(members.sponsorId, sponsorId));

    const referralsCount = referralsBefore[0]?.count || 0;

    // If < 3, Phase A handled it already, so we're in Phase B
    // k = referrals_before - 3 + 1 (1-based index into slots)
    const k = referralsCount - 3 + 1;
    
    // Wrap around if past the end
    const selectedSlotIndex = ((k - 1) % slots.length);
    const selectedSlot = slots[selectedSlotIndex];

    return {
      parentId: selectedSlot.parentId,
      position: selectedSlot.position,
    };
  }

  /**
   * Place a new member in the matrix tree
   */
  async placeMember(
    memberId: number,
    parentId: number,
    position: number,
    sponsorId: number
  ): Promise<void> {
    // 1. Insert placement record
    await db.insert(placements).values({
      parentId,
      childId: memberId,
      position,
    });

    // 2. Insert self-link in closure table (MySQL: use INSERT IGNORE)
    try {
      await db
        .insert(memberClosure)
        .values({
          ancestorId: memberId,
          descendantId: memberId,
          depth: 0,
        });
    } catch (error: any) {
      // Ignore duplicate key errors (MySQL doesn't have ON CONFLICT)
      if (!error.message?.includes("Duplicate entry")) {
        throw error;
      }
    }

    // 3. Insert all ancestor relationships (MySQL: use INSERT IGNORE)
    await db.execute(sql`
      INSERT IGNORE INTO member_closure (ancestor_id, descendant_id, depth)
      SELECT ancestor_id, ${memberId}, depth + 1
      FROM member_closure
      WHERE descendant_id = ${parentId}
    `);

    // 4. Update member's root_id and sponsor_id
    const parent = await db.query.members.findFirst({
      where: eq(members.id, parentId),
    });

    if (parent) {
      await db
        .update(members)
        .set({
          rootId: parent.rootId || parentId,
          sponsorId: sponsorId,
        })
        .where(eq(members.id, memberId));
    }
  }

  /**
   * Get tree structure for a member
   */
  async getTree(memberId: number, maxDepth: number = 3): Promise<TreeNode | null> {
    // Get all descendants up to maxDepth
    const nodes = await db
      .select({
        id: members.id,
        walletAddress: members.walletAddress,
        username: members.username,
        currentLevel: members.currentLevel,
        depth: memberClosure.depth,
      })
      .from(memberClosure)
      .innerJoin(members, eq(memberClosure.descendantId, members.id))
      .where(
        and(
          eq(memberClosure.ancestorId, memberId),
          sql`${memberClosure.depth} <= ${maxDepth}`
        )
      )
      .orderBy(asc(memberClosure.depth), asc(members.id));

    if (nodes.length === 0) return null;

    // Get placement info for positioning
    const placementInfo = await db
      .select({
        childId: placements.childId,
        parentId: placements.parentId,
        position: placements.position,
      })
      .from(placements)
      .where(
        sql`${placements.childId} IN (${sql.join(
          nodes.map((n) => sql`${n.id}`),
          sql`, `
        )})`
      );

    const placementMap = new Map(
      placementInfo.map((p) => [p.childId, { parentId: p.parentId, position: p.position }])
    );

    return this.buildTreeStructure(nodes, memberId, placementMap);
  }

  /**
   * Get direct children of a member
   */
  async getDirectChildren(memberId: number): Promise<TreeNode[]> {
    const children = await db
      .select({
        id: members.id,
        walletAddress: members.walletAddress,
        username: members.username,
        currentLevel: members.currentLevel,
        position: placements.position,
      })
      .from(placements)
      .innerJoin(members, eq(placements.childId, members.id))
      .where(eq(placements.parentId, memberId))
      .orderBy(asc(placements.position));

    return children.map((c) => ({
      id: c.id,
      walletAddress: c.walletAddress,
      username: c.username,
      currentLevel: c.currentLevel,
      position: c.position,
      depth: 1,
      children: [],
    }));
  }

  /**
   * Get team size (total descendants)
   */
  async getTeamSize(memberId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(memberClosure)
      .where(
        and(
          eq(memberClosure.ancestorId, memberId),
          sql`${memberClosure.depth} > 0`
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Get count at each layer
   */
  async getLayerCounts(memberId: number, maxDepth: number = 19): Promise<Record<number, number>> {
    const result = await db
      .select({
        depth: memberClosure.depth,
        count: sql<number>`COUNT(*)`,
      })
      .from(memberClosure)
      .where(
        and(
          eq(memberClosure.ancestorId, memberId),
          sql`${memberClosure.depth} > 0`,
          sql`${memberClosure.depth} <= ${maxDepth}`
        )
      )
      .groupBy(memberClosure.depth);

    const counts: Record<number, number> = {};
    for (const row of result) {
      counts[row.depth] = row.count;
    }
    return counts;
  }

  // Private helper methods

  private async getChildCount(parentId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(placements)
      .where(eq(placements.parentId, parentId));

    return result[0]?.count || 0;
  }

  private async getUsedPositions(parentId: number): Promise<number[]> {
    const result = await db
      .select({ position: placements.position })
      .from(placements)
      .where(eq(placements.parentId, parentId));

    return result.map((r) => r.position);
  }

  private buildTreeStructure(
    nodes: Array<{
      id: number;
      walletAddress: string;
      username: string | null;
      currentLevel: number | null;
      depth: number;
    }>,
    rootId: number,
    placementMap: Map<number, { parentId: number; position: number }>
  ): TreeNode | null {
    const nodeMap = new Map<number, TreeNode>();

    // Initialize all nodes
    for (const node of nodes) {
      const placement = placementMap.get(node.id);
      nodeMap.set(node.id, {
        ...node,
        position: placement?.position || 0,
        children: [],
      });
    }

    // Build parent-child relationships
    for (const node of nodes) {
      const placement = placementMap.get(node.id);
      if (placement && nodeMap.has(placement.parentId)) {
        const parent = nodeMap.get(placement.parentId)!;
        const child = nodeMap.get(node.id)!;
        parent.children.push(child);
      }
    }

    // Sort children by position
    for (const node of nodeMap.values()) {
      node.children.sort((a, b) => a.position - b.position);
    }

    return nodeMap.get(rootId) || null;
  }
}

// Export singleton instance
export const matrixService = new MatrixService();

