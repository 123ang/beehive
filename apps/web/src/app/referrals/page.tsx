"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import {
  formatNumber,
  shortenAddress,
  copyToClipboard,
  generateReferralLink,
  getLevelColor,
} from "@/lib/utils";
import {
  Wallet,
  Users,
  Copy,
  Check,
  Share2,
  UserPlus,
  Crown,
  TrendingUp,
  Link as LinkIcon,
  QrCode,
  Twitter,
  Send,
} from "lucide-react";
import { QRCodeCanvas } from "@/components/ui/QRCode";

interface Referral {
  id: number;
  walletAddress: string;
  username: string | null;
  currentLevel: number;
  joinedAt: string;
}

interface ReferralData {
  referralCode: string;
  directReferralCount: number;
  directReferrals: Referral[];
}

export default function ReferralsPage() {
  const { isConnected, address } = useAccount();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const referralLink = address ? generateReferralLink(address) : "";

  useEffect(() => {
    if (isConnected && address) {
      fetchReferralData();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const fetchReferralData = async () => {
    setLoading(true);
    const result = await api.getReferral();
    if (result.success && result.data) {
      setData(result.data);
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(
      `Join me on Beehive - the revolutionary Web3 membership platform! 🐝\n\nUnlock 19 levels of rewards and earn BCC tokens.\n\n`
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}`,
      "_blank"
    );
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(
      `Join me on Beehive - the revolutionary Web3 membership platform! 🐝`
    );
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`,
      "_blank"
    );
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
              Connect your wallet to view your referral dashboard and invite
              friends.
            </p>
            <ConnectButton />
          </motion.div>
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">
              <span className="text-white">Invite & </span>
              <span className="text-gradient-gold">Earn</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Share your referral link and earn $100 USDT for every Level 1
              member who joins through your link.
            </p>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-6 text-center">
                <div className="w-14 h-14 rounded-xl bg-honey-500/20 flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-7 h-7 text-honey-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {data?.directReferralCount || 0}
                </div>
                <div className="text-gray-400 text-sm">Direct Referrals</div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6 text-center">
                <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-7 h-7 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  ${formatNumber((data?.directReferralCount || 0) * 100, 0)}
                </div>
                <div className="text-gray-400 text-sm">Total Earned</div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="p-6 text-center">
                <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-7 h-7 text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">$100</div>
                <div className="text-gray-400 text-sm">Per Referral</div>
              </Card>
            </motion.div>
          </div>

          {/* Referral Link Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-honey-500/20 flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-honey-400" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  Your Referral Link
                </h2>
              </div>

              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-honey-500/50"
                />
                <div className="flex gap-2">
                  <Button onClick={handleCopy} className="whitespace-nowrap">
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowQR(!showQR)}
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              <AnimatePresence>
                {showQR && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-center mb-6"
                  >
                    <div className="bg-white p-4 rounded-xl">
                      <QRCodeCanvas value={referralLink} size={180} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Share Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-gray-400 text-sm">Share via:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareTwitter}
                  className="gap-2"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareTelegram}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Telegram
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Direct Referrals List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-honey-400" />
                  <h2 className="text-xl font-bold text-white">
                    Your Direct Referrals
                  </h2>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : !data?.directReferrals?.length ? (
                <div className="p-12 text-center">
                  <Share2 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No referrals yet</p>
                  <p className="text-gray-500 text-sm">
                    Share your link to start earning!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 text-sm border-b border-white/5">
                        <th className="p-4">Member</th>
                        <th className="p-4">Level</th>
                        <th className="p-4">Joined</th>
                        <th className="p-4">Reward</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.directReferrals.map((referral, index) => (
                        <motion.tr
                          key={referral.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-white/5 hover:bg-white/5"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-honey-500/30 to-honey-600/30 flex items-center justify-center">
                                <span className="text-honey-400 font-bold">
                                  {(referral.username || referral.walletAddress)[0].toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-white font-medium">
                                  {referral.username ||
                                    shortenAddress(referral.walletAddress)}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {shortenAddress(referral.walletAddress)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${getLevelColor(referral.currentLevel)}30`,
                                color: getLevelColor(referral.currentLevel),
                              }}
                            >
                              Level {referral.currentLevel}
                            </span>
                          </td>
                          <td className="p-4 text-gray-400 text-sm">
                            {new Date(referral.joinedAt).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <span className="text-green-400 font-medium">
                              $100 USDT
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}



