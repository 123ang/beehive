// ============================================
// TRANSACTION VERIFICATION UTILITY
// Verifies blockchain transactions to prevent replay attacks and fraud
// ============================================

import { db, transactions } from "../db";
import { eq } from "drizzle-orm";
import { createPublicClient, http, formatUnits, decodeEventLog } from "viem";
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
    const normalizedExpectedTo = expectedTo.toLowerCase();
    const normalizedTxFrom = tx.from.toLowerCase();

    if (normalizedTxFrom !== normalizedExpectedFrom) {
      return {
        valid: false,
        error: `Transaction sender mismatch. Expected: ${expectedFrom}, Got: ${tx.from}`,
      };
    }

    // 5. For USDT transfers, the transaction recipient (tx.to) is the USDT contract address
    // The actual recipient (company wallet) is verified in the Transfer event logs below
    // So we don't check tx.to against expectedTo - we only verify the Transfer event
    if (!tx.to) {
      return {
        valid: false,
        error: "Transaction has no recipient (contract creation transaction)",
      };
    }

    // Note: We don't check tx.to here because for USDT transfers, tx.to is the USDT contract
    // The actual recipient (company wallet) is verified in the Transfer event logs below

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
    const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_USDT_CONTRACT || "0x23D744B43aEe545DaBeC0D2081bD381Ab80C7d85";
    
    console.log(`\n🔍 ============================================`);
    console.log(`🔍 TRANSACTION VERIFICATION: USDT CHECK`);
    console.log(`🔍 ============================================`);
    console.log(`🔍 USDT Contract Address: ${USDT_CONTRACT}`);
    console.log(`🔍 From .env (USDT_CONTRACT_ADDRESS): ${process.env.USDT_CONTRACT_ADDRESS || "Not set"}`);
    console.log(`🔍 From .env (NEXT_PUBLIC_USDT_CONTRACT): ${process.env.NEXT_PUBLIC_USDT_CONTRACT || "Not set"}`);
    console.log(`🔍 Using: ${USDT_CONTRACT}`);
    
    if (!USDT_CONTRACT || USDT_CONTRACT === "0x0000000000000000000000000000000000000000") {
      console.warn("⚠️ USDT_CONTRACT_ADDRESS not set or invalid, skipping amount verification");
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
      console.log(`🔍 Analyzing ${receipt.logs.length} transaction logs...`);
      console.log(`🔍 Looking for logs from USDT contract: ${USDT_CONTRACT}`);
      
      // Log all unique contract addresses in the logs for debugging
      const uniqueAddresses = [...new Set(receipt.logs.map(log => log.address.toLowerCase()))];
      console.log(`🔍 Found ${uniqueAddresses.length} unique contract addresses in logs:`);
      uniqueAddresses.forEach((addr, idx) => {
        const matches = addr === USDT_CONTRACT.toLowerCase() ? " ✅ MATCHES USDT" : "";
        console.log(`🔍   ${idx + 1}. ${addr}${matches}`);
      });
      
      const transferLogs = receipt.logs.filter((log) => {
        try {
          const matches = log.address.toLowerCase() === USDT_CONTRACT.toLowerCase();
          if (matches) {
            console.log(`✅ Found USDT log from contract: ${log.address}`);
          }
          return matches;
        } catch {
          return false;
        }
      });

      console.log(`🔍 Transaction verification: Found ${transferLogs.length} USDT transfer logs out of ${receipt.logs.length} total logs`);
      console.log(`🔍 USDT Contract: ${USDT_CONTRACT}`);
      console.log(`🔍 Expected from: ${normalizedExpectedFrom}`);
      console.log(`🔍 Expected to: ${normalizedExpectedTo}`);

      if (transferLogs.length > 0) {
        // Decode Transfer event from logs
        let foundTransfer = false;
        let actualAmount = BigInt(0);
        const allTransfers: Array<{ from: string; to: string; amount: string }> = [];

        for (const log of transferLogs) {
          try {
            const decoded = decodeEventLog({
              abi: ERC20_TRANSFER_ABI,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === "Transfer") {
              const fromAddress = (decoded.args as any).from?.toLowerCase();
              const toAddress = (decoded.args as any).to?.toLowerCase();
              const value = (decoded.args as any).value as bigint;
              const amountFormatted = parseFloat(formatUnits(value, usdtDecimals));

              allTransfers.push({
                from: fromAddress,
                to: toAddress,
                amount: amountFormatted.toString(),
              });

              console.log(`🔍 Found Transfer: ${fromAddress} → ${toAddress}, Amount: ${amountFormatted} USDT`);

              // Verify: transfer is from expected sender AND to expected recipient (company wallet)
              if (
                fromAddress === normalizedExpectedFrom &&
                toAddress === normalizedExpectedTo
              ) {
                actualAmount = value;
                foundTransfer = true;
                console.log(`✅ Matching transfer found!`);
                break;
              }
            }
          } catch (error: any) {
            console.warn(`⚠️ Failed to decode log:`, error.message);
            // Continue to next log
          }
        }

        if (!foundTransfer && allTransfers.length > 0) {
          console.error(`❌ No matching transfer found. All transfers:`, JSON.stringify(allTransfers, null, 2));
          return {
            valid: false,
            error: `Could not find matching USDT transfer. Found transfers: ${allTransfers.map(t => `${t.from} → ${t.to} (${t.amount} USDT)`).join(", ")}. Expected: ${normalizedExpectedFrom} → ${normalizedExpectedTo}`,
          };
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
        // No transfer logs found - log all receipt logs for debugging
        console.error(`❌ No USDT transfer logs found. All receipt logs:`, receipt.logs.map(log => ({
          address: log.address,
          topics: log.topics,
        })));
        return {
          valid: false,
          error: `No USDT transfer found in transaction. This may not be a payment transaction. USDT Contract: ${USDT_CONTRACT}`,
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
 * Verifies USDT transfer to company wallet
 */
export async function verifyRegistrationTransaction(
  txHash: string,
  expectedFrom: string,
  expectedAmount: number
): Promise<TransactionVerificationResult> {
  // Get company wallet address (where USDT should be sent)
  const COMPANY_ACCOUNT = process.env.COMPANY_ACCOUNT_ADDRESS || "0x325d4a6f26babf3fb54a838a2fe6a79cf3087cf7";

  return verifyTransaction(txHash, expectedFrom, COMPANY_ACCOUNT, expectedAmount);
}

/**
 * Verify transaction for upgrade (Level 2+ purchase)
 * Verifies USDT transfer to company wallet
 */
export async function verifyUpgradeTransaction(
  txHash: string,
  expectedFrom: string,
  expectedAmount: number
): Promise<TransactionVerificationResult> {
  // Get company wallet address (where USDT should be sent)
  const COMPANY_ACCOUNT = process.env.COMPANY_ACCOUNT_ADDRESS || "0x325d4a6f26babf3fb54a838a2fe6a79cf3087cf7";

  return verifyTransaction(txHash, expectedFrom, COMPANY_ACCOUNT, expectedAmount);
}

