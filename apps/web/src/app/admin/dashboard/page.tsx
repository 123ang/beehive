"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  DollarSign,
  Gift,
  TrendingUp,
  UserPlus,
  Activity,
  RefreshCw,
  BarChart3,
  PieChart,
  AlertTriangle,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useTranslation } from "@/i18n/TranslationProvider";
import { formatNumber, getLevelColor } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface DashboardData {
  userMetrics: {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    usersByLevel: Record<number, number>;
  };
  revenueMetrics: {
    totalEarnings: number;
    earningsThisMonth: number;
    arpu: number;
  };
  rewardsMetrics: {
    totalRewardsReleased: number;
    rewardsThisMonth: number;
    pendingRewards: number;
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "rewards">("overview");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetchDashboardData(token);
  }, [router]);


  const getApiEndpoint = (path: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return apiUrl ? `${apiUrl}/api/${path}` : `/api/${path}`;
  };

  const fetchDashboardData = async (token: string) => {
    try {
      const apiPath = getApiEndpoint("admin/dashboard/overview");
      const response = await fetch(apiPath, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error(
          `API server returned ${contentType || "unknown format"}. ` +
          `Status: ${response.status}. Make sure the API server is running`
        );
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch dashboard data`);
      }

      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      fetchDashboardData(token);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-white text-xl mb-2">{t("admin.dashboard.loading")}</div>
            <div className="text-gray-400 text-sm">{t("admin.dashboard.pleaseWait")}</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <div className="text-red-400 text-xl mb-4">{t("admin.errors.failedToFetch")}</div>
            <div className="text-gray-400 text-sm mb-4">{t("admin.errors.networkError")}</div>
            <button
              onClick={() => {
                const token = localStorage.getItem("adminToken");
                if (token) {
                  fetchDashboardData(token);
                } else {
                  router.push("/admin/login");
                }
              }}
              className="px-4 py-2 rounded-lg bg-honey-500 hover:bg-honey-600 text-black font-semibold"
            >
              {t("admin.dashboard.retry")}
            </button>
            <button
              onClick={() => router.push("/admin/login")}
              className="ml-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            >
              {t("admin.dashboard.backToLogin")}
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Convert usersByLevel to array format for level distribution
  const levelDistribution = Object.entries(data.userMetrics.usersByLevel || {})
    .map(([level, count]) => ({
      level: parseInt(level) || 0,
      count: count as number,
    }))
    .sort((a, b) => a.level - b.level);

  const stats = [
    {
      label: t("admin.dashboard.totalUsers"),
      value: data?.userMetrics.totalUsers || 0,
      icon: Users,
      color: "blue",
    },
    {
      label: t("admin.dashboard.newUsers"),
      value: data?.userMetrics.newUsers || 0,
      icon: UserPlus,
      color: "green",
    },
    {
      label: t("admin.dashboard.activeUsers"),
      value: data?.userMetrics.activeUsers || 0,
      icon: Activity,
      color: "purple",
    },
    {
      label: t("admin.dashboard.totalRevenue"),
      value: `$${(data?.revenueMetrics.totalEarnings || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "yellow",
    },
    {
      label: t("admin.dashboard.revenueThisMonth"),
      value: `$${(data?.revenueMetrics.earningsThisMonth || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: "green",
    },
    {
      label: t("admin.dashboard.totalRewards"),
      value: (data?.rewardsMetrics.totalRewardsReleased || 0).toLocaleString(),
      icon: Gift,
      color: "honey",
    },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              <span className="text-gradient-gold">{t("admin.title")}</span>
              <span className="text-white"> {t("admin.dashboard.title") || "Dashboard"}</span>
            </h1>
            <p className="text-gray-400">{t("admin.dashboard.subtitle") || "Manage platform members and rewards"}</p>
          </div>
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {t("admin.dashboard.refresh") || "Refresh"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "overview", label: t("admin.dashboard.tab.overview") || "Overview", icon: BarChart3 },
            { id: "rewards", label: t("admin.dashboard.tab.rewards") || "Rewards", icon: DollarSign },
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
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-glass rounded-xl p-6 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        stat.color === "blue" ? "bg-blue-500/20" :
                        stat.color === "green" ? "bg-green-500/20" :
                        stat.color === "purple" ? "bg-purple-500/20" :
                        stat.color === "yellow" ? "bg-yellow-500/20" :
                        "bg-honey-500/20"
                      }`}
                    >
                      <stat.icon className={`w-6 h-6 ${
                        stat.color === "blue" ? "text-blue-400" :
                        stat.color === "green" ? "text-green-400" :
                        stat.color === "purple" ? "text-purple-400" :
                        stat.color === "yellow" ? "text-yellow-400" :
                        "text-honey-400"
                      }`} />
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                  <p className="text-white text-3xl font-bold">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-gray-400 text-sm">{t("admin.dashboard.pendingRewards")}</span>
                </div>
                <div className="text-3xl font-bold text-yellow-400">
                  {formatNumber(data.rewardsMetrics.pendingRewards, 0)} BCC
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-gray-400 text-sm">{t("admin.dashboard.arpu")}</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  ${formatNumber(data.revenueMetrics.arpu, 2)}
                </div>
              </Card>
            </div>

            {/* Level Distribution */}
            {levelDistribution.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-honey-400" />
                  {t("admin.dashboard.levelDistribution") || "Level Distribution"}
                </h3>
                <div className="space-y-3">
                  {levelDistribution.map(({ level, count }) => {
                    const maxCount = Math.max(...levelDistribution.map((d) => d.count));
                    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

                    return (
                      <div key={level} className="flex items-center gap-4">
                        <div className="w-20 text-sm text-gray-400">{t("admin.dashboard.level") || "Level"} {level}</div>
                        <div className="flex-1 h-8 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: level * 0.05 }}
                            className="h-full rounded-full flex items-center px-3"
                            style={{ backgroundColor: getLevelColor(level) }}
                          >
                            <span className="text-xs font-semibold text-black">{count}</span>
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* Rewards Tab */}
        {activeTab === "rewards" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Reward Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 text-center">
                <div className="text-gray-400 text-sm mb-2">{t("admin.dashboard.rewards.totalDistributed") || "Total Distributed"}</div>
                <div className="text-2xl font-bold text-green-400">
                  {formatNumber(data.rewardsMetrics.totalRewardsReleased, 0)} BCC
                </div>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-gray-400 text-sm mb-2">{t("admin.dashboard.rewards.thisMonth") || "This Month"}</div>
                <div className="text-2xl font-bold text-blue-400">
                  {formatNumber(data.rewardsMetrics.rewardsThisMonth, 0)} BCC
                </div>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-gray-400 text-sm mb-2">{t("admin.dashboard.pendingRewards")}</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {formatNumber(data.rewardsMetrics.pendingRewards, 0)} BCC
                </div>
              </Card>
            </div>

            {/* Reward Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">{t("admin.dashboard.rewards.management") || "Reward Management"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="secondary"
                  className="justify-start"
                  onClick={() => router.push("/admin/users")}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  {t("admin.dashboard.rewards.viewDetails") || "View Reward Details"}
                </Button>
                <Button
                  variant="secondary"
                  className="justify-start"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("admin.dashboard.rewards.refreshData") || "Refresh Data"}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

      </div>
    </AdminLayout>
  );
}
