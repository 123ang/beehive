"use client";

import { useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Upload,
  FileText,
  Store,
  GraduationCap,
  Image,
  LogOut,
  Globe,
  Shield,
} from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";

interface AdminLayoutProps {
  children: ReactNode;
}

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh-CN", name: "简体中文", flag: "🇨🇳" },
  { code: "zh-TW", name: "繁體中文", flag: "🇭🇰" },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang, t } = useTranslation();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    router.push("/admin/login");
  };

  const navItems = [
    {
      label: t("admin.nav.dashboard") || "Dashboard",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
    },
    {
      label: t("admin.nav.users") || "Manage Users",
      icon: Users,
      path: "/admin/users",
    },
    {
      label: t("admin.nav.bulkImport") || "Bulk Import",
      icon: Upload,
      path: "/admin/users/import",
    },
    {
      label: t("admin.nav.news") || "News Management",
      icon: FileText,
      path: "/admin/news",
    },
    {
      label: t("admin.nav.merchants") || "Merchants",
      icon: Store,
      path: "/admin/merchants",
    },
    {
      label: t("admin.nav.classes") || "Classes",
      icon: GraduationCap,
      path: "/admin/classes",
    },
    {
      label: t("admin.nav.nftCollections") || "NFT Collections",
      icon: Image,
      path: "/admin/nft-collections",
    },
    {
      label: t("admin.nav.admins") || "Admin Management",
      icon: Shield,
      path: "/admin/admins",
    },
  ];

  const currentLang = languages.find((l) => l.code === lang) || languages[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex">
      {/* Sidebar - Fixed on Left */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-glass border-r border-white/10 flex-shrink-0 z-30">
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">
              {t("admin.title") || "Admin Panel"}
            </h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    isActive
                      ? "bg-honey-500/20 text-honey-400 border border-honey-500/30"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Language Switcher */}
          <div className="p-4 border-t border-white/10">
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                <Globe className="w-5 h-5" />
                <span className="font-medium flex-1 text-left">
                  {currentLang.flag} {currentLang.name}
                </span>
              </button>
              {langMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setLangMenuOpen(false)}
                  />
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-glass border border-white/10 rounded-lg overflow-hidden z-20">
                    {languages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => {
                          setLang(language.code as any);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          lang === language.code
                            ? "bg-honey-500/20 text-honey-400"
                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span>{language.flag}</span>
                        <span>{language.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Logout Button */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">{t("admin.nav.logout") || "Logout"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content - Offset for Fixed Sidebar */}
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        {/* Top Header */}
        <div className="bg-glass border-b border-white/10">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">
                {navItems.find((item) => item.path === pathname)?.label || "Dashboard"}
              </h1>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

