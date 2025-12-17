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
   * Phase B: Breadth-first fill: Subtree 1 pos 1, Subtree 2 pos 1, Subtree 3 pos 1,
   *         then Subtree 1 pos 2, Subtree 2 pos 2, Subtree 3 pos 2, etc.
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

    // Phase B: Breadth-first fill algorithm
    // Priority order:
    // 1. Subtree 1, Position 1
    // 2. Subtree 2, Position 1
    // 3. Subtree 3, Position 1
    // 4. Subtree 1, Position 2
    // 5. Subtree 2, Position 2
    // 6. Subtree 3, Position 2
    // 7. Subtree 1, Position 3
    // 8. Subtree 2, Position 3
    // 9. Subtree 3, Position 3
    // Then continue to deeper levels with same pattern

    // Get the 3 direct children of the sponsor (subtree 1, 2, 3) ordered by position
    const directChildren = await db
      .select({
        memberId: members.id,
        position: placements.position,
        joinedAt: members.joinedAt,
      })
      .from(placements)
      .innerJoin(members, eq(placements.childId, members.id))
      .where(eq(placements.parentId, sponsorId))
      .orderBy(asc(placements.position));

    if (directChildren.length === 0) {
      // Should not happen if Phase A worked, but handle it
      return null;
    }

    // Build slots in breadth-first order
    interface Slot {
      parentId: number;
      position: number; // 1, 2, or 3 (the actual position number)
      subtreePosition: number; // 1, 2, or 3 (which direct child this is)
      depth: number;
    }

    const slots: Slot[] = [];

    // First, check direct children (depth 1) in breadth-first order
    // For each position (1, 2, 3)
    for (let pos = 1; pos <= 3; pos++) {
      // For each direct child (subtree) in order (position 1, 2, 3)
      for (const child of directChildren) {
        const childCount = await this.getChildCount(child.memberId);
        const usedPositions = await this.getUsedPositions(child.memberId);
        
        // Check if this position is available for this subtree
        if (!usedPositions.includes(pos) && childCount < 3) {
          slots.push({
            parentId: child.memberId,
            position: pos,
            subtreePosition: child.position,
            depth: 1, // Direct children are at depth 1
          });
        }
      }
    }

    // If no slots found in direct children, search deeper levels
    // Continue with same breadth-first pattern at each depth
    if (slots.length === 0) {
      // Get all descendants at depth 2 and beyond, grouped by depth
      const allDescendants = await db
        .select({
          memberId: members.id,
          depth: memberClosure.depth,
          joinedAt: members.joinedAt,
        })
        .from(memberClosure)
        .innerJoin(members, eq(memberClosure.descendantId, members.id))
        .where(
          and(
            eq(memberClosure.ancestorId, sponsorId),
            sql`${memberClosure.depth} > 1`
          )
        )
        .orderBy(asc(memberClosure.depth), asc(members.joinedAt), asc(members.id));

      // Group by depth
      const byDepth = new Map<number, typeof allDescendants>();
      for (const candidate of allDescendants) {
        if (!byDepth.has(candidate.depth)) {
          byDepth.set(candidate.depth, []);
        }
        byDepth.get(candidate.depth)!.push(candidate);
      }

      // For each depth level (2, 3, 4, ...)
      const sortedDepths = Array.from(byDepth.keys()).sort((a, b) => a - b);
      for (const depth of sortedDepths) {
        const candidatesAtDepth = byDepth.get(depth)!;
        
        // For each position (1, 2, 3) - breadth-first
        for (let pos = 1; pos <= 3; pos++) {
          // For each candidate at this depth
          for (const candidate of candidatesAtDepth) {
            const childCount = await this.getChildCount(candidate.memberId);
            const usedPositions = await this.getUsedPositions(candidate.memberId);
            
            if (!usedPositions.includes(pos) && childCount < 3) {
              slots.push({
                parentId: candidate.memberId,
                position: pos,
                subtreePosition: 0, // Not a direct child, but we track depth
                depth: candidate.depth,
              });
              // Only take first available at this depth/position combination
              break;
            }
          }
        }
      }
    }

    if (slots.length === 0) {
      return null; // No available slots
    }

    // Sort slots to ensure breadth-first order:
    // 1) Position ASC (position 1 before 2 before 3)
    // 2) Depth ASC (shallower first)
    // 3) Subtree position ASC (subtree 1 before 2 before 3) - only for depth 1
    // 4) Parent ID ASC (stable tiebreak)
    slots.sort((a, b) => {
      // First: position (1 before 2 before 3)
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      
      // Second: depth (shallower first)
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }
      
      // Third: subtree position (subtree 1 before 2 before 3) - only matters at depth 1
      if (a.depth === 1 && b.depth === 1 && a.subtreePosition !== b.subtreePosition) {
        return a.subtreePosition - b.subtreePosition;
      }
      
      // Fourth: parent ID (stable tiebreak)
      return a.parentId - b.parentId;
    });

    // Return the first available slot (breadth-first order)
    return {
      parentId: slots[0].parentId,
      position: slots[0].position,
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

