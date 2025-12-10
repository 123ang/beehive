"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import {
  usePurchaseMembership,
  useUSDTBalance,
  useUSDTAllowance,
} from "@/hooks/useContracts";
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
  const { address } = useAccount();
  const [step, setStep] = useState<Step>("preview");
  const [error, setError] = useState<string | null>(null);

  const { balance } = useUSDTBalance();
  const { allowance, refetchAllowance } = useUSDTAllowance();
  const {
    purchaseWithApproval,
    isApproving,
    isApproveConfirming,
    isApproveSuccess,
    isPurchasing,
    isPurchaseConfirming,
    isPurchaseSuccess,
    hash,
  } = usePurchaseMembership();

  const levelInfo = MEMBERSHIP_LEVELS.find((l) => l.level === level);
  const hasEnoughBalance = levelInfo
    ? parseFloat(balance) >= levelInfo.priceUSDT
    : false;
  const hasEnoughAllowance = levelInfo
    ? parseFloat(allowance) >= levelInfo.priceUSDT
    : false;

  // Handle approval success
  useEffect(() => {
    if (isApproveSuccess && step === "approving") {
      refetchAllowance();
      setStep("purchase");
    }
  }, [isApproveSuccess, step]);

  // Handle purchase success
  useEffect(() => {
    if (isPurchaseSuccess && step === "purchasing") {
      setStep("success");
      onSuccess?.();
    }
  }, [isPurchaseSuccess, step]);

  // Handle loading states
  useEffect(() => {
    if (isApproving || isApproveConfirming) {
      setStep("approving");
    }
    if (isPurchasing || isPurchaseConfirming) {
      setStep("purchasing");
    }
  }, [isApproving, isApproveConfirming, isPurchasing, isPurchaseConfirming]);

  const handlePurchase = async () => {
    if (!levelInfo) return;

    setError(null);

    try {
      if (!hasEnoughAllowance) {
        setStep("approve");
        const result = await purchaseWithApproval(level, referrer);
        if (result.step === "approval") {
          setStep("approving");
        }
      } else {
        setStep("purchasing");
        await purchaseWithApproval(level, referrer);
      }
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
        {!hasEnoughBalance && step === "preview" && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Insufficient Balance</p>
              <p className="text-gray-400 text-sm">
                You need ${formatNumber(levelInfo.priceUSDT, 0)} USDT. Current
                balance: ${formatNumber(balance)}
              </p>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        {step !== "preview" && step !== "error" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {/* Step 1: Approve */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === "approving"
                      ? "bg-honey-500 text-black"
                      : hasEnoughAllowance || step === "purchase" || step === "purchasing" || step === "success"
                      ? "bg-green-500 text-black"
                      : "bg-white/10 text-gray-500"
                  }`}
                >
                  {step === "approving" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : hasEnoughAllowance || step === "purchase" || step === "purchasing" || step === "success" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    "1"
                  )}
                </div>
                <span
                  className={
                    step === "approving"
                      ? "text-honey-400"
                      : hasEnoughAllowance
                      ? "text-green-400"
                      : "text-gray-500"
                  }
                >
                  Approve
                </span>
              </div>

              <ArrowRight className="w-4 h-4 text-gray-500" />

              {/* Step 2: Purchase */}
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
                    "2"
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
                  Purchase
                </span>
              </div>
            </div>

            {/* Status Message */}
            <div className="text-center py-4">
              {step === "approving" && (
                <p className="text-gray-400">
                  Waiting for approval transaction...
                </p>
              )}
              {step === "purchase" && (
                <p className="text-gray-400">
                  Approval confirmed! Ready to purchase.
                </p>
              )}
              {step === "purchasing" && (
                <p className="text-gray-400">
                  Waiting for purchase transaction...
                </p>
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
                href={`https://arbiscan.io/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-honey-400 text-sm hover:underline"
              >
                View Transaction
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
                disabled={!hasEnoughBalance}
              >
                <Wallet className="w-4 h-4" />
                {hasEnoughAllowance ? "Purchase" : "Approve & Purchase"}
              </Button>
            </>
          )}

          {step === "purchase" && (
            <Button onClick={handlePurchase} className="w-full">
              <Wallet className="w-4 h-4" />
              Confirm Purchase
            </Button>
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



