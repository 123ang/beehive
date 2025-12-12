"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { CONTRACTS, MEMBERSHIP_ABI, REWARDS_ABI, ERC20_ABI, NFT_MARKETPLACE_ABI } from "@/lib/contracts";
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
  const chainId = useChainId();

  // BSC Mainnet = 56, BSC Testnet = 97
  const isBSC = chainId === 56 || chainId === 97;

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.USDT as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!CONTRACTS.USDT && CONTRACTS.USDT !== "0x0000000000000000000000000000000000000000" && isBSC,
      retry: 3,
      retryDelay: 1000,
    },
  });

  // Debug logging
  useEffect(() => {
    console.log("=== USDT Balance Debug ===");
    console.log("Chain ID:", chainId);
    console.log("Is BSC:", isBSC);
    console.log("Contract Address:", CONTRACTS.USDT);
    console.log("Wallet Address:", address);
    console.log("Query Enabled:", !!address && !!CONTRACTS.USDT && CONTRACTS.USDT !== "0x0000000000000000000000000000000000000000" && isBSC);
    
    if (error) {
      console.error("USDT Balance Error:", error);
    }
    if (data !== undefined) {
      console.log("USDT Balance Raw:", data);
      console.log("USDT Balance Formatted:", data ? formatUnits(data as bigint, 6) : "0");
    }
    console.log("=========================");
  }, [error, data, chainId, address, isBSC]);

  return {
    balance: data ? formatUnits(data as bigint, 6) : "0",
    balanceRaw: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get native BNB balance (for gas fees)
 */
export function useBNBBalance() {
  const { address } = useAccount();
  const chainId = useChainId();

  // BSC Mainnet = 56, BSC Testnet = 97
  const isBSC = chainId === 56 || chainId === 97;

  const { data, isLoading, error, refetch } = useBalance({
    address: address,
    query: {
      enabled: !!address && isBSC,
    },
  });

  // Debug logging
  useEffect(() => {
    if (data) {
      console.log("=== BNB Balance Debug ===");
      console.log("BNB Balance:", data.formatted, data.symbol);
      console.log("=========================");
    }
  }, [data]);

  return {
    balance: data?.formatted || "0",
    balanceRaw: data?.value,
    symbol: data?.symbol || "BNB",
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get BCC balance
 */
export function useBCCBalance() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.BCC_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && CONTRACTS.BCC_TOKEN !== "0x0000000000000000000000000000000000000000",
    },
  });

  return {
    balance: data ? formatUnits(data as bigint, 18) : "0",
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
 * Hook to transfer USDT directly
 * Uses writeContractAsync for proper promise handling
 */
export function useTransferUSDT() {
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  
  // Manual state management for the hash since writeContractAsync returns it directly
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [txError, setTxError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash: txHash || hash,
    query: {
      enabled: !!(txHash || hash), // Only wait if we have a hash
      retry: 3, // Retry up to 3 times
      retryDelay: 2000, // Wait 2 seconds between retries
    },
  });

  const transfer = async (to: string, amount: string): Promise<`0x${string}` | undefined> => {
    const amountWei = parseUnits(amount, 6);
    
    // Reset previous state
    setTxHash(undefined);
    setTxError(null);
    setIsSubmitting(true);
    reset?.(); // Reset any previous errors
    
    try {
      console.log("Initiating USDT transfer...", { to, amount, amountWei: amountWei.toString() });
      
      // Use writeContractAsync which returns a promise with the hash
      // Add explicit gas settings to help MetaMask
      const resultHash = await writeContractAsync({
        address: CONTRACTS.USDT as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to as `0x${string}`, amountWei],
        gas: BigInt(100000), // Explicit gas limit for ERC20 transfer
      });
      
      console.log("Transfer submitted, hash:", resultHash);
      setTxHash(resultHash);
      setIsSubmitting(false);
      return resultHash;
    } catch (err: any) {
      console.error("Transfer error:", err);
      
      // Provide more specific error messages
      const errorMsg = err.message || String(err);
      if (errorMsg.includes("insufficient funds") || errorMsg.includes("gas")) {
        setTxError(new Error("Insufficient BNB for gas fees. Please add BNB to your wallet."));
      } else if (errorMsg.includes("user rejected") || errorMsg.includes("User rejected")) {
        setTxError(new Error("Transaction was rejected. Please try again."));
      } else if (errorMsg.includes("execution reverted")) {
        setTxError(new Error("Transaction would fail. Please check your USDT balance."));
      } else {
        setTxError(err);
      }
      
      setIsSubmitting(false);
      throw err;
    }
  };

  return {
    transfer,
    hash: txHash || hash,
    isPending: isPending || isSubmitting,
    isConfirming,
    isSuccess,
    wasRejected: false, // Not needed anymore with async
    error: error || receiptError || txError,
  };
}

/**
 * Combined hook for purchasing with direct TUSDT transfer
 * Since membership contract is disabled, we transfer TUSDT directly to company/IT accounts
 * For Level 1: 100 USDT to company, 30 USDT to IT
 * For Upgrades: 100% to company
 */
export function usePurchaseMembership() {
  const { address } = useAccount();
  const { balance, balanceRaw, refetch: refetchBalance } = useUSDTBalance();
  const { transfer, hash, isPending: isTransferring, isConfirming: isTransferConfirming, isSuccess: isTransferSuccess, error: transferError } = useTransferUSDT();
  
  // State for tracking purchase
  const [purchaseState, setPurchaseState] = useState<{
    level: number | null;
    referrer: string | null;
    companyHash: string | null;
    itHash: string | null;
    companyConfirmed: boolean;
    itConfirmed: boolean;
  }>({
    level: null,
    referrer: null,
    companyHash: null,
    itHash: null,
    companyConfirmed: false,
    itConfirmed: false,
  });
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isPurchaseInProgress, setIsPurchaseInProgress] = useState(false);

  // Separate hooks for IT transfer (Level 1 only)
  const { 
    transfer: transferIT, 
    hash: itHash, 
    isPending: isITTransferring, 
    isConfirming: isITConfirming, 
    isSuccess: isITTransferSuccess, 
    error: itTransferError,
  } = useTransferUSDT();

  const purchaseWithApproval = async (level: number, referrer: string) => {
    const levelInfo = MEMBERSHIP_LEVELS.find((l) => l.level === level);
    if (!levelInfo) throw new Error("Invalid level");

    // Check balance
    if (!balanceRaw || parseFloat(balance) < levelInfo.priceUSDT) {
      throw new Error(`Insufficient TUSDT balance. You need ${levelInfo.priceUSDT} USDT but only have ${parseFloat(balance).toFixed(2)} USDT.`);
    }

    const isLevel1 = level === 1;
    const companyAmount = isLevel1 ? 100 : levelInfo.priceUSDT;

    // Reset state
    setPurchaseState({
      level,
      referrer,
      companyHash: null,
      itHash: null,
      companyConfirmed: false,
      itConfirmed: false,
    });
    setRegistrationError(null);
    setIsPurchaseInProgress(true);

    try {
      console.log("Starting purchase flow...", { level, companyAmount, to: CONTRACTS.COMPANY_ACCOUNT });
      
      // Transfer to company account - this now properly awaits and returns the hash
      const companyTxHash = await transfer(CONTRACTS.COMPANY_ACCOUNT, companyAmount.toString());
      
      if (!companyTxHash) {
        throw new Error("No transaction hash received. Transaction may have been rejected.");
      }
      
      console.log("Company transfer submitted:", companyTxHash);
      setPurchaseState(prev => ({ ...prev, companyHash: companyTxHash }));
      
      // For Level 1, we need to also transfer to IT account
      // This will be handled in useEffect after company transfer is confirmed
      
      return { step: "purchase", hash: companyTxHash, message: "Transaction submitted, waiting for confirmation..." };
    } catch (err: any) {
      console.error("Purchase error:", err);
      setIsPurchaseInProgress(false);
      
      // Provide user-friendly error messages
      if (err.message?.includes("User rejected") || err.message?.includes("user rejected")) {
        throw new Error("Transaction was rejected in MetaMask. Please try again.");
      }
      if (err.message?.includes("insufficient funds")) {
        throw new Error("Insufficient funds for gas. Please add BNB to your wallet.");
      }
      
      throw new Error(err.message || "Transaction failed. Please try again.");
    }
  };

  // Track company transfer hash from hook (backup)
  useEffect(() => {
    if (hash && purchaseState.level && !purchaseState.companyHash) {
      console.log("Company transfer hash received from hook:", hash);
      setPurchaseState(prev => ({ ...prev, companyHash: hash }));
    }
  }, [hash, purchaseState.level, purchaseState.companyHash]);

  // Track transfer errors
  useEffect(() => {
    if (transferError && purchaseState.level && !purchaseState.companyHash) {
      console.error("Transfer error:", transferError);
      const errorMsg = transferError instanceof Error ? transferError.message : String(transferError);
      setRegistrationError(`Transaction error: ${errorMsg}. Please try again.`);
      setIsPurchaseInProgress(false);
    }
  }, [transferError, purchaseState.level, purchaseState.companyHash]);

  // Track IT transfer hash
  useEffect(() => {
    if (itHash && purchaseState.level === 1) {
      setPurchaseState(prev => ({ ...prev, itHash: itHash }));
    }
  }, [itHash, purchaseState.level]);

  // Track company transfer confirmation and trigger IT transfer for Level 1
  useEffect(() => {
    if (isTransferSuccess && purchaseState.level && hash && !purchaseState.companyConfirmed) {
      console.log("Company transfer confirmed:", hash);
      setPurchaseState(prev => ({ ...prev, companyConfirmed: true }));
      
      // For Level 1, transfer to IT account after company transfer is confirmed
      if (purchaseState.level === 1) {
        console.log("Level 1 detected, initiating IT transfer...");
        const transferITAfterCompany = async () => {
          try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
            console.log("Transferring 30 USDT to IT account...");
            await transferIT(CONTRACTS.IT_ACCOUNT, "30");
          } catch (err) {
            console.error("Failed to transfer to IT account:", err);
          }
        };
        transferITAfterCompany();
      }
    }
  }, [isTransferSuccess, purchaseState.level, purchaseState.companyConfirmed, hash, transferIT]);

  // Track IT transfer confirmation
  useEffect(() => {
    if (isITTransferSuccess && purchaseState.level === 1 && !purchaseState.itConfirmed) {
      setPurchaseState(prev => ({ ...prev, itConfirmed: true }));
    }
  }, [isITTransferSuccess, purchaseState.level, purchaseState.itConfirmed]);

  // Register with backend after both transfers are confirmed
  useEffect(() => {
    const registerAfterPurchase = async () => {
      if (!purchaseState.level || !address || isRegistering) return;

      const isLevel1 = purchaseState.level === 1;
      const bothTransfersConfirmed = isLevel1 
        ? purchaseState.companyConfirmed && purchaseState.itConfirmed
        : purchaseState.companyConfirmed;

      if (bothTransfersConfirmed && purchaseState.companyHash) {
        console.log("All transfers confirmed, registering with backend...", {
          level: purchaseState.level,
          companyHash: purchaseState.companyHash,
          itHash: purchaseState.itHash,
        });
        
        setIsRegistering(true);
        setRegistrationError(null);
        
        try {
          const { api } = await import("@/lib/api");
          
          // Register with backend using company transfer hash
          console.log("Calling api.registerMember...");
          const result = await api.registerMember(
            purchaseState.companyHash,
            purchaseState.level,
            purchaseState.referrer || "0x0000000000000000000000000000000000000000"
          );

          if (!result.success) {
            throw new Error(result.error || "Registration failed");
          }

          console.log("Registration successful!");
          // Refetch balance after successful registration
          refetchBalance();
        } catch (err: any) {
          console.error("Failed to register after purchase:", err);
          setRegistrationError(err.message || "Registration failed");
        } finally {
          setIsRegistering(false);
        }
      }
    };
    
    registerAfterPurchase();
  }, [
    purchaseState.companyConfirmed, 
    purchaseState.itConfirmed, 
    purchaseState.level, 
    purchaseState.companyHash,
    purchaseState.referrer,
    address, 
    isRegistering,
    refetchBalance
  ]);

  // Determine overall purchase state
  const isLevel1 = purchaseState.level === 1;
  const allTransfersPending = isLevel1 
    ? (isTransferring || isITTransferring)
    : isTransferring;
  const allTransfersConfirming = isLevel1
    ? (isTransferConfirming || isITConfirming)
    : isTransferConfirming;
  const allTransfersSuccess = isLevel1
    ? (purchaseState.companyConfirmed && purchaseState.itConfirmed)
    : purchaseState.companyConfirmed;

  // Combine errors and convert to string if needed
  const combinedError = transferError || itTransferError || registrationError;
  const errorMessage = combinedError 
    ? (combinedError instanceof Error 
        ? combinedError.message 
        : typeof combinedError === 'string' 
        ? combinedError 
        : String(combinedError))
    : null;

  // Debug logging
  useEffect(() => {
    if (purchaseState.level) {
      console.log("Purchase State:", {
        level: purchaseState.level,
        isLevel1,
        companyHash: purchaseState.companyHash,
        itHash: purchaseState.itHash,
        companyConfirmed: purchaseState.companyConfirmed,
        itConfirmed: purchaseState.itConfirmed,
        isTransferring,
        isITTransferring,
        isTransferConfirming,
        isITConfirming,
        isTransferSuccess,
        isITTransferSuccess,
        isRegistering,
        allTransfersSuccess,
      });
    }
  }, [
    purchaseState,
    isLevel1,
    isTransferring,
    isITTransferring,
    isTransferConfirming,
    isITConfirming,
    isTransferSuccess,
    isITTransferSuccess,
    isRegistering,
    allTransfersSuccess,
  ]);

  // Reset isPurchaseInProgress when purchase completes or errors
  useEffect(() => {
    if (allTransfersSuccess && !isRegistering) {
      setIsPurchaseInProgress(false);
    }
  }, [allTransfersSuccess, isRegistering]);

  return {
    purchaseWithApproval,
    isApproving: false,
    isApproveConfirming: false,
    isApproveSuccess: false,
    isPurchasing: isPurchaseInProgress || allTransfersPending || isRegistering,
    isPurchaseConfirming: allTransfersConfirming || isRegistering,
    isPurchaseSuccess: allTransfersSuccess && !isRegistering && !registrationError,
    hash: purchaseState.companyHash || hash, // Use company hash for display
    refetchAllowance: refetchBalance,
    error: errorMessage,
  };
}

// ============================================
// NFT HOOKS
// ============================================

/**
 * Hook to get NFT token info from contract
 */
export function useNFTTokenInfo(tokenId: number | null) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.NFT_MARKETPLACE as `0x${string}`,
    abi: NFT_MARKETPLACE_ABI,
    functionName: "tokenInfo",
    args: tokenId !== null ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: tokenId !== null && CONTRACTS.NFT_MARKETPLACE !== "0x0000000000000000000000000000000000000000",
    },
  });

  return {
    tokenInfo: data
      ? {
          name: data[0] as string,
          symbol: data[1] as string,
          totalSupply: Number(data[2] as bigint),
          price: data[3] as bigint,
          exists: data[4] as boolean,
        }
      : null,
    isLoading,
    refetch,
  };
}

/**
 * Hook to get user's NFT balance
 */
export function useNFTBalance(tokenId: number | null) {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.NFT_MARKETPLACE as `0x${string}`,
    abi: NFT_MARKETPLACE_ABI,
    functionName: "balanceOf",
    args: address && tokenId !== null ? [address, BigInt(tokenId)] : undefined,
    query: {
      enabled: !!address && tokenId !== null && CONTRACTS.NFT_MARKETPLACE !== "0x0000000000000000000000000000000000000000",
    },
  });

  return {
    balance: data ? Number(data as bigint) : 0,
    isLoading,
    refetch,
  };
}

/**
 * Hook to get TBCC token address from NFT contract
 */
export function useNFTTBCCAddress() {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.NFT_MARKETPLACE as `0x${string}`,
    abi: NFT_MARKETPLACE_ABI,
    functionName: "TBCC",
    query: {
      enabled: CONTRACTS.NFT_MARKETPLACE !== "0x0000000000000000000000000000000000000000",
    },
  });

  return {
    tbccAddress: data as string | undefined,
    isLoading,
    refetch,
  };
}

/**
 * Hook to buy NFT (requires TBCC approval first)
 */
export function useBuyNFT() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const buyNFT = async (tokenId: number, amount: number) => {
    writeContract({
      address: CONTRACTS.NFT_MARKETPLACE as `0x${string}`,
      abi: NFT_MARKETPLACE_ABI,
      functionName: "buyNFT",
      args: [BigInt(tokenId), BigInt(amount)],
    });
  };

  return {
    buyNFT,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to sell back NFT
 */
export function useSellBackNFT() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const sellBackNFT = async (tokenId: number, amount: number) => {
    writeContract({
      address: CONTRACTS.NFT_MARKETPLACE as `0x${string}`,
      abi: NFT_MARKETPLACE_ABI,
      functionName: "sellBackNFT",
      args: [BigInt(tokenId), BigInt(amount)],
    });
  };

  return {
    sellBackNFT,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to get TBCC allowance for NFT marketplace
 */
export function useNFTAllowance() {
  const { address } = useAccount();
  const { tbccAddress } = useNFTTBCCAddress();

  const { data, isLoading, refetch } = useReadContract({
    address: (tbccAddress || CONTRACTS.USDT) as `0x${string}`, // Use TBCC address if available, fallback to USDT
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && CONTRACTS.NFT_MARKETPLACE !== "0x0000000000000000000000000000000000000000" 
      ? [address, CONTRACTS.NFT_MARKETPLACE as `0x${string}`] 
      : undefined,
    query: {
      enabled: !!address && !!tbccAddress && CONTRACTS.NFT_MARKETPLACE !== "0x0000000000000000000000000000000000000000",
    },
  });

  return {
    allowance: data ? formatUnits(data as bigint, 6) : "0", // Assuming 6 decimals
    allowanceRaw: data as bigint | undefined,
    isLoading,
    refetch,
  };
}

/**
 * Hook to approve TBCC for NFT marketplace
 */
export function useApproveTBCCForNFT() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const { tbccAddress } = useNFTTBCCAddress();

  const approve = async (amount: string) => {
    const amountWei = parseUnits(amount, 6); // Assuming 6 decimals for TBCC
    
    writeContract({
      address: (tbccAddress || CONTRACTS.USDT) as `0x${string}`, // Use TBCC address if available, fallback to USDT
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.NFT_MARKETPLACE as `0x${string}`, amountWei],
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



