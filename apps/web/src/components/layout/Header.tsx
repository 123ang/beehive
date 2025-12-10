"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { LANGUAGES } from "@/i18n/translations";
import { useTranslation } from "@/i18n/TranslationProvider";

export function Header() {
  const { lang, setLang, t } = useTranslation();
  const [isLangOpen, setIsLangOpen] = useState(false);

  const languages = LANGUAGES;
  const currentLang = languages.find((l) => l.code === lang) ?? languages[0];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-dark-100/80 backdrop-blur-xl border-b border-white/5" />
      
      <nav className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <motion.div
              className="relative w-10 h-10"
              whileHover={{ scale: 1.05, rotate: 30 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Hexagon logo */}
              <div className="absolute inset-0 hexagon bg-gradient-to-br from-honey-400 to-honey-600" />
              <div className="absolute inset-1 hexagon bg-dark-100 flex items-center justify-center">
                <span className="text-honey-400 font-bold text-lg">🐝</span>
              </div>
            </motion.div>
            <span className="text-xl md:text-2xl font-bold text-gradient-gold font-display">
              Beehive
            </span>
          </Link>

          {/* Right side - Language & Connect */}
          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              >
                <span className="text-lg">{currentLang.flag}</span>
                <span className="text-sm text-gray-300 hidden sm:inline">
                  {currentLang.name}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${
                    isLangOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown */}
              {isLangOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-40 bg-dark-100/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl overflow-hidden z-50"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLang(lang.code);
                        setIsLangOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors ${
                        currentLang.code === lang.code
                          ? "bg-honey-500/10 text-honey-400"
                          : "text-gray-300"
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm">{lang.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Mobile Language Button */}
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="sm:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <span className="text-lg">{currentLang.flag}</span>
            </button>

            {/* Connect Wallet Button */}
            <ConnectButton
              label={t("header.connectWallet")}
              chainStatus="none"
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
              showBalance={false}
            />
          </div>
        </div>
      </nav>

      {/* Click outside to close dropdown */}
      {isLangOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsLangOpen(false)}
        />
      )}
    </header>
  );
}
