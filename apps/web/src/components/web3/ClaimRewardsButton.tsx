"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useClaimRewards, useClaimUSDTRewards, useClaimBCCRewards, useRewardInfo } from "@/hooks/useContracts";
import { formatNumber } from "@/lib/utils";
import { Gift, Loader2, Check, AlertCircle } from "lucide-react";

interface ClaimRewardsButtonProps {
  type?: "all" | "usdt" | "bcc";
  onSuccess?: () => void;
  className?: string;
}

export function ClaimRewardsButton({
  type = "all",
  onSuccess,
  className,
}: ClaimRewardsButtonProps) {
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  
  const { data: rewardInfo, isLoading: isLoadingInfo, refetch } = useRewardInfo();
  
  const {
    claim: claimAll,
    isPending: isPendingAll,
    isConfirming: isConfirmingAll,
    isSuccess: isSuccessAll,
    error: errorAll,
  } = useClaimRewards();
  
  const {
    claim: claimUSDT,
    isPending: isPendingUSDT,
    isConfirming: isConfirmingUSDT,
    isSuccess: isSuccessUSDT,
    error: errorUSDT,
  } = useClaimUSDTRewards();
  
  const {
    claim: claimBCC,
    isPending: isPendingBCC,
    isConfirming: isConfirmingBCC,
    isSuccess: isSuccessBCC,
    error: errorBCC,
  } = useClaimBCCRewards();

  // Determine which hook to use based on type
  const isPending = type === "all" ? isPendingAll : type === "usdt" ? isPendingUSDT : isPendingBCC;
  const isConfirming = type === "all" ? isConfirmingAll : type === "usdt" ? isConfirmingUSDT : isConfirmingBCC;
  const isSuccess = type === "all" ? isSuccessAll : type === "usdt" ? isSuccessUSDT : isSuccessBCC;
  const error = type === "all" ? errorAll : type === "usdt" ? errorUSDT : errorBCC;
  const claim = type === "all" ? claimAll : type === "usdt" ? claimUSDT : claimBCC;

  // Update status based on transaction state
  useEffect(() => {
    if (isPending || isConfirming) {
      setStatus("pending");
    } else if (isSuccess) {
      setStatus("success");
      refetch();
      onSuccess?.();
      // Reset after 3 seconds
      setTimeout(() => setStatus("idle"), 3000);
    } else if (error) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [isPending, isConfirming, isSuccess, error]);

  // Determine if button should be disabled
  const hasPendingRewards = rewardInfo
    ? type === "usdt"
      ? parseFloat(rewardInfo.pendingUSDT) > 0
      : type === "bcc"
      ? parseFloat(rewardInfo.pendingBCC) > 0
      : parseFloat(rewardInfo.pendingUSDT) > 0 || parseFloat(rewardInfo.pendingBCC) > 0
    : false;

  const handleClaim = async () => {
    try {
      await claim();
    } catch (err) {
      console.error("Claim failed:", err);
    }
  };

  // Button content based on status
  const renderContent = () => {
    if (status === "pending") {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Claiming...
        </>
      );
    }

    if (status === "success") {
      return (
        <>
          <Check className="w-4 h-4" />
          Claimed!
        </>
      );
    }

    if (status === "error") {
      return (
        <>
          <AlertCircle className="w-4 h-4" />
          Failed
        </>
      );
    }

    // Idle state
    if (type === "usdt" && rewardInfo) {
      return (
        <>
          <Gift className="w-4 h-4" />
          Claim ${formatNumber(rewardInfo.pendingUSDT)} USDT
        </>
      );
    }

    if (type === "bcc" && rewardInfo) {
      return (
        <>
          <Gift className="w-4 h-4" />
          Claim {formatNumber(rewardInfo.pendingBCC, 0)} BCC
        </>
      );
    }

    return (
      <>
        <Gift className="w-4 h-4" />
        Claim Rewards
      </>
    );
  };

  return (
    <Button
      onClick={handleClaim}
      disabled={!hasPendingRewards || status === "pending" || isLoadingInfo}
      className={className}
      variant={status === "success" ? "secondary" : "primary"}
    >
      {renderContent()}
    </Button>
  );
}



