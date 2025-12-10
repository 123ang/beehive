"use client";

import { Home, Sparkles, HelpCircle, GraduationCap, Rocket } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/TranslationProvider";

const navItems = [
  { id: "hero", labelKey: "nav.home", icon: Home, href: "#hero" },
  { id: "features", labelKey: "nav.features", icon: Sparkles, href: "#features" },
  { id: "how-it-works", labelKey: "nav.howItWorks", icon: HelpCircle, href: "#how-it-works" },
  { id: "education", labelKey: "nav.education", icon: GraduationCap, href: "#education" },
  { id: "get-started", labelKey: "nav.getStarted", icon: Rocket, href: "/membership" },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useTranslation();
  
  // Only show on homepage
  if (pathname !== "/") return null;

  const handleClick = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      window.location.href = href;
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-dark-100/95 backdrop-blur-xl border-t border-white/10" />
      
      <div className="relative flex items-center justify-around py-3 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.href)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-white/5 transition-all group"
          >
            <item.icon
              size={20}
              className="text-gray-400 group-hover:text-honey-400 transition-colors"
            />
            <span className="text-xs text-gray-400 group-hover:text-honey-400 transition-colors">
              {t(item.labelKey)}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
