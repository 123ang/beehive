"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslation } from "@/i18n/TranslationProvider";

const stats = [
  { labelKey: "hero.stat.membershipLevels", value: "19" },
  { labelKey: "hero.stat.matrixSystem", value: "3×3" },
  { labelKey: "hero.stat.nftMarketplace", value: "💎" },
];

const featureCards = [
  {
    icon: "🔗",
    titleKey: "hero.card.smartContracts.title",
    descKey: "hero.card.smartContracts.desc",
  },
  {
    icon: "💎",
    titleKey: "hero.card.nftMarketplace.title",
    descKey: "hero.card.nftMarketplace.desc",
  },
  {
    icon: "🎯",
    titleKey: "hero.card.matrixRewards.title",
    descKey: "hero.card.matrixRewards.desc",
  },
  {
    icon: "💰",
    titleKey: "hero.card.earnPassiveIncome.title",
    descKey: "hero.card.earnPassiveIncome.desc",
    link: "/membership",
    linkTextKey: "hero.card.viewLevels",
  },
];

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden pt-20" id="hero">
      {/* Animated Background */}
      <div className="absolute inset-0 honeycomb-bg" />
      
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-honey-500/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-honey-600/15 rounded-full blur-[120px]" />

      {/* Floating Hexagons */}
      <motion.div
        className="absolute top-20 right-20 w-20 h-20 hexagon bg-honey-500/10 backdrop-blur-sm hidden md:block"
        animate={{
          y: [0, -20, 0],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-40 left-20 w-16 h-16 hexagon bg-honey-400/10 backdrop-blur-sm hidden md:block"
        animate={{
          y: [0, 20, 0],
          rotate: [0, -180, -360],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Main Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 font-display">
            <span className="text-white">{t("hero.heading").split(" ")[0]} </span>
            <span className="text-gradient-gold">{t("hero.heading").split(" ").slice(1).join(" ")}</span>
          </h1>
          <p className="text-white text-lg md:text-xl max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-6 mb-8"
        >
          {stats.map((stat) => (
            <div key={stat.labelKey} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-honey-400">{stat.value}</div>
              <div className="text-sm text-white">{t(stat.labelKey)}</div>
            </div>
          ))}
        </motion.div>

        {/* Get Started Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <Link href="/membership">
            <button className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-honey-500 to-honey-600 text-black font-bold text-xl shadow-lg hover:shadow-honey-500/30 transition-all duration-300 hover:scale-105">
              <span className="flex items-center gap-3">
                <span>🚀</span>
                <span>{t("hero.getStarted")}</span>
                <span>⚡</span>
              </span>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-honey-400 to-honey-500 opacity-0 group-hover:opacity-50 blur-xl transition-opacity" />
            </button>
          </Link>
        </motion.div>

        {/* Feature Cards: Smart Contracts, NFT Marketplace, Matrix Rewards, Earn Passive Income */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-5xl mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureCards.map((card, index) => (
              <div
                key={card.titleKey}
                className="bg-glass rounded-xl p-6 text-center transition-all duration-300 hover:bg-white/10"
              >
                <div className="text-4xl mb-3">{card.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{t(card.titleKey)}</h3>
                <p className="text-white text-sm mb-3">{t(card.descKey)}</p>
                {card.link && (
                  <Link href={card.link}>
                    <button className="text-honey-400 text-sm font-medium hover:text-honey-300 transition-colors">
                      {t(card.linkTextKey || "hero.card.viewLevels")}
                    </button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Join CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 text-center"
        >
          <Link href="/membership">
            <button className="group px-8 py-4 rounded-xl bg-gradient-to-r from-honey-600 to-amber-500 text-black font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-honey-500/30">
              <span className="flex items-center gap-2">
                <span>⚡</span>
                <span>{t("hero.joinNow")}</span>
              </span>
            </button>
          </Link>
          <p className="mt-4 text-white flex items-center justify-center gap-2">
            <span>🎆</span>
            <span>{t("hero.joinNow.subtitle")}</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
