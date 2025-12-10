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
   * Find placement position for a new member in 3x3 forced matrix
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

    // Phase B: Search sponsor's subtree for available slot (BFS)
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

    for (const candidate of candidates) {
      const childCount = await this.getChildCount(candidate.memberId);
      
      if (childCount < 3) {
        const usedPositions = await this.getUsedPositions(candidate.memberId);
        const availablePosition = [1, 2, 3].find((p) => !usedPositions.includes(p));

        if (availablePosition) {
          return {
            parentId: candidate.memberId,
            position: availablePosition,
          };
        }
      }
    }

    return null;
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

    // 2. Insert self-link in closure table
    await db
      .insert(memberClosure)
      .values({
        ancestorId: memberId,
        descendantId: memberId,
        depth: 0,
      })
      .onConflictDoNothing();

    // 3. Insert all ancestor relationships
    await db.execute(sql`
      INSERT INTO member_closure (ancestor_id, descendant_id, depth)
      SELECT ancestor_id, ${memberId}, depth + 1
      FROM member_closure
      WHERE descendant_id = ${parentId}
      ON CONFLICT DO NOTHING
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

