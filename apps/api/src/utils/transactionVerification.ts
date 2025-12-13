// ============================================
// TRANSACTION VERIFICATION UTILITY
// Verifies blockchain transactions to prevent replay attacks and fraud
// ============================================

import { db, transactions } from "../db";
import { eq } from "drizzle-orm";
import { createPublicClient, http, formatUnits } from "viem";
import { bsc, bscTestnet } from "viem/chains";

// ERC20 Transfer event ABI
const ERC20_TRANSFER_ABI = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

// Helper to get public client
function getPublicClient() {
  const chainId = parseInt(process.env.BSC_CHAIN_ID || "56");
  const chain = chainId === 97 ? bscTestnet : bsc;
  const RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org/";
  
  return createPublicClient({
    chain,
    transport: http(RPC_URL),
  });
}

export interface TransactionVerificationResult {
  valid: boolean;
  error?: string;
  transaction?: {
    from: string;
    to: string;
    amount: string;
    blockNumber: bigint;
    status: "success" | "failed";
  };
}

/**
 * Verify a transaction hash for membership purchase/upgrade
 * 
 * @param txHash - Transaction hash to verify
 * @param expectedFrom - Expected sender wallet address
 * @param expectedTo - Expected recipient contract address (membership contract)
 * @param expectedAmount - Expected amount in USDT (as number, will be compared with decimals)
 * @returns Verification result
 */
export async function verifyTransaction(
  txHash: string,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: number
): Promise<TransactionVerificationResult> {
  try {
    // 1. Check if transaction hash already used (prevent replay attack)
    const existingTx = await db.query.transactions.findFirst({
      where: eq(transactions.txHash, txHash),
    });

    if (existingTx) {
      return {
        valid: false,
        error: "Transaction hash has already been used. This transaction was already processed.",
      };
    }

    // 2. Get public client for blockchain queries
    const publicClient = getPublicClient();

    // 3. Verify transaction exists on blockchain
    let tx;
    try {
      tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
    } catch (error: any) {
      if (error.message?.includes("not found") || error.message?.includes("Unknown")) {
        return {
          valid: false,
          error: "Transaction not found on blockchain. Please ensure the transaction hash is correct and the transaction has been confirmed.",
        };
      }
      throw error;
    }

    // 4. Verify transaction sender matches expected wallet
    const normalizedExpectedFrom = expectedFrom.toLowerCase();
    const normalizedTxFrom = tx.from.toLowerCase();

    if (normalizedTxFrom !== normalizedExpectedFrom) {
      return {
        valid: false,
        error: `Transaction sender mismatch. Expected: ${expectedFrom}, Got: ${tx.from}`,
      };
    }

    // 5. Verify transaction recipient matches expected contract
    if (!tx.to) {
      return {
        valid: false,
        error: "Transaction has no recipient (contract creation transaction)",
      };
    }

    const normalizedExpectedTo = expectedTo.toLowerCase();
    const normalizedTxTo = tx.to.toLowerCase();

    if (normalizedTxTo !== normalizedExpectedTo) {
      return {
        valid: false,
        error: `Transaction recipient mismatch. Expected: ${expectedTo}, Got: ${tx.to}`,
      };
    }

    // 6. Get transaction receipt to check status
    let receipt;
    try {
      receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    } catch (error: any) {
      return {
        valid: false,
        error: "Transaction receipt not found. Transaction may still be pending.",
      };
    }

    // 7. Verify transaction status is successful
    if (receipt.status !== "success") {
      return {
        valid: false,
        error: "Transaction failed on blockchain",
      };
    }

    // 8. For ERC20 transfers, verify the amount
    // Get USDT contract address
    const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_USDT_CONTRACT;
    if (!USDT_CONTRACT) {
      console.warn("USDT_CONTRACT_ADDRESS not set, skipping amount verification");
    } else {
      // Get USDT decimals
      let usdtDecimals = 6; // Default
      try {
        const decimals = await publicClient.readContract({
          address: USDT_CONTRACT as `0x${string}`,
          abi: [
            {
              name: "decimals",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [{ type: "uint8" }],
            },
          ],
          functionName: "decimals",
        });
        usdtDecimals = Number(decimals);
      } catch {
        // Use default
      }

      // Parse logs to find Transfer event
      const transferLogs = receipt.logs.filter((log) => {
        try {
          return log.address.toLowerCase() === USDT_CONTRACT.toLowerCase();
        } catch {
          return false;
        }
      });

      if (transferLogs.length > 0) {
        // Decode Transfer event from logs
        let foundTransfer = false;
        let actualAmount = BigInt(0);

        for (const log of transferLogs) {
          try {
            const decoded = publicClient.decodeEventLog({
              abi: ERC20_TRANSFER_ABI,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === "Transfer") {
              // Check if transfer is from expected sender
              // The 'to' in Transfer event should be the membership contract (expectedTo)
              // or the membership contract might have received it via another contract
              const fromAddress = (decoded.args as any).from?.toLowerCase();
              const toAddress = (decoded.args as any).to?.toLowerCase();

              // Verify: transfer is from expected sender AND to expected recipient (membership contract)
              if (
                fromAddress === normalizedExpectedFrom &&
                toAddress === normalizedExpectedTo
              ) {
                actualAmount = (decoded.args as any).value as bigint;
                foundTransfer = true;
                break;
              }
            }
          } catch {
            // Continue to next log
          }
        }

        if (foundTransfer) {
          // Convert to human-readable amount
          const actualAmountFormatted = parseFloat(formatUnits(actualAmount, usdtDecimals));
          const expectedAmountFormatted = expectedAmount;

          // Allow small difference due to rounding (0.01 USDT tolerance)
          const difference = Math.abs(actualAmountFormatted - expectedAmountFormatted);
          if (difference > 0.01) {
            return {
              valid: false,
              error: `Transaction amount mismatch. Expected: ${expectedAmountFormatted} USDT, Got: ${actualAmountFormatted} USDT`,
            };
          }
        } else {
          // Transfer event not found in logs
          return {
            valid: false,
            error: "Could not find USDT transfer event in transaction logs. Transaction may not be a valid payment.",
          };
        }
      } else {
        // No transfer logs found
        return {
          valid: false,
          error: "No USDT transfer found in transaction. This may not be a payment transaction.",
        };
      }
    }

    // 9. All checks passed
    return {
      valid: true,
      transaction: {
        from: tx.from,
        to: tx.to!,
        amount: expectedAmount.toString(),
        blockNumber: receipt.blockNumber,
        status: receipt.status,
      },
    };
  } catch (error: any) {
    console.error("Transaction verification error:", error);
    return {
      valid: false,
      error: error.message || "Failed to verify transaction",
    };
  }
}

/**
 * Verify transaction for registration (Level 1 purchase)
 * Similar to verifyTransaction but may have different contract/amount logic
 */
export async function verifyRegistrationTransaction(
  txHash: string,
  expectedFrom: string,
  expectedAmount: number
): Promise<TransactionVerificationResult> {
  // Get membership contract address
  const MEMBERSHIP_CONTRACT = 
    process.env.MEMBERSHIP_CONTRACT_ADDRESS || 
    process.env.NEXT_PUBLIC_MEMBERSHIP_CONTRACT;

  if (!MEMBERSHIP_CONTRACT) {
    return {
      valid: false,
      error: "Membership contract address not configured",
    };
  }

  return verifyTransaction(txHash, expectedFrom, MEMBERSHIP_CONTRACT, expectedAmount);
}

/**
 * Verify transaction for upgrade (Level 2+ purchase)
 */
export async function verifyUpgradeTransaction(
  txHash: string,
  expectedFrom: string,
  expectedAmount: number
): Promise<TransactionVerificationResult> {
  // Get membership contract address
  const MEMBERSHIP_CONTRACT = 
    process.env.MEMBERSHIP_CONTRACT_ADDRESS || 
    process.env.NEXT_PUBLIC_MEMBERSHIP_CONTRACT;

  if (!MEMBERSHIP_CONTRACT) {
    return {
      valid: false,
      error: "Membership contract address not configured",
    };
  }

  return verifyTransaction(txHash, expectedFrom, MEMBERSHIP_CONTRACT, expectedAmount);
}

