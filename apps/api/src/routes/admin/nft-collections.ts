import { Hono } from "hono";
import { db } from "../../db";
import { nftCollections } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { adminAuth, requirePermission } from "../../middleware/adminAuth";
import { logActivity, getClientIp, getUserAgent } from "../../utils/activityLogger";
import { nftService } from "../../services/NFTService";

const adminNftCollectionsRouter = new Hono();
adminNftCollectionsRouter.use("/*", adminAuth);

// Get all NFT collections
adminNftCollectionsRouter.get("/", requirePermission("nft.create"), async (c) => {
  const collections = await db
    .select()
    .from(nftCollections)
    .orderBy(desc(nftCollections.createdAt));

  // Add available count (minted - sold = available in company wallet)
  const collectionsWithAvailable = collections.map((col) => ({
    ...col,
    available: (col.minted || 0) - (col.sold || 0),
  }));

  return c.json({ success: true, data: collectionsWithAvailable });
});

// Create NFT collection
adminNftCollectionsRouter.post("/", requirePermission("nft.create"), async (c) => {
  const admin = c.get("admin");
  const { shortName, name, description, bccPrice, bccReward, maxSupply, contractAddress, active } = await c.req.json();

  // Validate required fields
  if (!bccPrice || parseFloat(bccPrice) <= 0) {
    return c.json({ error: "BCC price is required and must be greater than 0" }, 400);
  }

  await db.insert(nftCollections).values({
    shortName,
    name,
    description: description || null,
    bccPrice: bccPrice.toString(),
    bccReward: bccReward?.toString() || "0",
    maxSupply,
    contractAddress: contractAddress || null,
    active: active !== undefined ? active : true,
    createdBy: admin.adminId,
    minted: 0,
    sold: 0,
  });

  // Get inserted collection ID (MySQL doesn't support returningId)
  const [inserted] = await db
    .select()
    .from(nftCollections)
    .where(eq(nftCollections.createdBy, admin.adminId))
    .orderBy(desc(nftCollections.createdAt))
    .limit(1);

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.create_nft_collection",
    metadata: { collectionId: inserted.id, bccPrice, maxSupply },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true, data: { id: inserted.id } });
});

// Update NFT collection
// NOTE: maxSupply can only be INCREASED, not decreased
adminNftCollectionsRouter.put("/:id", requirePermission("nft.update"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));
  const { shortName, name, description, bccPrice, bccReward, maxSupply, contractAddress, active } = await c.req.json();

  // Get current collection
  const [currentCollection] = await db
    .select()
    .from(nftCollections)
    .where(eq(nftCollections.id, id))
    .limit(1);

  if (!currentCollection) {
    return c.json({ error: "Collection not found" }, 404);
  }

  const updateData: any = {};
  if (shortName !== undefined) updateData.shortName = shortName;
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (bccPrice !== undefined) updateData.bccPrice = bccPrice.toString();
  if (bccReward !== undefined) updateData.bccReward = bccReward.toString();
  if (contractAddress !== undefined) updateData.contractAddress = contractAddress;
  if (active !== undefined) updateData.active = active;

  // maxSupply can only be increased
  if (maxSupply !== undefined) {
    if (maxSupply < currentCollection.maxSupply) {
      return c.json({ 
        error: `Cannot decrease maxSupply. Current: ${currentCollection.maxSupply}, Requested: ${maxSupply}` 
      }, 400);
    }
    if (maxSupply < (currentCollection.minted || 0)) {
      return c.json({ 
        error: `maxSupply cannot be less than already minted (${currentCollection.minted})` 
      }, 400);
    }
    updateData.maxSupply = maxSupply;
  }

  await db.update(nftCollections).set(updateData).where(eq(nftCollections.id, id));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.update_nft_collection",
    metadata: { collectionId: id, changes: updateData },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

/**
 * Mint more NFTs to company wallet (on-chain via mintMore)
 * This increases the supply - NFTs go to company wallet for later sale
 * Requires contractCollectionId to be set (the token ID from the contract)
 * POST /api/admin/nft-collections/:id/mint
 */
adminNftCollectionsRouter.post("/:id/mint", requirePermission("nft.mint"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));
  const { quantity, onChain } = await c.req.json();

  if (!quantity || quantity <= 0) {
    return c.json({ error: "Quantity must be greater than 0" }, 400);
  }

  // Get collection
  const [collection] = await db
    .select()
    .from(nftCollections)
    .where(eq(nftCollections.id, id))
    .limit(1);

  if (!collection) {
    return c.json({ error: "Collection not found" }, 404);
  }

  // Check supply
  const newMinted = (collection.minted || 0) + quantity;
  if (newMinted > collection.maxSupply) {
    return c.json({ 
      error: `Exceeds max supply. Max: ${collection.maxSupply}, Already minted: ${collection.minted}, Requested: ${quantity}` 
    }, 400);
  }

  let txHash: string | undefined;

  // If onChain is true, call mintMore on the contract
  if (onChain) {
    if (!collection.contractCollectionId) {
      return c.json({ 
        error: "Contract collection ID not set. Create on-chain first using /create-onchain endpoint." 
      }, 400);
    }

    const companyWallet = nftService.getCompanyWalletAddress();
    console.log(`🎨 Admin minting ${quantity} more NFTs (token #${collection.contractCollectionId}) to: ${companyWallet}`);

    const mintResult = await nftService.mintMore(
      collection.contractCollectionId,
      quantity,
      collection.contractAddress || undefined
    );

    if (!mintResult.success) {
      return c.json({ 
        error: mintResult.error || "On-chain mintMore failed" 
      }, 500);
    }

    txHash = mintResult.txHash;
    console.log(`✅ On-chain mintMore successful: ${txHash}`);
  }

  // Update minted count in database
  await db
    .update(nftCollections)
    .set({ minted: newMinted })
    .where(eq(nftCollections.id, id));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.mint_nft",
    metadata: { 
      collectionId: id, 
      contractTokenId: collection.contractCollectionId,
      quantity, 
      newMinted,
      txHash,
      onChain: !!onChain,
      companyWallet: nftService.getCompanyWalletAddress(),
    },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({
    success: true,
    message: `Minted ${quantity} NFTs to company wallet`,
    data: {
      collectionId: id,
      contractTokenId: collection.contractCollectionId,
      quantity,
      totalMinted: newMinted,
      available: newMinted - (collection.sold || 0),
      txHash,
    },
  });
});

/**
 * Create NFT on-chain (calls createAndMint on contract)
 * This creates a new token type on the contract and mints initial supply
 * POST /api/admin/nft-collections/:id/create-onchain
 */
adminNftCollectionsRouter.post("/:id/create-onchain", requirePermission("nft.mint"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));
  const { initialSupply } = await c.req.json();

  // Get collection
  const [collection] = await db
    .select()
    .from(nftCollections)
    .where(eq(nftCollections.id, id))
    .limit(1);

  if (!collection) {
    return c.json({ error: "Collection not found" }, 404);
  }

  if (collection.contractCollectionId) {
    return c.json({ 
      error: `Already created on-chain. Contract token ID: ${collection.contractCollectionId}` 
    }, 400);
  }

  const mintAmount = initialSupply || collection.maxSupply;
  if (mintAmount > collection.maxSupply) {
    return c.json({ error: "Initial supply exceeds max supply" }, 400);
  }

  // Convert BCC price to wei (assuming 18 decimals)
  const priceInWei = BigInt(Math.floor(parseFloat(collection.bccPrice?.toString() || "0") * 1e18));

  console.log(`🎨 Creating NFT on-chain: ${collection.name}`);
  console.log(`   Symbol: ${collection.shortName}`);
  console.log(`   Amount: ${mintAmount}`);
  console.log(`   Price: ${priceInWei} TBCC (wei)`);

  const result = await nftService.createAndMint(
    collection.name,
    collection.shortName,
    mintAmount,
    priceInWei,
    collection.contractAddress || undefined
  );

  if (!result.success) {
    return c.json({ error: result.error || "On-chain creation failed" }, 500);
  }

  // Note: To get the actual tokenId from the contract, you'd need to decode the transaction logs
  // For now, we'll need to manually set it or query the contract
  // The contract uses an auto-incrementing counter starting from 1

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.create_nft_onchain",
    metadata: { 
      collectionId: id, 
      txHash: result.txHash,
      initialSupply: mintAmount,
      priceInWei: priceInWei.toString(),
    },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({
    success: true,
    message: `NFT created on-chain. Set the contract token ID manually after checking the transaction.`,
    data: {
      collectionId: id,
      txHash: result.txHash,
      initialSupply: mintAmount,
      note: "Please set contractCollectionId after verifying the transaction",
    },
  });
});

/**
 * Set contract token ID (after creating on-chain)
 * POST /api/admin/nft-collections/:id/set-contract-id
 */
adminNftCollectionsRouter.post("/:id/set-contract-id", requirePermission("nft.update"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));
  const { contractCollectionId, minted } = await c.req.json();

  if (!contractCollectionId || contractCollectionId <= 0) {
    return c.json({ error: "Valid contract collection ID required" }, 400);
  }

  // Get collection
  const [collection] = await db
    .select()
    .from(nftCollections)
    .where(eq(nftCollections.id, id))
    .limit(1);

  if (!collection) {
    return c.json({ error: "Collection not found" }, 404);
  }

  // Update with contract ID and optionally minted count
  const updateData: any = { contractCollectionId };
  if (minted !== undefined) {
    updateData.minted = minted;
  }

  await db.update(nftCollections).set(updateData).where(eq(nftCollections.id, id));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.set_nft_contract_id",
    metadata: { collectionId: id, contractCollectionId, minted },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({
    success: true,
    message: `Contract token ID set to ${contractCollectionId}`,
    data: { collectionId: id, contractCollectionId },
  });
});

/**
 * Sync collection data from on-chain contract
 * GET /api/admin/nft-collections/:id/sync
 */
adminNftCollectionsRouter.get("/:id/sync", requirePermission("nft.create"), async (c) => {
  const id = parseInt(c.req.param("id"));

  // Get collection
  const [collection] = await db
    .select()
    .from(nftCollections)
    .where(eq(nftCollections.id, id))
    .limit(1);

  if (!collection) {
    return c.json({ error: "Collection not found" }, 404);
  }

  if (!collection.contractCollectionId) {
    return c.json({ error: "Contract token ID not set" }, 400);
  }

  // Get data from contract
  const tokenInfo = await nftService.getTokenInfo(
    collection.contractCollectionId,
    collection.contractAddress || undefined
  );

  if (!tokenInfo || !tokenInfo.exists) {
    return c.json({ error: "Token not found on contract" }, 404);
  }

  const companyBalance = await nftService.getCompanyNFTBalance(
    collection.contractCollectionId,
    collection.contractAddress || undefined
  );

  return c.json({
    success: true,
    data: {
      db: {
        id: collection.id,
        name: collection.name,
        shortName: collection.shortName,
        bccPrice: collection.bccPrice,
        maxSupply: collection.maxSupply,
        minted: collection.minted,
        sold: collection.sold,
        contractCollectionId: collection.contractCollectionId,
      },
      onChain: {
        tokenId: collection.contractCollectionId,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        totalSupply: tokenInfo.totalSupply.toString(),
        price: tokenInfo.price.toString(),
        companyBalance,
      },
    },
  });
});

/**
 * Increase max supply (can only increase, not decrease)
 * POST /api/admin/nft-collections/:id/increase-supply
 */
adminNftCollectionsRouter.post("/:id/increase-supply", requirePermission("nft.update"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));
  const { additionalSupply } = await c.req.json();

  if (!additionalSupply || additionalSupply <= 0) {
    return c.json({ error: "Additional supply must be greater than 0" }, 400);
  }

  // Get collection
  const [collection] = await db
    .select()
    .from(nftCollections)
    .where(eq(nftCollections.id, id))
    .limit(1);

  if (!collection) {
    return c.json({ error: "Collection not found" }, 404);
  }

  const newMaxSupply = collection.maxSupply + additionalSupply;

  await db
    .update(nftCollections)
    .set({ maxSupply: newMaxSupply })
    .where(eq(nftCollections.id, id));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.increase_nft_supply",
    metadata: { 
      collectionId: id, 
      previousMaxSupply: collection.maxSupply,
      additionalSupply,
      newMaxSupply,
    },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({
    success: true,
    message: `Increased max supply by ${additionalSupply}`,
    data: {
      collectionId: id,
      previousMaxSupply: collection.maxSupply,
      newMaxSupply,
    },
  });
});

// Delete NFT collection
adminNftCollectionsRouter.delete("/:id", requirePermission("nft.delete"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));

  await db.delete(nftCollections).where(eq(nftCollections.id, id));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.delete_nft_collection",
    metadata: { collectionId: id },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

export default adminNftCollectionsRouter;

