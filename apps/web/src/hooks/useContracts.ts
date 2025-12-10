"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { CONTRACTS, MEMBERSHIP_ABI, REWARDS_ABI, ERC20_ABI } from "@/lib/contracts";
import { MEMBERSHIP_LEVELS } from "@beehive/shared";

// ============================================
// READ HOOKS
// ============================================

/**
 * Hook to get current member level from contract
 */
export function useMemberLevel() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.MEMBERSHIP as `0x${string}`,
    abi: MEMBERSHIP_ABI,
    functionName: "memberLevel",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && CONTRACTS.MEMBERSHIP !== "0x0000000000000000000000000000000000000000",
    },
  });

  return {
    level: data ? Number(data) : 0,
    isLoading,
    refetch,
  };
}

/**
 * Hook to get member info from contract
 */
export function useMemberInfo() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.MEMBERSHIP as `0x${string}`,
    abi: MEMBERSHIP_ABI,
    functionName: "getMemberInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && CONTRACTS.MEMBERSHIP !== "0x0000000000000000000000000000000000000000",
    },
  });

  return {
    data: data
      ? {
          level: Number(data[0]),
          referrer: data[1] as string,
          ownedTokens: (data[2] as bigint[]).map((n) => Number(n)),
        }
      : null,
    isLoading,
    refetch,
  };
}

/**
 * Hook to get reward info from contract
 */
export function useRewardInfo() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.REWARDS as `0x${string}`,
    abi: REWARDS_ABI,
    functionName: "getRewardInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && CONTRACTS.REWARDS !== "0x0000000000000000000000000000000000000000",
    },
  });

  return {
    data: data
      ? {
          pendingUSDT: formatUnits(data[0] as bigint, 6),
          pendingBCC: formatUnits(data[1] as bigint, 18),
          claimedUSDT: formatUnits(data[2] as bigint, 6),
          claimedBCC: formatUnits(data[3] as bigint, 18),
        }
      : null,
    isLoading,
    refetch,
  };
}

/**
 * Hook to get USDT balance
 */
export function useUSDTBalance() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.USDT as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    balance: data ? formatUnits(data as bigint, 6) : "0",
    balanceRaw: data as bigint | undefined,
    isLoading,
    refetch,
  };
}

/**
 * Hook to get USDT allowance for membership contract
 */
export function useUSDTAllowance() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.USDT as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.MEMBERSHIP as `0x${string}`] : undefined,
    query: {
      enabled: !!address && CONTRACTS.MEMBERSHIP !== "0x0000000000000000000000000000000000000000",
    },
  });

  return {
    allowance: data ? formatUnits(data as bigint, 6) : "0",
    allowanceRaw: data as bigint | undefined,
    isLoading,
    refetch,
  };
}

// ============================================
// WRITE HOOKS
// ============================================

/**
 * Hook to approve USDT spending
 */
export function useApproveUSDT() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = async (amount: string) => {
    const amountWei = parseUnits(amount, 6);
    
    writeContract({
      address: CONTRACTS.USDT as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.MEMBERSHIP as `0x${string}`, amountWei],
    });
  };

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to purchase membership level
 */
export function usePurchaseLevel() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const purchase = async (level: number, referrer: string) => {
    writeContract({
      address: CONTRACTS.MEMBERSHIP as `0x${string}`,
      abi: MEMBERSHIP_ABI,
      functionName: "purchaseLevel",
      args: [BigInt(level), referrer as `0x${string}`],
    });
  };

  return {
    purchase,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to claim all rewards
 */
export function useClaimRewards() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const claim = async () => {
    writeContract({
      address: CONTRACTS.REWARDS as `0x${string}`,
      abi: REWARDS_ABI,
      functionName: "claimRewards",
      args: [],
    });
  };

  return {
    claim,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to claim USDT rewards only
 */
export function useClaimUSDTRewards() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const claim = async () => {
    writeContract({
      address: CONTRACTS.REWARDS as `0x${string}`,
      abi: REWARDS_ABI,
      functionName: "claimUSDTRewards",
      args: [],
    });
  };

  return {
    claim,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to claim BCC rewards only
 */
export function useClaimBCCRewards() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const claim = async () => {
    writeContract({
      address: CONTRACTS.REWARDS as `0x${string}`,
      abi: REWARDS_ABI,
      functionName: "claimBCCRewards",
      args: [],
    });
  };

  return {
    claim,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// ============================================
// COMBINED HOOKS
// ============================================

/**
 * Combined hook for purchasing with approval flow
 */
export function usePurchaseMembership() {
  const { address } = useAccount();
  const { allowanceRaw, refetch: refetchAllowance } = useUSDTAllowance();
  const { approve, isPending: isApproving, isConfirming: isApproveConfirming, isSuccess: isApproveSuccess } = useApproveUSDT();
  const { purchase, isPending: isPurchasing, isConfirming: isPurchaseConfirming, isSuccess: isPurchaseSuccess, hash } = usePurchaseLevel();

  const purchaseWithApproval = async (level: number, referrer: string) => {
    const levelInfo = MEMBERSHIP_LEVELS.find((l) => l.level === level);
    if (!levelInfo) throw new Error("Invalid level");

    const priceWei = parseUnits(levelInfo.priceUSDT.toString(), 6);

    // Check if we need to approve
    if (!allowanceRaw || allowanceRaw < priceWei) {
      // Approve max amount for convenience
      await approve("1000000"); // 1M USDT max approval
      // Wait for approval to be confirmed
      // In real implementation, you'd want to wait for the tx
      return { step: "approval", message: "Please confirm the approval transaction" };
    }

    // Purchase
    await purchase(level, referrer);
    return { step: "purchase", message: "Please confirm the purchase transaction" };
  };

  return {
    purchaseWithApproval,
    isApproving,
    isApproveConfirming,
    isApproveSuccess,
    isPurchasing,
    isPurchaseConfirming,
    isPurchaseSuccess,
    hash,
    refetchAllowance,
  };
}



