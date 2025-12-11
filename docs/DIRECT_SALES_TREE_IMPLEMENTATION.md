# Direct Sales Tree Implementation

This document describes the implementation of the Direct Sales Tree structure for the Beehive platform, following the algorithm specified in `DirectSales_Tree_Guide.md`.

## Overview

The system implements a **3-wide ternary tree** (each member has ≤ 3 children) with:
- **Phase A**: Direct placement under sponsor if sponsor has < 3 children
- **Phase B**: Even spillover using round-robin, slot-based algorithm across sponsor's entire subtree
- **No depth cap**: Tree can grow arbitrarily deep

## Database Schema

### Tables

1. **`members`** - Core member data
   - `id`, `wallet_address`, `username`
   - `sponsor_id` - Business referrer (not always placement parent)
   - `root_id` - Top ancestor of placed team
   - `current_level`, `joined_at`, etc.

2. **`placements`** - Tree parenting structure
   - `parent_id`, `child_id`, `position` (1, 2, or 3)
   - Enforces ≤3 children per parent via `UNIQUE(parent_id, position)`

3. **`member_closure`** - Transitive closure for fast queries
   - `ancestor_id`, `descendant_id`, `depth`
   - Enables O(1) depth checks and efficient subtree reads

## Placement Algorithm

### Phase A: Direct Placement
If sponsor has < 3 children, place new member directly under sponsor at lowest free position (1→2→3).

### Phase B: Round-Robin Spillover
1. **Candidate Set**: All nodes in sponsor's entire subtree with < 3 children
2. **Slot Creation**: Convert each candidate's free capacity into ordered slots
   - 1 free → slot #1
   - 2 free → slots #1, #2
   - 3 free → slots #1, #2, #3
3. **Sorting**: Deterministic sort by:
   1. Slot index ASC (slot #1 before #2 before #3)
   2. Depth ASC (shallower first)
   3. Parent's `joined_at` ASC (earlier first)
   4. `parent_id` ASC (stable tiebreak)
4. **Round-Robin Selection**:
   - `k = referrals_before - 3 + 1` (1-based index)
   - Select k-th slot, wrap around if past end
5. **Placement**: Place under selected slot's parent at lowest free position

## Implementation Files

### Core Service
- **`apps/api/src/services/MatrixService.ts`**
  - `findPlacement(sponsorId)` - Implements Phase A & B algorithm
  - `placeMember(memberId, parentId, position, sponsorId)` - Places member and updates closure table
  - `getTree(memberId, maxDepth)` - Returns tree structure for visualization

### Utility Functions
- **`apps/api/src/utils/memberPlacement.ts`**
  - `createMemberWithPlacement()` - Creates member and places in tree
  - `createMemberFromUser()` - Creates member from existing user record

### API Endpoints
- **`POST /api/members/register`** - Register new member (uses placement algorithm)
- **`GET /api/members/tree?depth=2`** - Get tree structure showing:
  - Current member info
  - Sponsor info
  - Tree with 2 layers below (default)

## Usage Examples

### Creating a Member with Placement

```typescript
import { createMemberWithPlacement } from "../utils/memberPlacement";

// Create member at Level 1 with sponsor
const result = await createMemberWithPlacement(
  "0x1234...",
  1, // Level 1
  "0x5678...", // Sponsor wallet address
  "username" // Optional
);

console.log(`Member ID: ${result.memberId}`);
console.log(`Placed under parent ${result.placement.parentId} at position ${result.placement.position}`);
```

### Getting Tree Structure

```typescript
// Frontend API call
const response = await fetch("/api/members/tree?depth=2", {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const { data } = await response.json();
// data.member - Current member info
// data.sponsor - Sponsor info
// data.tree - Tree structure with 2 layers below
```

## Tree Visualization Format

The `/api/members/tree` endpoint returns:

```json
{
  "success": true,
  "data": {
    "member": {
      "id": 1,
      "walletAddress": "0x1234...",
      "username": "user1",
      "currentLevel": 1,
      "joinedAt": "2025-01-01T00:00:00Z"
    },
    "sponsor": {
      "id": 0,
      "walletAddress": "0x5678...",
      "username": "sponsor1",
      "currentLevel": 2
    },
    "tree": {
      "id": 1,
      "walletAddress": "0x1234...",
      "position": 1,
      "depth": 0,
      "children": [
        {
          "id": 2,
          "walletAddress": "0xabcd...",
          "position": 1,
          "depth": 1,
          "children": [...]
        },
        {
          "id": 3,
          "walletAddress": "0xefgh...",
          "position": 2,
          "depth": 1,
          "children": []
        }
      ]
    }
  }
}
```

## Closure Table Maintenance

When placing a member:
1. Insert self-link: `(memberId, memberId, 0)`
2. For every ancestor of parent, insert: `(ancestorId, memberId, depth+1)`

This is handled automatically by `placeMember()` method.

## Notes

- **MySQL Compatibility**: Uses `INSERT IGNORE` instead of PostgreSQL's `ON CONFLICT DO NOTHING`
- **Concurrency**: Placement uses database transactions to prevent race conditions
- **Performance**: Closure table enables fast subtree queries without recursive CTEs
- **Visualization**: Frontend can use vis-network, Cytoscape.js, or D3.js for tree rendering

## Next Steps

1. **Bulk Import Enhancement**: Update bulk import to create members and place them in tree
2. **Migration Script**: Build tree structure for existing members from `members_update.csv`
3. **Frontend Integration**: Build matrix visualization component using tree data

