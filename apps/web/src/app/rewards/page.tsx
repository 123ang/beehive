"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useSearchParams } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { formatNumber, shortenAddress } from "@/lib/utils";
import { useTranslation } from "@/i18n/TranslationProvider";
import {
  Wallet,
  TrendingUp,
  Clock,
  Download,
  Gift,
  Lock,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  BarChart3,
  DollarSign,
  User,
  ArrowUpRight,
  Users,
  Shield,
  Zap,
  Settings,
  ArrowRight,
  Info,
} from "lucide-react";

interface Reward {
  id: number;
  rewardType: string;
  amount: string;
  currency: string;
  status: string;
  layerNumber?: number;
  sourceWallet?: string;
  createdAt: string;
  expiresAt?: string;
}

interface RewardSummary {
  totalEarned: string;
  pending: string;
  totalWithdrawn: string;
  claimable: string;
  totalDirectSponsor: string;
  totalLayerPayout: string;
  totalBCC: string;
  pendingUSDT: string;
  pendingBCC: string;
  claimedUSDT: string;
  claimedBCC: string;
}

export default function RewardsPage() {
  const { isConnected, address } = useAccount();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true);
  const [isCountdownExpanded, setIsCountdownExpanded] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [selectedChain, setSelectedChain] = useState<string>("ethereum");
  const [availableBalance, setAvailableBalance] = useState<string>("0");

  const walletAddress = searchParams.get("address") || address;

  useEffect(() => {
    if (walletAddress) {
      fetchRewards();
    } else if (!isConnected) {
      setLoading(false);
    }
  }, [walletAddress, isConnected]);

  const fetchRewards = async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    try {
      const result = await api.getRewards(walletAddress);
    if (result.success && result.data) {
      setRewards(result.data.rewards || []);
      setSummary(result.data.summary || null);
        // Set available balance from claimable amount
        if (result.data.summary?.claimable) {
          setAvailableBalance(result.data.summary.claimable);
        }
    }
    } catch (error) {
      console.error("Failed to fetch rewards:", error);
    } finally {
    setLoading(false);
    }
  };

  const getPendingRewards = () => {
    return rewards.filter((r) => r.status === "pending");
  };

  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;
    
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Not connected state
  if (!isConnected && !walletAddress) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
        <Header />
        <section className="pt-28 pb-16 min-h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-glass rounded-2xl p-12 max-w-md mx-auto"
            >
              <div className="w-20 h-20 rounded-full bg-honey-500/20 flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-10 h-10 text-honey-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                {t("rewards.connectWallet") || "Connect Your Wallet"}
              </h2>
              <p className="text-gray-400 mb-6">
                {t("rewards.connectWalletDesc") || "Connect your wallet to view your rewards"}
              </p>
              <ConnectButton />
            </motion.div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const claimableAmount = summary ? parseFloat(summary.claimable || "0") : 0;
  const pendingRewards = getPendingRewards();

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      <Header />

      <section className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Banner - Available to Claim */}
          {claimableAmount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-gray-800/50 border border-yellow-500/50 rounded-lg px-6 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-yellow-400 font-semibold">
                    ${formatNumber(claimableAmount, 2)} {t("rewards.availableToClaim") || "Available to Claim"}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  // TODO: Implement claim functionality
                  console.log("Claim rewards");
                }}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {t("rewards.claim") || "Claim"}
              </Button>
            </motion.div>
          )}

          {/* Rewards Overview Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-xl border border-gray-700/30 mb-6"
          >
            <div
              className="p-6 cursor-pointer flex items-center justify-between"
              onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-yellow-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {t("rewards.overview.title") || "Rewards Overview"}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {t("rewards.overview.subtitle") || "Click to expand and view detailed statistics"}
                  </p>
                </div>
              </div>
              {isOverviewExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>

            {isOverviewExpanded && (
              <div className="px-6 pb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Earned */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-400 text-xs uppercase">
                      {t("rewards.overview.totalEarned") || "TOTAL EARNED"}
                    </span>
                  </div>
                  <p className="text-yellow-400 text-2xl font-bold">
                    ${formatNumber(summary ? parseFloat(summary.totalEarned || "0") : 0, 2)}
                  </p>
                </div>

                {/* Pending */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-400 text-xs uppercase">
                      {t("rewards.overview.pending") || "PENDING"}
                    </span>
                  </div>
                  <p className="text-yellow-400 text-2xl font-bold">
                    ${formatNumber(summary ? parseFloat(summary.pending || "0") : 0, 2)}
                  </p>
                </div>

                {/* Total Withdrawn */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-400 text-xs uppercase">
                      {t("rewards.overview.totalWithdrawn") || "TOTAL WITHDRAWN"}
                    </span>
                  </div>
                  <p className="text-yellow-400 text-2xl font-bold">
                    ${formatNumber(summary ? parseFloat(summary.totalWithdrawn || "0") : 0, 2)}
                  </p>
                </div>

                {/* Claimable */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-400 text-xs uppercase">
                      {t("rewards.overview.claimable") || "CLAIMABLE"}
                    </span>
                  </div>
                  <p className="text-yellow-400 text-2xl font-bold">
                    ${formatNumber(claimableAmount, 2)}
                  </p>
                </div>
              </div>
            )}
              </motion.div>

          {/* Reward Management Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 rounded-xl border border-gray-700/30 mb-6"
          >
            <div className="p-6 border-b border-gray-700/30">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="w-5 h-5 text-yellow-400" />
                <h2 className="text-xl font-bold text-white">
                  {t("rewards.management.title") || "Reward Management"}
                </h2>
                </div>
              <p className="text-gray-400 text-sm">
                {t("rewards.management.subtitle") || "Select a category below to view and manage your rewards"}
              </p>
            </div>

            <div className="p-6">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    activeTab === "pending"
                      ? "bg-yellow-500 text-black"
                      : "bg-gray-900/50 text-gray-400 hover:bg-gray-800/50"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {t("rewards.tabs.pending") || "Pending"}
                </button>
                <button
                  onClick={() => setActiveTab("rollup")}
                  className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    activeTab === "rollup"
                      ? "bg-yellow-500 text-black"
                      : "bg-gray-900/50 text-gray-400 hover:bg-gray-800/50"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  {t("rewards.tabs.rollup") || "Rollup"}
                </button>
                <button
                  onClick={() => setActiveTab("withdraw")}
                  className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    activeTab === "withdraw"
                      ? "bg-yellow-500 text-black"
                      : "bg-gray-900/50 text-gray-400 hover:bg-gray-800/50"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  {t("rewards.tabs.withdraw") || "Withdraw"}
                </button>
              <button
                  onClick={() => setActiveTab("history")}
                  className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    activeTab === "history"
                      ? "bg-yellow-500 text-black"
                      : "bg-gray-900/50 text-gray-400 hover:bg-gray-800/50"
                  }`}
                >
                  <User className="w-4 h-4" />
                  {t("rewards.tabs.history") || "History"}
                </button>
              </div>

              {/* Tab Content */}
              <div className="mt-6 min-h-[200px]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
                  </div>
                ) : (
                  <>
                    {activeTab === "pending" && (
                      <div className="space-y-3">
                        {pendingRewards.length === 0 ? (
                          <p className="text-gray-400 text-center py-8">
                            {t("rewards.noPendingRewards") || "No pending rewards"}
                          </p>
                        ) : (
                          pendingRewards.map((reward) => (
                            <div
                              key={reward.id}
                              className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-white font-medium">
                                    {reward.rewardType === "direct_sponsor"
                                      ? t("rewards.types.directSponsor") || "Direct Sponsor"
                                      : t("rewards.types.layerPayout") || "Layer Payout"}
                                  </p>
                                  <p className="text-gray-400 text-sm">
                                    ${formatNumber(reward.amount)} {reward.currency}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-yellow-400 text-sm font-medium">
                                    {reward.expiresAt ? getTimeRemaining(reward.expiresAt) : t("rewards.pending") || "Pending"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    {activeTab === "rollup" && (
                      <div className="space-y-6">
                        {/* Rollup Rewards Header */}
                        <div className="bg-gradient-to-br from-orange-900/30 to-gray-900/50 rounded-xl p-6 border border-orange-700/30">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <BarChart3 className="w-6 h-6 text-yellow-400" />
                              <div>
                                <h3 className="text-xl font-bold text-white">
                                  {t("rewards.rollup.title") || "Rollup Rewards"}
                                </h3>
                                <p className="text-gray-400 text-sm">
                                  {t("rewards.rollup.subtitle") || "Automatic reward redistribution system"}
                                </p>
                              </div>
                            </div>
                            <button className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm font-medium flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                              {t("rewards.rollup.autoDistribution") || "Auto Distribution"}
              </button>
                          </div>
                        </div>

                        {/* Feature Cards */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30">
                            <ArrowUpRight className="w-6 h-6 text-yellow-400 mb-2" />
                            <p className="text-yellow-400 font-semibold mb-1">
                              {t("rewards.rollup.features.automatic") || "Automatic"}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {t("rewards.rollup.features.distribution") || "Distribution"}
                            </p>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30">
                            <Users className="w-6 h-6 text-yellow-400 mb-2" />
                            <p className="text-yellow-400 font-semibold mb-1">
                              {t("rewards.rollup.features.networkBased") || "Network-Based"}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {t("rewards.rollup.features.based") || "Based"}
                            </p>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30">
                            <Clock className="w-6 h-6 text-orange-400 mb-2" />
                            <p className="text-orange-400 font-semibold mb-1">
                              {t("rewards.rollup.features.realTime") || "Real-Time"}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {t("rewards.rollup.features.tracking") || "Tracking"}
                            </p>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30">
                            <Shield className="w-6 h-6 text-green-400 mb-2" />
                            <p className="text-green-400 font-semibold mb-1">
                              {t("rewards.rollup.features.transparent") || "Transparent"}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {t("rewards.rollup.features.system") || "System"}
                            </p>
                          </div>
                        </div>

                        {/* Rollup Rewards Content */}
                        <div className="bg-gray-900/50 rounded-xl p-12 border border-gray-700/30">
                          <div className="text-center">
                            <ArrowUpRight className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-yellow-400 text-xl font-bold mb-2">
                              {t("rewards.rollup.noRewards") || "No Rollup Rewards"}
                            </p>
                            <p className="text-gray-400 text-sm max-w-md mx-auto">
                              {t("rewards.rollup.explanation") || "You don't have any rollup rewards at this time. Rollup rewards are created when your downline members fail to claim their rewards within the 72-hour window."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeTab === "withdraw" && (
                      <div className="space-y-6">
                        {/* Withdrawal Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <Settings className="w-5 h-5 text-yellow-400" />
                          <div>
                            <h3 className="text-xl font-bold text-white">
                              {t("rewards.withdraw.title") || "Withdrawal"}
                            </h3>
                            <p className="text-gray-400 text-sm">
                              {t("rewards.withdraw.subtitle") || "Withdraw your rewards to any supported blockchain"}
                            </p>
                          </div>
                        </div>

                        {/* Available Balance */}
                        <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700/30">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-400 text-sm">
                              {t("rewards.withdraw.availableBalance") || "Available Balance"}
                            </span>
                            <RefreshCw className="w-4 h-4 text-gray-400 cursor-pointer hover:text-yellow-400" />
                          </div>
                          <p className="text-yellow-400 text-4xl font-bold mb-2">
                            ${formatNumber(parseFloat(availableBalance), 2)} USDT
                          </p>
                          <p className="text-gray-400 text-sm">
                            {t("rewards.withdraw.wallet") || "Wallet"}: {address ? shortenAddress(address, 8) : "-"}
                          </p>
                        </div>

                        {/* Multi-Chain Support */}
                        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 flex items-start gap-3">
                          <Zap className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <p className="text-gray-300 text-sm">
                            {t("rewards.withdraw.multiChain") || "Multi-Chain Support: Withdraw to Ethereum, Arbitrum, Polygon, Optimism, BSC, or Base."}
                          </p>
                        </div>

                        {/* Withdrawal Chain */}
                        <div>
                          <label className="block text-gray-400 text-sm mb-2">
                            {t("rewards.withdraw.chain") || "Withdrawal Chain"}
                          </label>
                          <div className="relative">
                            <select
                              value={selectedChain}
                              onChange={(e) => setSelectedChain(e.target.value)}
                              className="w-full bg-gray-900/50 border border-gray-700/30 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-yellow-500/50"
                            >
                              <option value="ethereum">Ethereum - 15 USDT fee</option>
                              <option value="arbitrum">Arbitrum - 5 USDT fee</option>
                              <option value="polygon">Polygon - 3 USDT fee</option>
                              <option value="optimism">Optimism - 5 USDT fee</option>
                              <option value="bsc">BSC - 3 USDT fee</option>
                              <option value="base">Base - 5 USDT fee</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          </div>
                        </div>

                        {/* Withdrawal Currency */}
                        <div>
                          <label className="block text-gray-400 text-sm mb-2">
                            {t("rewards.withdraw.currency") || "Withdrawal Currency"}
                          </label>
                          <div className="bg-gray-900/50 border border-gray-700/30 rounded-lg p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-blue-500 flex items-center justify-center text-white font-bold">
                              $
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-semibold">USDT (Tether)</p>
                              <p className="text-gray-400 text-xs">
                                {t("rewards.withdraw.currencyDesc") || "Stablecoin on Ethereum"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Withdrawal Amount */}
                        <div>
                          <label className="block text-gray-400 text-sm mb-2">
                            {t("rewards.withdraw.amount") || "Withdrawal Amount (USDT)"}
                          </label>
                          <input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            placeholder={t("rewards.withdraw.amountPlaceholder") || "Enter amount"}
                            className="w-full bg-gray-900/50 border border-gray-700/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
                          />
          </div>

                        {/* Withdraw Button */}
                        <Button
                          onClick={() => {
                            // TODO: Implement withdrawal
                            console.log("Withdraw", withdrawAmount, selectedChain);
                          }}
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                          disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
                        >
                          {t("rewards.withdraw.button", { chain: selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1) }) || `Withdraw to ${selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1)}`}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>

                        {/* Disclaimer */}
                        <div className="flex items-start gap-2 text-gray-400 text-xs">
                          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <p>
                            {t("rewards.withdraw.disclaimer", { chain: selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1) }) || `Cross-chain withdrawal to ${selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1)} may take 5-15 minutes.`}
                          </p>
                        </div>
                      </div>
                    )}
                    {activeTab === "history" && (
                      <div className="space-y-3">
                        {rewards.filter((r) => r.status !== "pending").length === 0 ? (
                          <div className="bg-gray-900/50 rounded-xl p-12 border border-gray-700/30 text-center">
                            <Gift className="w-16 h-16 text-yellow-400/30 mx-auto mb-4" />
                            <p className="text-yellow-400 text-xl font-bold mb-2">
                              {t("rewards.history.noHistory") || "No reward history yet"}
                            </p>
                            <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                              {t("rewards.history.explanation") || "Your reward transactions will appear here once you start earning through the matrix system"}
                            </p>
                            <Button
                              variant="secondary"
                              className="bg-black/50 hover:bg-black/70 text-white border border-gray-700"
                            >
                              {t("rewards.history.learnMore") || "Learn More"}
                            </Button>
                          </div>
                        ) : (
                          rewards
                            .filter((r) => r.status !== "pending")
                            .map((reward) => (
                              <div
                                key={reward.id}
                                className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-white font-medium">
                                      {reward.rewardType === "direct_sponsor"
                                        ? t("rewards.types.directSponsor") || "Direct Sponsor"
                                        : t("rewards.types.layerPayout") || "Layer Payout"}
                                    </p>
                                    <p className="text-gray-400 text-sm">
                                      {new Date(reward.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-yellow-400 font-medium">
                                      ${formatNumber(reward.amount)} {reward.currency}
                                    </p>
                                    <p className="text-gray-400 text-xs capitalize">{reward.status}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Pending Rewards Countdown Section - Only show for Pending tab */}
          {activeTab === "pending" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800/50 rounded-xl border border-gray-700/30"
            >
            <div className="p-6 border-b border-gray-700/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {t("rewards.countdown.title") || "Pending Rewards Countdown"}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {t("rewards.countdown.subtitle") || "Monitor your pending rewards with real-time countdown timers"}
                  </p>
                </div>
              </div>
              <Button
                onClick={fetchRewards}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {t("rewards.refresh") || "Refresh"}
              </Button>
            </div>

            <div className="p-12">
              {pendingRewards.length === 0 ? (
                <div className="text-center">
                  <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">
                    {t("rewards.countdown.noPending") || "No pending rewards"}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {t("rewards.countdown.instruction") || "Complete tasks and invite referrals to start earning pending rewards with countdown timers"}
                  </p>
              </div>
            ) : (
                <div className="space-y-4">
                  {pendingRewards.map((reward) => (
                    <div
                        key={reward.id}
                      className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">
                            {reward.rewardType === "direct_sponsor"
                              ? t("rewards.types.directSponsor") || "Direct Sponsor"
                              : t("rewards.types.layerPayout") || "Layer Payout"}
                          </p>
                          <p className="text-gray-400 text-sm">
                            ${formatNumber(reward.amount)} {reward.currency}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-yellow-400 text-lg font-bold">
                            {reward.expiresAt ? getTimeRemaining(reward.expiresAt) : t("rewards.pending") || "Pending"}
                          </p>
                          {reward.expiresAt && (
                            <p className="text-gray-400 text-xs">
                              {new Date(reward.expiresAt).toLocaleString()}
                            </p>
                            )}
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
