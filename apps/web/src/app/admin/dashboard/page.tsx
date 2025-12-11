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
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useTranslation } from "@/i18n/TranslationProvider";

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

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetchDashboardData(token);
  }, [router]);

  const fetchDashboardData = async (token: string) => {
    try {
      // Use relative path in production (Nginx will proxy), absolute URL in development
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const apiPath = apiUrl ? `${apiUrl}/api/admin/dashboard/overview` : "/api/admin/dashboard/overview";
      const response = await fetch(apiPath,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Check if response is actually JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error(
          `API server returned ${contentType || "unknown format"}. ` +
          `Status: ${response.status}. Make sure the API server is running${apiUrl ? ` on ${apiUrl}` : ""}`
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
      // Don't redirect on error, just show error message
      setLoading(false);
      // You might want to show an error state instead of redirecting
    } finally {
      setLoading(false);
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
            <div className="text-gray-400 text-sm mb-4">
              {t("admin.errors.networkError")}
            </div>
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
                  className={`w-12 h-12 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center`}
                >
                  <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
              <p className="text-white text-3xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

