"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gem, GraduationCap, Compass, Globe } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";

const navItems = [
  { 
    id: "home", 
    labelKey: "nav.main.home", 
    icon: Home, 
    // When connected, Home should point to user dashboard instead of landing page
    href: "/user/dashboard", 
  },
  { 
    id: "nfts", 
    labelKey: "nav.main.nfts", 
    icon: Gem, 
    href: "/nfts" 
  },
  { 
    id: "education", 
    labelKey: "nav.main.education", 
    icon: GraduationCap, 
    href: "/education" 
  },
  { 
    id: "discover", 
    labelKey: "nav.main.discover", 
    icon: Compass, 
    href: "/discover" 
  },
  { 
    id: "hiveworld", 
    labelKey: "nav.main.hiveworld", 
    icon: Globe, 
    href: "/hiveworld" 
  },
];

export function MainNavigation() {
  const { t } = useTranslation();
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-6">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || 
          (item.href === "/" && pathname === "/") ||
          (item.href !== "/" && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              isActive
                ? "text-honey-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <Icon 
              size={20} 
              className={isActive ? "text-honey-400" : "text-gray-400"} 
            />
            <span className="text-sm font-medium">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

