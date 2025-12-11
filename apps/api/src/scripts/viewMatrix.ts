// ============================================
// VIEW 3X3 MATRIX SCRIPT
// Displays members in a 3x3 matrix tree structure
// ============================================

import { db, members, placements, memberClosure } from "../db";
import { eq, and, sql, asc } from "drizzle-orm";

interface MatrixNode {
  id: number;
  walletAddress: string;
  username: string | null;
  position: number;
  level: number;
  children: MatrixNode[];
}

/**
 * Get matrix view for a specific member (or root)
 */
async function viewMatrix(memberIdOrWallet?: number | string, maxDepth: number = 3) {
  console.log("📊 Generating 3x3 Matrix View...\n");

  try {
    // Find the root member
    let rootMemberId: number;

    if (memberIdOrWallet) {
      // If memberIdOrWallet is a number, treat as ID
      if (typeof memberIdOrWallet === "number") {
        rootMemberId = memberIdOrWallet;
      } else {
        // Otherwise, treat as wallet address
        const member = await db.query.members.findFirst({
          where: eq(members.walletAddress, memberIdOrWallet.toLowerCase()),
        });

        if (!member) {
          console.error(`❌ Member not found: ${memberIdOrWallet}`);
          process.exit(1);
        }

        rootMemberId = member.id;
      }
    } else {
      // Find a root member (one without a placement parent)
      // Get all members
      const allMembers = await db.query.members.findMany({
        orderBy: [asc(members.joinedAt)],
      });

      // Get all placed members
      const placedMembers = await db.query.placements.findMany({
        columns: { childId: true },
      });

      const placedIds = new Set(placedMembers.map((p) => p.childId));

      // Find first member that's not placed
      const rootMember = allMembers.find((m) => !placedIds.has(m.id));

      if (!rootMember) {
        // If all members are placed, find one with root_id = id (self-root)
        const selfRoot = await db.query.members.findFirst({
          where: sql`${members.id} = ${members.rootId}`,
          orderBy: [asc(members.joinedAt)],
        });

        if (!selfRoot) {
          console.error("❌ No root member found. Run fixMemberPlacements first.");
          process.exit(1);
        }

        rootMemberId = selfRoot.id;
      } else {
        rootMemberId = rootMember.id;
      }

      console.log(`🌳 Using root member: ID ${rootMemberId}`);
    }

    // Get the root member details
    const rootMember = await db.query.members.findFirst({
      where: eq(members.id, rootMemberId),
    });

    if (!rootMember) {
      console.error(`❌ Root member not found: ${rootMemberId}`);
      process.exit(1);
    }

    console.log(`\n📋 Root Member:`);
    console.log(`   ID: ${rootMember.id}`);
    console.log(`   Wallet: ${rootMember.walletAddress}`);
    console.log(`   Username: ${rootMember.username || "N/A"}`);
    console.log(`   Level: ${rootMember.currentLevel || 0}`);
    console.log(`\n${"=".repeat(80)}\n`);

    // Build the matrix tree
    const matrixTree = await buildMatrixTree(rootMemberId, maxDepth);

    // Display the matrix
    displayMatrix(matrixTree, 0, "");

    // Print statistics
    console.log(`\n${"=".repeat(80)}`);
    console.log("📈 Statistics:");
    const stats = calculateStats(matrixTree);
    console.log(`   Total Members: ${stats.total}`);
    console.log(`   Levels: ${stats.levels}`);
    console.log(`   Positions Filled: ${stats.positionsFilled}/${stats.positionsTotal} (${Math.round((stats.positionsFilled / stats.positionsTotal) * 100)}%)`);
    console.log(`   Average Children per Member: ${stats.avgChildren.toFixed(2)}`);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

/**
 * Build matrix tree structure
 */
async function buildMatrixTree(rootId: number, maxDepth: number): Promise<MatrixNode> {
  // Get all descendants up to maxDepth
  const nodes = await db
    .select({
      id: members.id,
      walletAddress: members.walletAddress,
      username: members.username,
      depth: memberClosure.depth,
    })
    .from(memberClosure)
    .innerJoin(members, eq(memberClosure.descendantId, members.id))
    .where(
      and(
        eq(memberClosure.ancestorId, rootId),
        sql`${memberClosure.depth} <= ${maxDepth}`
      )
    )
    .orderBy(asc(memberClosure.depth), asc(members.id));

  if (nodes.length === 0) {
    const root = await db.query.members.findFirst({
      where: eq(members.id, rootId),
    });

    if (!root) {
      throw new Error(`Root member ${rootId} not found`);
    }

    return {
      id: root.id,
      walletAddress: root.walletAddress,
      username: root.username,
      position: 0,
      level: 0,
      children: [],
    };
  }

  // Get placement info
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

  // Build tree structure
  const nodeMap = new Map<number, MatrixNode>();

  // Initialize all nodes
  for (const node of nodes) {
    const placement = placementMap.get(node.id);
    nodeMap.set(node.id, {
      id: node.id,
      walletAddress: node.walletAddress,
      username: node.username,
      position: placement?.position || 0,
      level: node.depth,
      children: [],
    });
  }

  // Add root node if not in nodes
  if (!nodeMap.has(rootId)) {
    const root = await db.query.members.findFirst({
      where: eq(members.id, rootId),
    });

    if (root) {
      nodeMap.set(rootId, {
        id: root.id,
        walletAddress: root.walletAddress,
        username: root.username,
        position: 0,
        level: 0,
        children: [],
      });
    }
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

  return nodeMap.get(rootId)!;
}

/**
 * Display matrix tree in a readable format
 */
function displayMatrix(node: MatrixNode, depth: number, prefix: string) {
  const indent = "  ".repeat(depth);
  const positionLabel = node.position > 0 ? `[Pos ${node.position}]` : "[ROOT]";
  const username = node.username ? ` (${node.username})` : "";
  const levelLabel = `L${node.level}`;

  console.log(`${indent}${prefix}${levelLabel} ${positionLabel} ID:${node.id} | ${node.walletAddress.substring(0, 10)}...${username}`);

  // Display children in 3x3 format
  if (node.children.length > 0) {
    // Group children by position
    const childrenByPos: (MatrixNode | null)[] = [null, null, null];
    for (const child of node.children) {
      if (child.position >= 1 && child.position <= 3) {
        childrenByPos[child.position - 1] = child;
      }
    }

    // Display in 3 columns
    const hasChildren = childrenByPos.some((c) => c !== null);
    if (hasChildren) {
      const nextPrefix = depth === 0 ? "└─" : "  ";
      for (let i = 0; i < 3; i++) {
        const child = childrenByPos[i];
        if (child) {
          const childPrefix = i === 0 ? "├─" : i === 1 ? "├─" : "└─";
          displayMatrix(child, depth + 1, childPrefix);
        } else {
          // Show empty slot
          const emptyPrefix = i === 0 ? "├─" : i === 1 ? "├─" : "└─";
          console.log(`${indent}  ${emptyPrefix}[Empty Slot ${i + 1}]`);
        }
      }
    }
  }
}

/**
 * Calculate statistics
 */
function calculateStats(node: MatrixNode): {
  total: number;
  levels: number;
  positionsFilled: number;
  positionsTotal: number;
  avgChildren: number;
} {
  let total = 1; // Count root
  let positionsFilled = 0;
  let positionsTotal = 0;
  let totalChildren = 0;
  let maxLevel = node.level;

  function traverse(n: MatrixNode) {
    positionsTotal += 3; // Each node can have 3 children
    positionsFilled += n.children.length;
    totalChildren += n.children.length;

    for (const child of n.children) {
      total++;
      maxLevel = Math.max(maxLevel, child.level);
      traverse(child);
    }
  }

  traverse(node);

  return {
    total,
    levels: maxLevel + 1,
    positionsFilled,
    positionsTotal,
    avgChildren: total > 0 ? totalChildren / total : 0,
  };
}

// Parse command line arguments
const args = process.argv.slice(2);
let memberIdOrWallet: number | string | undefined;
let maxDepth = 3;

if (args.length > 0) {
  const firstArg = args[0];
  // Check if it's a number
  if (!isNaN(Number(firstArg))) {
    memberIdOrWallet = Number(firstArg);
  } else {
    memberIdOrWallet = firstArg;
  }
}

if (args.length > 1) {
  maxDepth = Number(args[1]) || 3;
}

// Run the script
viewMatrix(memberIdOrWallet, maxDepth)
  .then(() => {
    console.log("\n✅ Matrix view completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

export { viewMatrix };

