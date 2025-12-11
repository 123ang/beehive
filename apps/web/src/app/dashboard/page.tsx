"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { formatNumber, shortenAddress, copyToClipboard, generateReferralLink } from "@/lib/utils";
import { NewsSection } from "@/components/members/NewsSection";
import { DiscoverSection } from "@/components/members/DiscoverSection";
import { ReferralLink } from "@/components/members/ReferralLink";
import {
  Wallet,
  TrendingUp,
  Users,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Crown,
  Coins,
} from "lucide-react";

interface DashboardData {
  isMember: boolean;
  currentLevel: number;
  levelName: string;
  totalEarningsUSDT: string;
  totalEarningsBCC: string;
  pendingRewardsUSDT: string;
  pendingRewardsBCC: string;
  directReferrals: number;
  teamSize: number;
}

export default function DashboardPage() {
  const { isConnected, address } = useAccount();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      fetchDashboard();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const fetchDashboard = async () => {
    setLoading(true);
    const result = await api.getDashboard();
    if (result.success && result.data) {
      setDashboard(result.data);
    }
    setLoading(false);
  };

  const handleCopyReferral = async () => {
    if (!address) return;
    const link = generateReferralLink(address);
    const success = await copyToClipboard(link);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <main className="min-h-screen">
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
                Connect Your Wallet
              </h2>
              <p className="text-gray-400 mb-6">
                Connect your wallet to view your dashboard and manage your
                membership.
              </p>
              <ConnectButton />
            </motion.div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-4xl font-bold font-display"
              >
                <span className="text-white">Your </span>
                <span className="text-gradient-gold">Dashboard</span>
              </motion.h1>
              <p className="text-gray-400 mt-2">
                Welcome back, {shortenAddress(address || "")}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={fetchDashboard}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {loading ? (
            // Loading State
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-glass rounded-xl p-6 animate-pulse"
                >
                  <div className="h-4 bg-white/10 rounded w-20 mb-4" />
                  <div className="h-8 bg-white/10 rounded w-32" />
                </div>
              ))}
            </div>
          ) : !dashboard?.isMember ? (
            // Not a member state
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-glass rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-honey-500/20 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-honey-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Become a Member
              </h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                You haven't purchased a membership yet. Start your journey by
                purchasing Level 1.
              </p>
              <Button onClick={() => (window.location.href = "/membership")}>
                View Membership Levels
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Current Level */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-glass rounded-xl p-6 stats-card"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-honey-500/20 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-honey-400" />
                    </div>
                    <span className="text-gray-400 text-sm">Current Level</span>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    Level {dashboard.currentLevel}
                  </div>
                  <div className="text-honey-400 text-sm mt-1">
                    {dashboard.levelName}
                  </div>
                </motion.div>

                {/* Total Earnings */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-glass rounded-xl p-6 stats-card"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-gray-400 text-sm">Total Earnings</span>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    ${formatNumber(dashboard.totalEarningsUSDT)}
                  </div>
                  <div className="text-green-400 text-sm mt-1">USDT</div>
                </motion.div>

                {/* BCC Tokens */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-glass rounded-xl p-6 stats-card"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-gray-400 text-sm">BCC Tokens</span>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {formatNumber(dashboard.totalEarningsBCC, 0)}
                  </div>
                  <div className="text-purple-400 text-sm mt-1">BCC</div>
                </motion.div>

                {/* Team Size */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-glass rounded-xl p-6 stats-card"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-gray-400 text-sm">Team Size</span>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {dashboard.teamSize}
                  </div>
                  <div className="text-blue-400 text-sm mt-1">
                    {dashboard.directReferrals} direct
                  </div>
                </motion.div>
              </div>

              {/* Pending Rewards & Referral */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Rewards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-glass rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Pending Rewards
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                      <div>
                        <div className="text-gray-400 text-sm">USDT</div>
                        <div className="text-xl font-bold text-white">
                          ${formatNumber(dashboard.pendingRewardsUSDT)}
                        </div>
                      </div>
                      <Button size="sm" disabled={parseFloat(dashboard.pendingRewardsUSDT) === 0}>
                        Claim
                      </Button>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                      <div>
                        <div className="text-gray-400 text-sm">BCC</div>
                        <div className="text-xl font-bold text-white">
                          {formatNumber(dashboard.pendingRewardsBCC, 0)}
                        </div>
                      </div>
                      <Button size="sm" disabled={parseFloat(dashboard.pendingRewardsBCC) === 0}>
                        Claim
                      </Button>
                    </div>
                  </div>
                </motion.div>

                {/* Referral Link */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-glass rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Your Referral Link
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Share this link with friends and earn $100 USDT for each
                    Level 1 purchase.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generateReferralLink(address || "")}
                      readOnly
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none"
                    />
                    <Button onClick={handleCopyReferral} variant="secondary">
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </motion.div>
              </div>

              {/* Referral Link Component */}
              <ReferralLink />

              {/* News Section */}
              <NewsSection />

              {/* Discover Section */}
              <DiscoverSection />
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

