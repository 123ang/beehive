"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { shortenAddress, copyToClipboard, getLevelColor } from "@/lib/utils";
import { MEMBERSHIP_LEVELS } from "@beehive/shared";
import {
  Wallet,
  User,
  Copy,
  Check,
  Settings,
  LogOut,
  Shield,
  Globe,
  Bell,
  ExternalLink,
  Crown,
  Award,
  Star,
} from "lucide-react";

export default function ProfilePage() {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "settings">("profile");

  useEffect(() => {
    if (isConnected && address) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const fetchUserData = async () => {
    setLoading(true);
    const [userResult, dashboardResult] = await Promise.all([
      api.getMe(),
      api.getDashboard(),
    ]);

    if (userResult.success && userResult.data) {
      setUser(userResult.data);
    }
    if (dashboardResult.success && dashboardResult.data) {
      setMember(dashboardResult.data);
    }
    setLoading(false);
  };

  const handleCopyAddress = async () => {
    if (!address) return;
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    api.setToken(null);
  };

  // Not connected state
  if (!isConnected) {
    return (
      <main className="min-h-screen">
        <Header />
        <section className="pt-28 pb-16 min-h-[80vh] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-glass rounded-2xl p-12 max-w-md mx-auto text-center"
          >
            <div className="w-20 h-20 rounded-full bg-honey-500/20 flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-honey-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-400 mb-6">
              Connect your wallet to view and manage your profile.
            </p>
            <ConnectButton />
          </motion.div>
        </section>
        <Footer />
      </main>
    );
  }

  const currentLevel = member?.currentLevel || 0;
  const levelInfo = MEMBERSHIP_LEVELS.find((l) => l.level === currentLevel);

  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${getLevelColor(currentLevel)}50, ${getLevelColor(currentLevel)}20)`,
                      color: getLevelColor(currentLevel),
                    }}
                  >
                    {currentLevel > 0 ? (
                      <Crown className="w-10 h-10" />
                    ) : (
                      <User className="w-10 h-10" />
                    )}
                  </div>
                  {currentLevel > 0 && (
                    <div
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-dark-100"
                      style={{ backgroundColor: getLevelColor(currentLevel) }}
                    >
                      {currentLevel}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {user?.username || "Beehive Member"}
                  </h1>
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                    <span className="text-gray-400 font-mono text-sm">
                      {shortenAddress(address || "")}
                    </span>
                    <button
                      onClick={handleCopyAddress}
                      className="text-gray-500 hover:text-honey-400 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`https://arbiscan.io/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-honey-400 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  {currentLevel > 0 && levelInfo && (
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${getLevelColor(currentLevel)}20`,
                        color: getLevelColor(currentLevel),
                      }}
                    >
                      <Award className="w-4 h-4" />
                      {levelInfo.name}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleDisconnect}>
                    <LogOut className="w-4 h-4" />
                    Disconnect
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "profile"
                  ? "bg-honey-500 text-black"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "settings"
                  ? "bg-honey-500 text-black"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Membership Status */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-honey-400" />
                  Membership Status
                </h3>
                {currentLevel > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                      <span className="text-gray-400">Current Level</span>
                      <span className="text-white font-semibold">
                        Level {currentLevel} - {levelInfo?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                      <span className="text-gray-400">Member Since</span>
                      <span className="text-white">
                        {member?.joinedAt
                          ? new Date(member.joinedAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                      <span className="text-gray-400">Direct Referrals</span>
                      <span className="text-white font-semibold">
                        {member?.directReferrals || 0}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">
                      You haven't joined Beehive yet
                    </p>
                    <Button onClick={() => (window.location.href = "/membership")}>
                      View Membership Levels
                    </Button>
                  </div>
                )}
              </Card>

              {/* NFT Badges */}
              {currentLevel > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-honey-400" />
                    Your NFT Badges
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {MEMBERSHIP_LEVELS.slice(0, currentLevel).map((level) => (
                      <motion.div
                        key={level.level}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: level.level * 0.05 }}
                        className="relative group"
                      >
                        <div
                          className="w-16 h-16 hexagon flex items-center justify-center text-lg font-bold cursor-pointer transition-transform hover:scale-110"
                          style={{
                            backgroundColor: getLevelColor(level.level),
                          }}
                        >
                          {level.level}
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-dark-100 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {level.name}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Display Settings */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-honey-400" />
                  Display Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                    <div>
                      <span className="text-white">Language</span>
                      <p className="text-gray-500 text-sm">
                        Select your preferred language
                      </p>
                    </div>
                    <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-honey-500/50">
                      <option value="en">English</option>
                      <option value="zh">中文</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Notifications */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-honey-400" />
                  Notifications
                </h3>
                <div className="space-y-4">
                  <label className="flex justify-between items-center p-4 bg-white/5 rounded-lg cursor-pointer">
                    <div>
                      <span className="text-white">Reward Notifications</span>
                      <p className="text-gray-500 text-sm">
                        Get notified when you receive rewards
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 rounded accent-honey-500"
                    />
                  </label>
                  <label className="flex justify-between items-center p-4 bg-white/5 rounded-lg cursor-pointer">
                    <div>
                      <span className="text-white">Referral Notifications</span>
                      <p className="text-gray-500 text-sm">
                        Get notified when someone joins through your link
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 rounded accent-honey-500"
                    />
                  </label>
                </div>
              </Card>

              {/* Security */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-honey-400" />
                  Security
                </h3>
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Wallet Connected</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Your wallet is securely connected. All transactions require
                    your signature.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}



