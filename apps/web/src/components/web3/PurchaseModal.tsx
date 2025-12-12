"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import {
  usePurchaseMembership,
  useUSDTBalance,
  useUSDTAllowance,
  useBNBBalance,
} from "@/hooks/useContracts";
import { CONTRACTS } from "@/lib/contracts";
import { MEMBERSHIP_LEVELS } from "@beehive/shared";
import { formatNumber, getLevelColor, shortenAddress } from "@/lib/utils";
import {
  Check,
  AlertCircle,
  Loader2,
  Crown,
  Wallet,
  ArrowRight,
} from "lucide-react";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: number;
  referrer: string;
  onSuccess?: () => void;
}

type Step = "preview" | "approve" | "approving" | "purchase" | "purchasing" | "success" | "error";

export function PurchaseModal({
  isOpen,
  onClose,
  level,
  referrer,
  onSuccess,
}: PurchaseModalProps) {
  const router = useRouter();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const [step, setStep] = useState<Step>("preview");
  const [error, setError] = useState<string | null>(null);

  const { balance, isLoading: isBalanceLoading, error: balanceError, refetch: refetchBalance } = useUSDTBalance();
  const { balance: bnbBalance, isLoading: isBnbLoading } = useBNBBalance();
  const {
    purchaseWithApproval,
    isApproving,
    isApproveConfirming,
    isApproveSuccess,
    isPurchasing,
    isPurchaseConfirming,
    isPurchaseSuccess,
    hash,
    error: purchaseError,
    refetchAllowance,
  } = usePurchaseMembership();

  const levelInfo = MEMBERSHIP_LEVELS.find((l) => l.level === level);
  const hasEnoughBalance = levelInfo
    ? parseFloat(balance) >= levelInfo.priceUSDT
    : false;
  
  // Check if user has enough BNB for gas (minimum 0.001 BNB recommended)
  const hasEnoughBNB = parseFloat(bnbBalance) >= 0.001;

  // Track if transaction was submitted but stuck
  const [transactionTimeout, setTransactionTimeout] = useState(false);
  
  useEffect(() => {
    if (step === "purchasing" && !hash && !isPurchasing) {
      // If we're in purchasing state but no hash after 10 seconds, might be stuck
      const timeout = setTimeout(() => {
        if (!hash && !isPurchasing && step === "purchasing") {
          setTransactionTimeout(true);
        }
      }, 10000); // 10 seconds
      
      return () => clearTimeout(timeout);
    } else {
      setTransactionTimeout(false);
    }
  }, [step, hash, isPurchasing]);

  // Refetch balance when modal opens
  useEffect(() => {
    if (isOpen && address) {
      refetchBalance();
    }
  }, [isOpen, address, refetchBalance]);

  // Handle purchase success
  useEffect(() => {
    if (isPurchaseSuccess && step === "purchasing") {
      setStep("success");
      onSuccess?.();
      
      // Redirect to dashboard after 2 seconds
      const redirectTimer = setTimeout(() => {
        router.push("/user/dashboard");
      }, 2000);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isPurchaseSuccess, step, onSuccess, router]);

  // Handle purchase error
  useEffect(() => {
    if (purchaseError && step !== "error") {
      // purchaseError is already a string or null from the hook
      setError(purchaseError);
      setStep("error");
    }
  }, [purchaseError, step]);

  // Handle loading states
  useEffect(() => {
    if (isPurchasing || isPurchaseConfirming) {
      setStep("purchasing");
    }
  }, [isPurchasing, isPurchaseConfirming]);

  const handlePurchase = async () => {
    if (!levelInfo) return;

    // Check balance first
    if (!hasEnoughBalance) {
      setError(`Insufficient TUSDT balance. You need ${levelInfo.priceUSDT} USDT but only have ${parseFloat(balance).toFixed(2)} USDT.`);
      setStep("error");
      return;
    }

    setError(null);
    setStep("purchasing");

    try {
      await purchaseWithApproval(level, referrer);
    } catch (err: any) {
      console.error("Purchase failed:", err);
      setError(err.message || "Transaction failed");
      setStep("error");
    }
  };

  const handleClose = () => {
    if (step !== "approving" && step !== "purchasing") {
      setStep("preview");
      setError(null);
      onClose();
    }
  };

  if (!levelInfo) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Purchase Membership" size="md">
      <div className="space-y-6">
        {/* Level Info */}
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
          <div
            className="w-14 h-14 hexagon flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: getLevelColor(level) }}
          >
            {level}
          </div>
          <div>
            <h3 className="text-white font-semibold">Level {level}</h3>
            <p className="text-gray-400 text-sm">{levelInfo.name}</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-white font-bold">
              ${formatNumber(levelInfo.priceUSDT, 0)} USDT
            </div>
            <div className="text-honey-400 text-sm">
              +{levelInfo.bccReward} BCC
            </div>
          </div>
        </div>

        {/* Referrer Info */}
        <div className="p-4 bg-white/5 rounded-xl">
          <div className="text-gray-400 text-sm mb-1">Referrer</div>
          <div className="text-white font-mono text-sm">
            {shortenAddress(referrer)}
          </div>
        </div>

        {/* Balance Check */}
        {step === "preview" && (
          <div className={`flex items-start gap-3 p-4 rounded-xl ${
            isBalanceLoading 
              ? "bg-blue-500/10 border border-blue-500/30" 
              : !hasEnoughBalance 
              ? "bg-red-500/10 border border-red-500/30" 
              : "bg-green-500/10 border border-green-500/30"
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              isBalanceLoading 
                ? "text-blue-400" 
                : !hasEnoughBalance 
                ? "text-red-400" 
                : "text-green-400"
            }`} />
            <div className="flex-1">
              {chainId !== 56 && chainId !== 97 ? (
                <>
                  <p className="text-yellow-400 font-medium">Wrong Network</p>
                  <p className="text-gray-400 text-sm">
                    Please switch to BSC (Binance Smart Chain) to view your balance.
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Current Chain ID: {chainId}
                  </p>
                  <Button
                    onClick={() => {
                      try {
                        switchChain({ chainId: 56 }); // BSC Mainnet
                      } catch (err) {
                        console.error("Failed to switch chain:", err);
                        setError("Failed to switch network. Please switch manually in MetaMask.");
                      }
                    }}
                    disabled={isSwitchingChain}
                    className="mt-3 w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    {isSwitchingChain ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Switching...
                      </>
                    ) : (
                      "Switch to BSC Mainnet"
                    )}
                  </Button>
                </>
              ) : isBalanceLoading ? (
                <>
                  <p className="text-blue-400 font-medium">Loading Balance...</p>
                  <p className="text-gray-400 text-sm">
                    Checking your TUSDT balance...
                  </p>
                </>
              ) : !hasEnoughBalance ? (
                <>
                  <p className="text-red-400 font-medium">Insufficient USDT Balance</p>
                  <p className="text-gray-400 text-sm">
                    You need ${formatNumber(levelInfo.priceUSDT, 0)} USDT. Current
                    balance: ${formatNumber(balance)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Contract: {CONTRACTS.USDT?.slice(0, 10)}...{CONTRACTS.USDT?.slice(-8)}
                  </p>
                  {balanceError && (
                    <p className="text-red-400 text-xs mt-1">
                      Error: {balanceError instanceof Error 
                        ? balanceError.message 
                        : typeof balanceError === 'string' 
                        ? balanceError 
                        : "Failed to read balance"}
                    </p>
                  )}
                </>
              ) : !hasEnoughBNB ? (
                <>
                  <p className="text-red-400 font-medium">Insufficient BNB for Gas</p>
                  <p className="text-gray-400 text-sm">
                    You need BNB to pay transaction fees. Current BNB: {parseFloat(bnbBalance).toFixed(4)}
                  </p>
                  <p className="text-yellow-400 text-xs mt-2">
                    ⚠️ This is why MetaMask's "Review" button may be disabled.
                    Please add at least 0.001 BNB to your wallet.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-green-400 font-medium">Ready to Purchase</p>
                  <p className="text-gray-400 text-sm">
                    USDT: ${formatNumber(balance)} | BNB: {parseFloat(bnbBalance).toFixed(4)} (for gas)
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Progress Steps */}
        {step !== "preview" && step !== "error" && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              {/* Purchase Step */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === "purchasing"
                      ? "bg-honey-500 text-black"
                      : step === "success"
                      ? "bg-green-500 text-black"
                      : "bg-white/10 text-gray-500"
                  }`}
                >
                  {step === "purchasing" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : step === "success" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    "1"
                  )}
                </div>
                <span
                  className={
                    step === "purchasing"
                      ? "text-honey-400"
                      : step === "success"
                      ? "text-green-400"
                      : "text-gray-500"
                  }
                >
                  {step === "purchasing" ? "Processing..." : step === "success" ? "Completed" : "Purchase"}
                </span>
              </div>
            </div>

            {/* Status Message */}
            <div className="text-center py-4">
              {step === "purchasing" && (
                <>
                  <p className="text-gray-400 mb-2">
                    Waiting for transaction confirmation...
                  </p>
                  {level === 1 && (
                    <p className="text-gray-500 text-sm">
                      Processing 2 transactions: Company (100 USDT) + IT (30 USDT)
                    </p>
                  )}
                  {level > 1 && (
                    <p className="text-gray-500 text-sm">
                      Processing transaction to company account ({levelInfo?.priceUSDT} USDT)
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    This usually takes 3-10 seconds on BSC...
                  </p>
                  <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-2">
                    <p className="text-blue-400 text-xs font-semibold">
                      🦊 MetaMask Instructions:
                    </p>
                    <ol className="text-blue-300 text-xs list-decimal list-inside space-y-1">
                      <li>If popup closed, <strong>click the MetaMask extension icon</strong> (fox icon in browser toolbar)</li>
                      <li>Click <strong>"Review alert"</strong> if you see it</li>
                      <li>Scroll down and click <strong>"Confirm"</strong></li>
                    </ol>
                    <p className="text-blue-400 text-xs">
                      ⚠️ The popup may close quickly. Always check the MetaMask icon for pending transactions.
                    </p>
                  </div>
                  {hash && (
                    <a
                      href={`https://${chainId === 97 ? "testnet." : ""}bscscan.com/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-honey-400 text-xs hover:underline mt-2 block"
                    >
                      View Transaction on BSCScan
                    </a>
                  )}
                  {transactionTimeout && !hash && (
                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-400 text-xs mb-2">
                        ⚠️ Transaction seems stuck. The MetaMask popup may have closed too quickly.
                      </p>
                      <p className="text-yellow-300 text-xs mb-2">
                        <strong>Please:</strong>
                      </p>
                      <ol className="text-yellow-300 text-xs list-decimal list-inside space-y-1 mb-2">
                        <li>Check the MetaMask extension icon (top right) for a notification badge</li>
                        <li>Click the MetaMask icon to open it</li>
                        <li>Look for a pending transaction or "Review alert"</li>
                        <li>Confirm the transaction in MetaMask</li>
                      </ol>
                      <button
                        onClick={() => {
                          setStep("preview");
                          setError(null);
                          window.location.reload(); // Reload to reset state
                        }}
                        className="mt-2 text-yellow-400 text-xs underline hover:text-yellow-300"
                      >
                        Cancel and try again
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Success State */}
        {step === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Welcome to Level {level}!
            </h3>
            <p className="text-gray-400 mb-4">
              You are now a {levelInfo.name} member.
            </p>
            {hash && (
              <a
                href={
                  chainId === 97 || chainId === 56
                    ? `https://${chainId === 97 ? "testnet." : ""}bscscan.com/tx/${hash}`
                    : `https://arbiscan.io/tx/${hash}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-honey-400 text-sm hover:underline"
              >
                View Transaction {chainId === 97 || chainId === 56 ? "on BSCScan" : "on Arbiscan"}
              </a>
            )}
          </motion.div>
        )}

        {/* Error State */}
        {step === "error" && error && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Transaction Failed</p>
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {step === "preview" && (
            <>
              <Button variant="secondary" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handlePurchase}
                className="flex-1"
                disabled={!hasEnoughBalance || !hasEnoughBNB}
              >
                <Wallet className="w-4 h-4" />
                Purchase
              </Button>
            </>
          )}

          {(step === "success" || step === "error") && (
            <Button onClick={handleClose} className="w-full">
              {step === "success" ? "Done" : "Close"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}



