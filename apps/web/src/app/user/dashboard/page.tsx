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
import { useTranslation } from "@/i18n/TranslationProvider";
import {
  Wallet,
  RefreshCw,
  Crown,
  DollarSign,
  Users,
  TrendingUp,
  Copy,
  Check,
  Lock,
  Plus,
  ArrowRight,
  Lightbulb,
  Share2,
  Facebook,
  MessageCircle,
  Twitter,
  Send,
} from "lucide-react";
import Link from "next/link";
import { MatrixViewModal } from "@/components/user/MatrixViewModal";

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
  username?: string;
}

export default function UserDashboardPage() {
  const { isConnected, address } = useAccount();
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showMatrix, setShowMatrix] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      // Fetch dashboard data directly using wallet address (no auth needed)
      fetchDashboard();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const fetchDashboard = async () => {
    if (!address) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Pass wallet address directly - no authentication needed
      const result = await api.getDashboard(address);
      if (result.success && result.data) {
        setDashboard(result.data);
        setLastUpdate(new Date());
        console.log("✅ Dashboard data loaded:", result.data);
      } else {
        console.error("❌ Failed to fetch dashboard:", result.error);
      }
    } catch (error) {
      console.error("❌ Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
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

  const handleShare = (platform: "facebook" | "whatsapp" | "twitter" | "telegram") => {
    if (!address) return;
    
    const referralLink = generateReferralLink(address);
    const shareText = `${t("dashboard.shareMessage")} ${referralLink}`;
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(referralLink);
    
    let shareUrl = "";
    
    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodedText}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case "telegram":
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(t("dashboard.shareMessage"))}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  // Calculate BCC balances (using earnings as transferable, pending as locked for now)
  const transferableBCC = dashboard?.totalEarningsBCC ? parseFloat(dashboard.totalEarningsBCC) : 0;
  const lockedBCC = dashboard?.pendingRewardsBCC ? parseFloat(dashboard.pendingRewardsBCC) : 0;
  const totalRewards = dashboard?.totalEarningsUSDT ? parseFloat(dashboard.totalEarningsUSDT) : 0;
  const claimableRewards = dashboard?.pendingRewardsUSDT ? parseFloat(dashboard.pendingRewardsUSDT) : 0;
  
  // Calculate max level (for now, use a placeholder - can be enhanced with API)
  const maxLevel = dashboard?.teamSize ? Math.min(12, Math.floor(Math.log2(dashboard.teamSize + 1)) + 1) : 0;

  // Not connected state
  if (!isConnected) {
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
              <h2 className="text-2xl font-bold text-white mb-4">{t("dashboard.connectWallet")}</h2>
              <p className="text-gray-400 mb-6">{t("dashboard.connectWalletDesc")}</p>
              <ConnectButton />
            </motion.div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      <Header />

      <section className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2"
                >
                  {t("dashboard.welcome")}, {dashboard?.username || shortenAddress(address || "")}!
                </motion.h1>
                <p className="text-gray-300 text-lg">{t("dashboard.subtitle")}</p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="secondary"
                  onClick={fetchDashboard}
                  disabled={loading}
                  className="bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  {t("dashboard.refresh")}
                </Button>
              </div>
            </div>
            <p className="text-gray-500 text-sm">{t("dashboard.lastUpdate")}: {formatDateTime(lastUpdate)}</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-800/50 rounded-xl p-6 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-20 mb-4" />
                  <div className="h-8 bg-white/10 rounded w-32" />
                </div>
              ))}
            </div>
          ) : !dashboard?.isMember ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-honey-500/20 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-honey-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{t("dashboard.becomeMember")}</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                {t("dashboard.becomeMemberDesc")}
              </p>
              <Button onClick={() => (window.location.href = "/membership")}>
                {t("dashboard.viewLevels")}
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Three Main Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Member Level Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-xl p-6 border border-purple-700/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-purple-400" />
                      <h3 className="text-white font-semibold">{t("dashboard.membershipLevel")}</h3>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">{t("dashboard.yourNFT")}</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-purple-400">Level {dashboard.currentLevel}</span>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">NFT</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{t("dashboard.currentLevel")}</p>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => (window.location.href = "/membership")}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    {t("dashboard.upgrade")}
                  </Button>
                </motion.div>

                {/* BCC Balance Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-yellow-900/50 to-orange-800/30 rounded-xl p-6 border border-yellow-700/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-yellow-400" />
                      <h3 className="text-white font-semibold">{t("dashboard.bccBalance")}</h3>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">{t("dashboard.yourTokens")}</p>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-yellow-400">$ {formatNumber(transferableBCC, 2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-gray-400 text-sm">{t("dashboard.transferable")}</p>
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">{t("dashboard.available")}</span>
                    </div>
                  </div>
                  <div className="mb-4 pt-4 border-t border-yellow-700/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-yellow-400" />
                      <span className="text-2xl font-bold text-yellow-400">{formatNumber(lockedBCC, 2)}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{t("dashboard.bccLocked")}</p>
                  </div>
                  {/* Top Up button hidden */}
                  {/* <Button
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                    onClick={() => (window.location.href = "/rewards")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("dashboard.recharge")}
                  </Button> */}
                </motion.div>

                {/* Recommended Network Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl p-6 border border-blue-700/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-400" />
                      <h3 className="text-white font-semibold">{t("dashboard.referralNetwork")}</h3>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{t("dashboard.yourTeam")}</p>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-blue-400">{dashboard.directReferrals}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">{t("dashboard.directReferrals")}</p>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-blue-400">{dashboard.teamSize}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">{t("dashboard.totalTeamSize")}</p>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <p className="text-gray-300 text-sm">{t("dashboard.maxLevel")}: {maxLevel}</p>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setShowMatrix(true)}
                  >
                    {t("dashboard.viewMatrix")} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              </div>

              {/* Reward Center and Share Referral Link */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Reward Center */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/30"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-green-400" />
                    <h3 className="text-white font-semibold">{t("dashboard.rewardCenter")}</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-6">{t("dashboard.yourEarnings")}</p>
                  
                  <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                    <p className="text-gray-400 text-sm mb-1">{t("dashboard.totalRewards")}</p>
                    <p className="text-3xl font-bold text-green-400">${formatNumber(totalRewards, 2)}</p>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-gray-400 text-sm">{t("dashboard.claimableRewards")}</p>
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">{t("dashboard.ready")}</span>
                    </div>
                    <p className="text-3xl font-bold text-yellow-400">${formatNumber(claimableRewards, 2)}</p>
                  </div>
                  
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      if (address) {
                        window.location.href = `/rewards?address=${encodeURIComponent(address)}`;
                      } else {
                        window.location.href = "/rewards";
                      }
                    }}
                  >
                    {t("dashboard.claimRewards")} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>

                {/* Share Referral Link */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/30"
                >
                  {/* Logo and Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative w-10 h-10">
                      <div className="absolute inset-0 hexagon bg-gradient-to-br from-honey-400 to-honey-600" />
                      <div className="absolute inset-1 hexagon bg-gray-900 flex items-center justify-center">
                        <span className="text-honey-400 font-bold text-lg">🐝</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">Beehive</h3>
                      <p className="text-gray-400 text-xs">{t("dashboard.shareReferral")}</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-6">
                    {t("dashboard.shareDesc")}
                  </p>
                  
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={generateReferralLink(address || "")}
                      readOnly
                      className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-yellow-500"
                    />
                    <Button
                      onClick={handleCopyReferral}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-3">{t("dashboard.shareTo")}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {/* Facebook */}
                    <button
                      onClick={() => handleShare("facebook")}
                      className="bg-blue-500/20 hover:bg-blue-500/30 rounded-lg px-2.5 py-2.5 flex items-center gap-2 border border-blue-500/60 hover:border-blue-500 transition-all group w-full min-w-0"
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <Facebook className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-yellow-400 font-medium text-xs truncate">Facebook</span>
                    </button>
                    
                    {/* WhatsApp */}
                    <button
                      onClick={() => handleShare("whatsapp")}
                      className="bg-green-500/20 hover:bg-green-500/30 rounded-lg px-2.5 py-2.5 flex items-center gap-2 border border-green-500/60 hover:border-green-500 transition-all group w-full min-w-0"
                    >
                      <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-yellow-400 font-medium text-xs truncate">WhatsApp</span>
                    </button>
                    
                    {/* X (Twitter) */}
                    <button
                      onClick={() => handleShare("twitter")}
                      className="bg-gray-600/30 hover:bg-gray-600/40 rounded-lg px-2.5 py-2.5 flex items-center gap-2 border border-gray-500/60 hover:border-gray-400 transition-all group w-full min-w-0"
                    >
                      <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                        <Twitter className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-yellow-400 font-medium text-xs truncate">X</span>
                    </button>
                    
                    {/* Telegram */}
                    <button
                      onClick={() => handleShare("telegram")}
                      className="bg-blue-400/20 hover:bg-blue-400/30 rounded-lg px-2.5 py-2.5 flex items-center gap-2 border border-blue-400/60 hover:border-blue-400 transition-all group w-full min-w-0"
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-400 flex items-center justify-center flex-shrink-0">
                        <Send className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-yellow-400 font-medium text-xs truncate">Telegram</span>
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <Lightbulb className="w-4 h-4" />
                    <p>{t("dashboard.inviteTip")}</p>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Matrix View Modal */}
      {address && (
        <MatrixViewModal
          isOpen={showMatrix}
          onClose={() => setShowMatrix(false)}
          walletAddress={address}
        />
      )}

      <Footer />
    </main>
  );
}

