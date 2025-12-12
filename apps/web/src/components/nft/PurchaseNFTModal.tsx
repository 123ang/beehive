"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useBuyNFT, useNFTTokenInfo, useNFTTBCCAddress, useApproveTBCCForNFT, useNFTAllowance } from "@/hooks/useContracts";
import { useUSDTBalance } from "@/hooks/useContracts";
import { CONTRACTS } from "@/lib/contracts";
import { formatUnits, parseUnits } from "viem";
import { formatNumber } from "@/lib/utils";
import { useTranslation } from "@/i18n/TranslationProvider";

interface PurchaseNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: number;
  contractTokenId: number | null;
  collectionName: string;
}

export function PurchaseNFTModal({
  isOpen,
  onClose,
  collectionId,
  contractTokenId,
  collectionName,
}: PurchaseNFTModalProps) {
  const { address } = useAccount();
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>("1");
  const [needsApproval, setNeedsApproval] = useState(false);
  const [hasEnoughAllowance, setHasEnoughAllowance] = useState(false);

  // Get NFT token info from contract
  const { tokenInfo, isLoading: isLoadingTokenInfo } = useNFTTokenInfo(contractTokenId);
  
  // Get TBCC address (payment token)
  const { tbccAddress } = useNFTTBCCAddress();
  
  // Get user's TBCC balance (assuming TBCC is TUSDT for now)
  const { balance: tbccBalance, isLoading: isLoadingBalance } = useUSDTBalance();
  
  // Get TBCC allowance
  const { allowance, refetch: refetchAllowance } = useNFTAllowance();
  
  // Approval hook (for TBCC)
  const { approve, hash: approvalHash, isPending: isApproving, isSuccess: isApprovalSuccess, error: approvalError } = useApproveTBCCForNFT();
  
  // Buy NFT hook
  const { buyNFT, hash: buyHash, isPending: isBuying, isConfirming: isBuyConfirming, isSuccess: isBuySuccess, error: buyError } = useBuyNFT();

  // Check if user needs to approve
  useEffect(() => {
    if (tokenInfo && amount && tbccAddress && address) {
      const totalCost = tokenInfo.price * BigInt(parseInt(amount));
      const totalCostFormatted = formatUnits(totalCost, 6);
      const currentAllowance = parseFloat(allowance);
      
      setNeedsApproval(currentAllowance < parseFloat(totalCostFormatted));
      setHasEnoughAllowance(currentAllowance >= parseFloat(totalCostFormatted));
    }
  }, [tokenInfo, amount, tbccAddress, address, allowance]);

  // Refetch allowance after approval success
  useEffect(() => {
    if (isApprovalSuccess) {
      refetchAllowance();
      setHasEnoughAllowance(true);
    }
  }, [isApprovalSuccess, refetchAllowance]);

  // Handle approval
  const handleApprove = async () => {
    if (!tokenInfo || !amount) return;
    
    const totalCost = tokenInfo.price * BigInt(parseInt(amount));
    const totalCostString = formatUnits(totalCost, 6); // Assuming 6 decimals for TBCC
    
    // Approve a bit more to avoid needing re-approval
    const approveAmount = (parseFloat(totalCostString) * 1.1).toFixed(6);
    await approve(approveAmount);
  };

  // Handle purchase
  const handlePurchase = async () => {
    if (!contractTokenId || !amount) return;
    
    await buyNFT(contractTokenId, parseInt(amount));
  };

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setAmount("1");
      setNeedsApproval(false);
      setHasEnoughAllowance(false);
    }
  }, [isOpen]);

  // Close on success
  useEffect(() => {
    if (isBuySuccess) {
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  }, [isBuySuccess, onClose]);

  if (!isOpen) return null;

  const totalCost = tokenInfo ? tokenInfo.price * BigInt(parseInt(amount || "1")) : BigInt(0);
  const totalCostFormatted = tokenInfo ? formatUnits(totalCost, 6) : "0"; // Assuming 6 decimals
  const hasEnoughBalance = parseFloat(tbccBalance) >= parseFloat(totalCostFormatted);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-glass rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700/30">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {t("nft.purchaseNFT") || "Purchase NFT"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* NFT Info */}
        {isLoadingTokenInfo ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
          </div>
        ) : tokenInfo ? (
          <>
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">{t("nft.collection") || "Collection"}</p>
              <p className="text-white font-semibold">{collectionName}</p>
              <p className="text-gray-400 text-sm mt-1">
                {tokenInfo.name} ({tokenInfo.symbol})
              </p>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">
                {t("nft.amount") || "Amount"}
              </label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50"
                disabled={isBuying || isApproving}
              />
            </div>

            {/* Price Info */}
            <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">
                  {t("nft.pricePerNFT") || "Price per NFT"}
                </span>
                <span className="text-white font-semibold">
                  {formatNumber(formatUnits(tokenInfo.price, 6), 2)} TBCC
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">
                  {t("nft.totalCost") || "Total Cost"}
                </span>
                <span className="text-yellow-400 font-bold text-lg">
                  {formatNumber(totalCostFormatted, 2)} TBCC
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400 text-sm">
                  {t("nft.yourBalance") || "Your Balance"}
                </span>
                <span className="text-white font-semibold">
                  {isLoadingBalance ? "..." : formatNumber(parseFloat(tbccBalance), 2)} TBCC
                </span>
              </div>
            </div>

            {/* Error Messages */}
            {!hasEnoughBalance && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">
                  {t("nft.insufficientBalance") || "Insufficient balance"}
                </p>
              </div>
            )}

            {approvalError && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">
                  {approvalError.message || "Approval failed"}
                </p>
              </div>
            )}

            {buyError && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">
                  {buyError.message || "Purchase failed"}
                </p>
              </div>
            )}

            {/* Success Message */}
            {isBuySuccess && (
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3 mb-4 flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-green-400 text-sm">
                  {t("nft.purchaseSuccess") || "NFT purchased successfully!"}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {needsApproval && !hasEnoughAllowance && (
                <Button
                  onClick={handleApprove}
                  disabled={isApproving || !hasEnoughBalance || isBuying}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("nft.approving") || "Approving..."}
                    </>
                  ) : (
                    t("nft.approve") || "Approve TBCC"
                  )}
                </Button>
              )}
              
              <Button
                onClick={handlePurchase}
                disabled={
                  isBuying ||
                  isApproving ||
                  !hasEnoughBalance ||
                  (needsApproval && !hasEnoughAllowance) ||
                  !amount ||
                  parseInt(amount) <= 0
                }
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {isBuying || isBuyConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("nft.purchasing") || "Purchasing..."}
                  </>
                ) : (
                  t("nft.confirmPurchase") || "Confirm Purchase"
                )}
              </Button>
            </div>

            {/* Transaction Links */}
            {(approvalHash || buyHash) && (
              <div className="mt-4 pt-4 border-t border-gray-700/30">
                {approvalHash && (
                  <a
                    href={`https://bscscan.com/tx/${approvalHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 hover:text-yellow-300 text-sm block mb-2"
                  >
                    {t("nft.viewApprovalTx") || "View Approval Transaction"}
                  </a>
                )}
                {buyHash && (
                  <a
                    href={`https://bscscan.com/tx/${buyHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 hover:text-yellow-300 text-sm block"
                  >
                    {t("nft.viewPurchaseTx") || "View Purchase Transaction"}
                  </a>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {t("nft.tokenNotFound") || "NFT token not found on contract"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

