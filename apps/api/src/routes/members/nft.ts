import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../../db";
import { nftCollections, members, userNfts, transactions } from "../../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { nftService } from "../../services/NFTService";
import { standardRateLimit } from "../../middleware/rateLimit";

const memberNftRouter = new Hono();

/**
 * Get active NFT collections for purchase
 * GET /api/members/nft
 * 
 * Returns collections with on-chain data if available
 */
memberNftRouter.get("/", async (c) => {
  try {
    const collections = await db
      .select()
      .from(nftCollections)
      .where(eq(nftCollections.active, true))
      .orderBy(desc(nftCollections.createdAt));

    // Enrich with on-chain data if contract is set
    const enrichedCollections = await Promise.all(
      collections.map(async (col) => {
        let onChainData = null;
        
        if (col.contractCollectionId) {
          try {
            const companyBalance = await nftService.getCompanyNFTBalance(
              col.contractCollectionId,
              col.contractAddress || undefined
            );
            const price = await nftService.getPriceOf(
              col.contractCollectionId,
              col.contractAddress || undefined
            );
            
            onChainData = {
              tokenId: col.contractCollectionId,
              availableOnChain: companyBalance,
              priceOnChain: price?.toString(),
            };
          } catch (e) {
            console.error(`Error getting on-chain data for collection ${col.id}:`, e);
          }
        }

        return {
          ...col,
          available: (col.minted || 0) - (col.sold || 0),
          onChain: onChainData,
        };
      })
    );

    return c.json({
      success: true,
      data: enrichedCollections,
    });
  } catch (error) {
    console.error("Get NFT collections error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get single NFT collection details
 * GET /api/members/nft/:id
 */
memberNftRouter.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const [collection] = await db
      .select()
      .from(nftCollections)
      .where(eq(nftCollections.id, id))
      .limit(1);

    if (!collection) {
      return c.json({ error: "NFT collection not found" }, 404);
    }

    // Get on-chain data if available
    let onChainData = null;
    if (collection.contractCollectionId) {
      try {
        const tokenInfo = await nftService.getTokenInfo(
          collection.contractCollectionId,
          collection.contractAddress || undefined
        );
        const companyBalance = await nftService.getCompanyNFTBalance(
          collection.contractCollectionId,
          collection.contractAddress || undefined
        );

        if (tokenInfo) {
          onChainData = {
            tokenId: collection.contractCollectionId,
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            totalSupply: tokenInfo.totalSupply.toString(),
            price: tokenInfo.price.toString(),
            availableOnChain: companyBalance,
          };
        }
      } catch (e) {
        console.error("Error getting on-chain data:", e);
      }
    }

    return c.json({
      success: true,
      data: {
        ...collection,
        available: (collection.minted || 0) - (collection.sold || 0),
        onChain: onChainData,
      },
    });
  } catch (error) {
    console.error("Get NFT collection error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get user's owned NFTs (from database)
 * GET /api/members/nft/owned?address=0x...
 */
memberNftRouter.get("/owned", async (c) => {
  try {
    const walletAddress = c.req.query("address");
    
    if (!walletAddress) {
      return c.json({ error: "Wallet address required" }, 400);
    }

    const address = walletAddress.toLowerCase();

    // Get user's NFTs with collection details (from DB records)
    const ownedNfts = await db
      .select({
        id: userNfts.id,
        collectionId: userNfts.collectionId,
        tokenId: userNfts.tokenId,
        purchasePrice: userNfts.purchasePrice,
        purchaseTxHash: userNfts.purchaseTxHash,
        mintTxHash: userNfts.mintTxHash,
        status: userNfts.status,
        purchasedAt: userNfts.purchasedAt,
        completedAt: userNfts.completedAt,
        collectionName: nftCollections.name,
        collectionShortName: nftCollections.shortName,
        collectionImageUrl: nftCollections.imageUrl,
        collectionDescription: nftCollections.description,
        contractCollectionId: nftCollections.contractCollectionId,
        contractAddress: nftCollections.contractAddress,
      })
      .from(userNfts)
      .innerJoin(nftCollections, eq(userNfts.collectionId, nftCollections.id))
      .where(eq(userNfts.walletAddress, address))
      .orderBy(desc(userNfts.purchasedAt));

    return c.json({
      success: true,
      data: ownedNfts,
    });
  } catch (error) {
    console.error("Get owned NFTs error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get user's on-chain NFT balance for a collection
 * GET /api/members/nft/:id/balance?address=0x...
 */
memberNftRouter.get("/:id/balance", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const walletAddress = c.req.query("address");
    
    if (!walletAddress) {
      return c.json({ error: "Wallet address required" }, 400);
    }

    const [collection] = await db
      .select()
      .from(nftCollections)
      .where(eq(nftCollections.id, id))
      .limit(1);

    if (!collection) {
      return c.json({ error: "Collection not found" }, 404);
    }

    if (!collection.contractCollectionId) {
      return c.json({ error: "Collection not on-chain" }, 400);
    }

    const balance = await nftService.getUserNFTBalance(
      walletAddress,
      collection.contractCollectionId,
      collection.contractAddress || undefined
    );

    return c.json({
      success: true,
      data: {
        collectionId: id,
        contractTokenId: collection.contractCollectionId,
        walletAddress,
        balance,
      },
    });
  } catch (error) {
    console.error("Get NFT balance error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Record NFT purchase (called after user completes on-chain buyNFT)
 * This is for tracking purposes - the actual purchase happens on-chain
 * 
 * POST /api/members/nft/record-purchase
 * 
 * Flow on frontend:
 * 1. User approves TBCC spending to NFT contract
 * 2. User calls buyNFT(tokenId, amount) on NFT contract
 * 3. Frontend calls this endpoint to record the purchase in DB
 */
const recordPurchaseSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  collectionId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

memberNftRouter.post(
  "/record-purchase",
  standardRateLimit,
  zValidator("json", recordPurchaseSchema),
  async (c) => {
    try {
      const { walletAddress, collectionId, quantity, txHash } = c.req.valid("json");
      const normalizedWallet = walletAddress.toLowerCase();

      // Get collection
      const [collection] = await db
        .select()
        .from(nftCollections)
        .where(eq(nftCollections.id, collectionId))
        .limit(1);

      if (!collection) {
        return c.json({ error: "NFT collection not found" }, 404);
      }

      // Check if this tx is already recorded
      const [existingPurchase] = await db
        .select()
        .from(userNfts)
        .where(eq(userNfts.purchaseTxHash, txHash))
        .limit(1);

      if (existingPurchase) {
        return c.json({ 
          error: "Purchase already recorded",
          data: existingPurchase,
        }, 400);
      }

      const pricePerNft = parseFloat(collection.bccPrice?.toString() || "0");
      const totalPrice = pricePerNft * quantity;
      const currentSold = collection.sold || 0;

      // Record the purchase
      for (let i = 0; i < quantity; i++) {
        await db.insert(userNfts).values({
          walletAddress: normalizedWallet,
          collectionId: collection.id,
          tokenId: collection.contractCollectionId || 0, // Use contract token ID
          purchasePrice: pricePerNft.toString(),
          purchaseTxHash: txHash,
          status: "completed",
          completedAt: new Date(),
        });
      }

      // Update sold count
      await db
        .update(nftCollections)
        .set({ sold: currentSold + quantity })
        .where(eq(nftCollections.id, collection.id));

      // Record transaction
      await db.insert(transactions).values({
        walletAddress: normalizedWallet,
        txHash: txHash,
        transactionType: "purchase",
        currency: "TBCC",
        amount: totalPrice.toString(),
        status: "confirmed",
        notes: `Purchased ${quantity}x ${collection.name} NFT(s) on-chain`,
      });

      // Get member to pass memberId
      const member = await db.query.members.findFirst({
        where: eq(members.walletAddress, normalizedWallet),
        columns: { id: true },
      });

      if (!member) {
        console.warn(`⚠️ Member not found for wallet ${normalizedWallet} when recording NFT purchase`);
      }

      // Log member activity
      const { logMemberActivity } = await import("../../utils/memberActivityLogger");
      await logMemberActivity({
        walletAddress: normalizedWallet,
        memberId: member?.id, // Pass memberId if found (will fallback to lookup if undefined)
        activityType: "purchase_nft",
        metadata: {
          collectionId: collection.id,
          collectionName: collection.name,
          contractTokenId: collection.contractCollectionId,
          quantity,
          totalPrice,
          txHash,
        },
      });

      return c.json({
        success: true,
        data: {
          message: `Recorded purchase of ${quantity}x ${collection.name} NFT(s)`,
          collectionId: collection.id,
          txHash,
          quantity,
        },
      });
    } catch (error: any) {
      console.error("Record NFT purchase error:", error);
      return c.json({
        error: error.message || "Failed to record purchase",
      }, 500);
    }
  }
);

/**
 * Get contract info for frontend to call buyNFT
 * GET /api/members/nft/:id/contract-info
 */
memberNftRouter.get("/:id/contract-info", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const [collection] = await db
      .select()
      .from(nftCollections)
      .where(eq(nftCollections.id, id))
      .limit(1);

    if (!collection) {
      return c.json({ error: "Collection not found" }, 404);
    }

    if (!collection.contractCollectionId) {
      return c.json({ error: "Collection not available on-chain yet" }, 400);
    }

    // Get TBCC address from contract
    const tbccAddress = await nftService.getTBCCAddress(collection.contractAddress || undefined);
    const nftContractAddress = collection.contractAddress || nftService.getNFTContractAddress();

    // Get price from contract
    const priceOnChain = await nftService.getPriceOf(
      collection.contractCollectionId,
      collection.contractAddress || undefined
    );

    return c.json({
      success: true,
      data: {
        collectionId: id,
        contractTokenId: collection.contractCollectionId,
        nftContractAddress,
        tbccAddress,
        pricePerNft: priceOnChain?.toString() || "0",
        // Instructions for frontend
        instructions: {
          step1: `Approve TBCC spending: TBCC.approve(${nftContractAddress}, amount)`,
          step2: `Call buyNFT: NFT.buyNFT(${collection.contractCollectionId}, quantity)`,
          step3: `Record purchase: POST /api/members/nft/record-purchase`,
        },
      },
    });
  } catch (error) {
    console.error("Get contract info error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default memberNftRouter;

