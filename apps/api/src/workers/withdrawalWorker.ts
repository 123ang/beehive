// ============================================
// WITHDRAWAL WORKER
// Processes withdrawal requests from queue
// Never trusts client input - reads only from database
// ============================================

import { Worker, Job } from "bullmq";
import { redis } from "../lib/redis";
import { db, withdrawals, members, rewards, transactions } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { rewardService } from "../services/RewardService";
import { createPublicClient, createWalletClient, http, formatUnits, parseUnits } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { withdrawalQueue, WithdrawalJobData } from "../queues/withdrawalQueue";

// ERC20 ABI
const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

// Helper functions
function getEnvVar(key: string, defaultValue: string = ""): string {
  return process.env[key] || defaultValue;
}

function getChain() {
  const chainId = parseInt(getEnvVar("BSC_CHAIN_ID", "56"));
  return chainId === 97 ? bscTestnet : bsc;
}

// Get private key (from KMS or .env)
async function getPrivateKey(): Promise<string> {
  if (getEnvVar("USE_GOOGLE_KMS") === "true") {
    const { kmsService } = await import("../services/KMSService");
    return await kmsService.getPrivateKey();
  } else {
    const key = getEnvVar("COMPANY_PRIVATE_KEY");
    if (!key) {
      throw new Error("COMPANY_PRIVATE_KEY not set and USE_GOOGLE_KMS is false");
    }
    return key.startsWith("0x") ? key : `0x${key}`;
  }
}

// Create worker
export const withdrawalWorker = new Worker<WithdrawalJobData>(
  "withdrawals",
  async (job: Job<WithdrawalJobData>) => {
    const { withdrawalId, userId, memberId, walletAddress, currency, amount } = job.data;
    const normalizedWallet = walletAddress.toLowerCase();

    console.log(`\n🔵 Processing withdrawal ${withdrawalId} for ${normalizedWallet}: ${amount} ${currency}`);

    try {
      // Step 1: Lock withdrawal row and verify status
      const [withdrawal] = await db
        .select()
        .from(withdrawals)
        .where(eq(withdrawals.id, withdrawalId))
        .limit(1);

      if (!withdrawal) {
        throw new Error(`Withdrawal ${withdrawalId} not found`);
      }

      if (withdrawal.status !== "requested") {
        throw new Error(`Withdrawal ${withdrawalId} is not in 'requested' status (current: ${withdrawal.status})`);
      }

      // Step 2: Update status to processing
      await db
        .update(withdrawals)
        .set({
          status: "processing",
          processedAt: new Date(),
        })
        .where(eq(withdrawals.id, withdrawalId));

      // Step 3: Re-check available balance (from database, not client input)
      let currentBalance: number;
      let member;

      if (memberId) {
        [member] = await db
          .select()
          .from(members)
          .where(eq(members.id, memberId))
          .limit(1);
      } else {
        [member] = await db
          .select()
          .from(members)
          .where(eq(members.walletAddress, normalizedWallet))
          .limit(1);
      }

      if (!member) {
        throw new Error("Member not found");
      }

      if (currency === "BCC") {
        currentBalance = parseFloat(member.bccBalance?.toString() || "0");
      } else {
        // For USDT, calculate from rewards (pending only)
        const rewardSummary = await rewardService.getRewardSummary(normalizedWallet);
        currentBalance = parseFloat(rewardSummary.pendingUSDT || "0");
      }

      if (currentBalance < amount) {
        throw new Error(
          `Insufficient ${currency} balance. Available: ${currentBalance}, Requested: ${amount}`
        );
      }

      // Step 4: Get contract addresses
      const RPC_URL = getEnvVar("BSC_RPC_URL", "https://bsc-dataseed1.binance.org/");
      const chain = getChain();
      const publicClient = createPublicClient({
        chain,
        transport: http(RPC_URL),
      });

      let contractAddress: string;
      let decimals: number;

      if (currency === "USDT") {
        contractAddress = getEnvVar("USDT_CONTRACT_ADDRESS", "0x23D744B43aEe545DaBeC0D2081bD381Ab80C7d85");
        let usdtDecimals = parseInt(getEnvVar("USDT_DECIMALS", "0"));
        if (usdtDecimals === 0) {
          const decimalsResult = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "decimals",
          });
          decimals = Number(decimalsResult);
        } else {
          decimals = usdtDecimals;
        }
      } else {
        contractAddress = getEnvVar("BCC_TOKEN_CONTRACT_ADDRESS", "0xe1d791FE419ee701FbC55dd1AA4107bcd5AB7FC8");
        let bccDecimals = parseInt(getEnvVar("BCC_DECIMALS", "0"));
        if (bccDecimals === 0) {
          const decimalsResult = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "decimals",
          });
          decimals = Number(decimalsResult);
        } else {
          decimals = bccDecimals;
        }
      }

      // Step 5: Get private key and create wallet client
      const privateKey = await getPrivateKey();
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(RPC_URL),
      });

      // Step 6: Build and send transaction
      const amountWei = parseUnits(amount.toString(), decimals);

      console.log(`   Building ${currency} transfer: ${amount} ${currency} to ${normalizedWallet}`);

      const hash = await walletClient.writeContract({
        account,
        chain,
        address: contractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [normalizedWallet as `0x${string}`, amountWei],
      });

      console.log(`   Transaction broadcasted: ${hash}`);

      // Step 7: Update withdrawal with tx hash
      await db
        .update(withdrawals)
        .set({
          status: "broadcast",
          onchainTxHash: hash,
        })
        .where(eq(withdrawals.id, withdrawalId));

      // Step 8: Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        // Step 9: Get block information for blockNumber and confirmedAt
        const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
        const blockTimestamp = new Date(Number(block.timestamp) * 1000); // Convert Unix timestamp to Date

        // Step 10: Update balances
        if (currency === "BCC") {
          const newBalance = (currentBalance - amount).toString();
          await db
            .update(members)
            .set({ bccBalance: newBalance })
            .where(eq(members.id, member.id));
        } else {
          // Mark pending USDT rewards as claimed
          const pendingRewards = await db
            .select()
            .from(rewards)
            .where(
              and(
                eq(rewards.recipientWallet, normalizedWallet),
                eq(rewards.currency, "USDT"),
                eq(rewards.status, "pending")
              )
            )
            .orderBy(desc(rewards.createdAt));

          let remainingAmount = amount;
          for (const reward of pendingRewards) {
            if (remainingAmount <= 0) break;
            const rewardAmount = parseFloat(reward.amount || "0");
            if (rewardAmount <= remainingAmount) {
              await db
                .update(rewards)
                .set({ status: "instant" }) // Mark as claimed
                .where(eq(rewards.id, reward.id));
              remainingAmount -= rewardAmount;
            }
          }
        }

        // Step 11: Create transaction record with blockNumber and confirmedAt
        await db.insert(transactions).values({
          walletAddress: normalizedWallet,
          txHash: hash,
          transactionType: "withdrawal",
          currency,
          amount: amount.toString(),
          status: "confirmed",
          blockNumber: Number(receipt.blockNumber),
          confirmedAt: blockTimestamp,
          notes: `Withdrawal of ${amount} ${currency} to ${normalizedWallet}`,
        });

        // Step 11: Mark withdrawal as completed
        await db
          .update(withdrawals)
          .set({
            status: "completed",
            completedAt: new Date(),
          })
          .where(eq(withdrawals.id, withdrawalId));

        console.log(`✅ Withdrawal ${withdrawalId} completed successfully. TX: ${hash}`);

        return { success: true, txHash: hash };
      } else {
        throw new Error("Transaction failed on blockchain");
      }
    } catch (error: any) {
      console.error(`❌ Withdrawal ${withdrawalId} failed:`, error);

      // Update withdrawal status to failed
      await db
        .update(withdrawals)
        .set({
          status: "failed",
          errorMessage: error.message || "Unknown error",
        })
        .where(eq(withdrawals.id, withdrawalId));

      throw error;
    }
  },
  {
    connection: {
      host: redis.options.host || "localhost",
      port: redis.options.port || 6379,
      ...(redis.options.password && { password: redis.options.password }),
    },
    concurrency: 1, // Process one withdrawal at a time for safety
  }
);

// Worker event handlers
withdrawalWorker.on("completed", (job) => {
  console.log(`✅ Withdrawal job ${job.id} completed`);
});

withdrawalWorker.on("failed", (job, err) => {
  console.error(`❌ Withdrawal job ${job?.id} failed:`, err);
});

// Start worker
console.log("🟢 Withdrawal worker started");

