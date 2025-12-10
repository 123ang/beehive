"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatNumber, shortenAddress, getLevelColor } from "@/lib/utils";
import {
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  RefreshCw,
  Search,
  ChevronDown,
  Shield,
  AlertTriangle,
  BarChart3,
  PieChart,
} from "lucide-react";

// Mock admin check - replace with actual admin verification
const ADMIN_WALLETS = ["0x...your-admin-wallet"];

interface PlatformStats {
  totalMembers: number;
  totalUsers: number;
  rewards: {
    totalUSDT: string;
    pendingUSDT: string;
    claimedUSDT: string;
  };
  levelDistribution: { level: number; count: number }[];
}

export default function AdminPage() {
  const { isConnected, address } = useAccount();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "rewards">(
    "overview"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // For demo purposes, allow any connected wallet
  const isAdmin = isConnected; // Replace with actual admin check

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchAdminData = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock data
    setStats({
      totalMembers: 1247,
      totalUsers: 3891,
      rewards: {
        totalUSDT: "156780",
        pendingUSDT: "12450",
        claimedUSDT: "144330",
      },
      levelDistribution: [
        { level: 1, count: 450 },
        { level: 2, count: 320 },
        { level: 3, count: 210 },
        { level: 4, count: 120 },
        { level: 5, count: 67 },
        { level: 6, count: 40 },
        { level: 7, count: 20 },
        { level: 8, count: 10 },
        { level: 9, count: 5 },
        { level: 10, count: 3 },
        { level: 11, count: 2 },
      ],
    });

    setMembers([
      {
        id: 1,
        walletAddress: "0x1234...5678",
        currentLevel: 5,
        totalInflow: "650",
        directSponsorCount: 12,
        joinedAt: "2024-01-15",
      },
      {
        id: 2,
        walletAddress: "0x2345...6789",
        currentLevel: 3,
        totalInflow: "350",
        directSponsorCount: 5,
        joinedAt: "2024-01-18",
      },
      {
        id: 3,
        walletAddress: "0x3456...7890",
        currentLevel: 7,
        totalInflow: "1050",
        directSponsorCount: 28,
        joinedAt: "2024-01-10",
      },
    ]);

    setLoading(false);
  };

  // Not admin state
  if (!isAdmin) {
    return (
      <main className="min-h-screen">
        <Header />
        <section className="pt-28 pb-16 min-h-[80vh] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-glass rounded-2xl p-12 max-w-md mx-auto text-center"
          >
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Admin Access Required
            </h2>
            <p className="text-gray-400 mb-6">
              You need admin privileges to access this page.
            </p>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-4xl font-bold font-display"
              >
                <span className="text-gradient-gold">Admin</span>
                <span className="text-white"> Dashboard</span>
              </motion.h1>
              <p className="text-gray-400 mt-2">
                Manage platform members and rewards
              </p>
            </div>
            <Button onClick={fetchAdminData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "members", label: "Members", icon: Users },
              { id: "rewards", label: "Rewards", icon: DollarSign },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === id
                    ? "bg-honey-500 text-black"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-honey-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-honey-400" />
                    </div>
                    <span className="text-gray-400 text-sm">Total Members</span>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {formatNumber(stats.totalMembers, 0)}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-gray-400 text-sm">Total Users</span>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {formatNumber(stats.totalUsers, 0)}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-gray-400 text-sm">Total Rewards</span>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    ${formatNumber(stats.rewards.totalUSDT)}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    </div>
                    <span className="text-gray-400 text-sm">Pending Rewards</span>
                  </div>
                  <div className="text-3xl font-bold text-yellow-400">
                    ${formatNumber(stats.rewards.pendingUSDT)}
                  </div>
                </Card>
              </div>

              {/* Level Distribution */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-honey-400" />
                  Level Distribution
                </h3>
                <div className="space-y-3">
                  {stats.levelDistribution.map(({ level, count }) => {
                    const maxCount = Math.max(
                      ...stats.levelDistribution.map((d) => d.count)
                    );
                    const percentage = (count / maxCount) * 100;

                    return (
                      <div key={level} className="flex items-center gap-4">
                        <div className="w-20 text-sm text-gray-400">
                          Level {level}
                        </div>
                        <div className="flex-1 h-8 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: level * 0.05 }}
                            className="h-full rounded-full flex items-center px-3"
                            style={{ backgroundColor: getLevelColor(level) }}
                          >
                            <span className="text-xs font-semibold text-black">
                              {count}
                            </span>
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Members Tab */}
          {activeTab === "members" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Search */}
              <Card className="p-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by wallet address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-honey-500/50"
                  />
                </div>
              </Card>

              {/* Members Table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-gray-400 text-sm font-medium p-4">
                          Member
                        </th>
                        <th className="text-left text-gray-400 text-sm font-medium p-4">
                          Level
                        </th>
                        <th className="text-left text-gray-400 text-sm font-medium p-4">
                          Total Invested
                        </th>
                        <th className="text-left text-gray-400 text-sm font-medium p-4">
                          Referrals
                        </th>
                        <th className="text-left text-gray-400 text-sm font-medium p-4">
                          Joined
                        </th>
                        <th className="text-left text-gray-400 text-sm font-medium p-4">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr
                          key={member.id}
                          className="border-b border-white/5 hover:bg-white/5"
                        >
                          <td className="p-4">
                            <span className="text-white font-mono text-sm">
                              {member.walletAddress}
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${getLevelColor(member.currentLevel)}30`,
                                color: getLevelColor(member.currentLevel),
                              }}
                            >
                              Level {member.currentLevel}
                            </span>
                          </td>
                          <td className="p-4 text-white">
                            ${formatNumber(member.totalInflow)}
                          </td>
                          <td className="p-4 text-white">
                            {member.directSponsorCount}
                          </td>
                          <td className="p-4 text-gray-400">
                            {member.joinedAt}
                          </td>
                          <td className="p-4">
                            <Button variant="ghost" size="sm">
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Rewards Tab */}
          {activeTab === "rewards" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Reward Actions */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Reward Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="secondary" className="justify-start">
                    <DollarSign className="w-4 h-4" />
                    Distribute Rewards
                  </Button>
                  <Button variant="secondary" className="justify-start">
                    <RefreshCw className="w-4 h-4" />
                    Process Expired
                  </Button>
                </div>
              </Card>

              {/* Reward Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 text-center">
                  <div className="text-gray-400 text-sm mb-2">Total Distributed</div>
                  <div className="text-2xl font-bold text-green-400">
                    ${formatNumber(stats?.rewards.totalUSDT || "0")}
                  </div>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-gray-400 text-sm mb-2">Pending</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    ${formatNumber(stats?.rewards.pendingUSDT || "0")}
                  </div>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-gray-400 text-sm mb-2">Claimed</div>
                  <div className="text-2xl font-bold text-white">
                    ${formatNumber(stats?.rewards.claimedUSDT || "0")}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}



