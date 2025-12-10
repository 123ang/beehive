"use client";

import { useAccount, useBalance } from "wagmi";
import { Card } from "@/components/ui/Card";
import { useUSDTBalance, useMemberLevel, useRewardInfo } from "@/hooks/useContracts";
import { formatNumber, shortenAddress, getLevelColor } from "@/lib/utils";
import { MEMBERSHIP_LEVELS } from "@beehive/shared";
import { Wallet, Coins, Crown, Gift } from "lucide-react";

export function WalletInfo() {
  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  const { balance: usdtBalance, isLoading: isLoadingUSDT } = useUSDTBalance();
  const { level, isLoading: isLoadingLevel } = useMemberLevel();
  const { data: rewardInfo, isLoading: isLoadingRewards } = useRewardInfo();

  if (!isConnected || !address) {
    return null;
  }

  const levelInfo = MEMBERSHIP_LEVELS.find((l) => l.level === level);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-honey-500/30 to-honey-600/30 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-honey-400" />
        </div>
        <div>
          <div className="text-white font-semibold">
            {shortenAddress(address)}
          </div>
          <div className="text-gray-500 text-sm">Connected</div>
        </div>
      </div>

      <div className="space-y-4">
        {/* ETH Balance */}
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-400 text-xs font-bold">Ξ</span>
            </div>
            <span className="text-gray-400 text-sm">ETH</span>
          </div>
          <span className="text-white font-medium">
            {ethBalance ? formatNumber(ethBalance.formatted, 4) : "0.0000"}
          </span>
        </div>

        {/* USDT Balance */}
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Coins className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-gray-400 text-sm">USDT</span>
          </div>
          <span className="text-white font-medium">
            {isLoadingUSDT ? "..." : `$${formatNumber(usdtBalance)}`}
          </span>
        </div>

        {/* Member Level */}
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: level > 0 ? `${getLevelColor(level)}30` : "rgba(255,255,255,0.1)",
              }}
            >
              <Crown
                className="w-4 h-4"
                style={{ color: level > 0 ? getLevelColor(level) : "#6b7280" }}
              />
            </div>
            <span className="text-gray-400 text-sm">Level</span>
          </div>
          <span className="text-white font-medium">
            {isLoadingLevel
              ? "..."
              : level > 0
              ? `${level} - ${levelInfo?.name}`
              : "Not a member"}
          </span>
        </div>

        {/* Pending Rewards */}
        {rewardInfo && (parseFloat(rewardInfo.pendingUSDT) > 0 || parseFloat(rewardInfo.pendingBCC) > 0) && (
          <div className="flex justify-between items-center p-3 bg-honey-500/10 border border-honey-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-honey-500/20 flex items-center justify-center">
                <Gift className="w-4 h-4 text-honey-400" />
              </div>
              <span className="text-honey-400 text-sm">Pending</span>
            </div>
            <div className="text-right">
              {parseFloat(rewardInfo.pendingUSDT) > 0 && (
                <div className="text-white font-medium">
                  ${formatNumber(rewardInfo.pendingUSDT)} USDT
                </div>
              )}
              {parseFloat(rewardInfo.pendingBCC) > 0 && (
                <div className="text-honey-400 text-sm">
                  {formatNumber(rewardInfo.pendingBCC, 0)} BCC
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}



