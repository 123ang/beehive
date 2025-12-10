"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { formatNumber, shortenAddress } from "@/lib/utils";
import {
  Wallet,
  Gift,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Filter,
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
}

export default function RewardsPage() {
  const { isConnected, address } = useAccount();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (isConnected && address) {
      fetchRewards();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const fetchRewards = async () => {
    setLoading(true);
    const result = await api.getRewards();
    if (result.success && result.data) {
      setRewards(result.data.rewards || []);
      setSummary(result.data.summary || null);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "instant":
      case "claimed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "expired":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Gift className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "instant":
      case "claimed":
        return "bg-green-500/20 text-green-400";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "expired":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getRewardTypeLabel = (type: string) => {
    switch (type) {
      case "direct_sponsor":
        return "Direct Sponsor";
      case "layer_payout":
        return "Layer Payout";
      case "bcc_token":
        return "BCC Reward";
      default:
        return type;
    }
  };

  const filteredRewards = rewards.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

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
                Connect your wallet to view your rewards history.
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold font-display">
              <span className="text-gradient-gold">Rewards</span>
              <span className="text-white"> History</span>
            </h1>
            <p className="text-gray-400 mt-2">
              Track all your earnings and pending rewards
            </p>
          </motion.div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-glass rounded-xl p-5"
              >
                <div className="text-gray-400 text-sm mb-1">Direct Sponsor</div>
                <div className="text-2xl font-bold text-white">
                  ${formatNumber(summary.totalDirectSponsor)}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-glass rounded-xl p-5"
              >
                <div className="text-gray-400 text-sm mb-1">Layer Payouts</div>
                <div className="text-2xl font-bold text-white">
                  ${formatNumber(summary.totalLayerPayout)}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-glass rounded-xl p-5"
              >
                <div className="text-gray-400 text-sm mb-1">Pending USDT</div>
                <div className="text-2xl font-bold text-yellow-400">
                  ${formatNumber(summary.pendingUSDT)}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-glass rounded-xl p-5"
              >
                <div className="text-gray-400 text-sm mb-1">BCC Earned</div>
                <div className="text-2xl font-bold text-purple-400">
                  {formatNumber(summary.totalBCC, 0)}
                </div>
              </motion.div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {["all", "instant", "pending", "claimed", "expired"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === f
                    ? "bg-honey-500 text-black"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Rewards Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-glass rounded-xl overflow-hidden"
          >
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : filteredRewards.length === 0 ? (
              <div className="p-8 text-center">
                <Gift className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No rewards found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-gray-400 text-sm font-medium p-4">
                        Type
                      </th>
                      <th className="text-left text-gray-400 text-sm font-medium p-4">
                        Amount
                      </th>
                      <th className="text-left text-gray-400 text-sm font-medium p-4">
                        Status
                      </th>
                      <th className="text-left text-gray-400 text-sm font-medium p-4">
                        Source
                      </th>
                      <th className="text-left text-gray-400 text-sm font-medium p-4">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRewards.map((reward) => (
                      <tr
                        key={reward.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-honey-400" />
                            <span className="text-white">
                              {getRewardTypeLabel(reward.rewardType)}
                            </span>
                            {reward.layerNumber && (
                              <span className="text-xs text-gray-500">
                                (L{reward.layerNumber})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-white font-medium">
                            {reward.currency === "USDT" ? "$" : ""}
                            {formatNumber(reward.amount)}{" "}
                            {reward.currency}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              reward.status
                            )}`}
                          >
                            {getStatusIcon(reward.status)}
                            {reward.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">
                          {reward.sourceWallet
                            ? shortenAddress(reward.sourceWallet)
                            : "-"}
                        </td>
                        <td className="p-4 text-gray-400 text-sm">
                          {new Date(reward.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

