"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslation } from "@/i18n/TranslationProvider";

const stats = [
  { icon: "🏆", value: "19", labelKey: "cta.stat.membershipLevels" },
  { icon: "🕸️", value: "3×3", labelKey: "cta.stat.matrixSystem" },
  { icon: "🚀", value: "∞%", labelKey: "cta.stat.earningPotential" },
];

export function CTASection() {
  const { t } = useTranslation();

  return (
    <section className="relative py-24 overflow-hidden" id="education">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-honey-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-honey-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Ready to Join the Hive? CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="gradient-border p-12 md:p-16 text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6 font-display">
            <span className="text-white">{t("cta.heading").split(" ")[0]} </span>
            <span className="text-gradient-gold">{t("cta.heading").split(" ").slice(1).join(" ")}</span>
          </h2>
          
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            {t("cta.subheading")}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-10">
            {stats.map((stat) => (
              <div key={stat.labelKey} className="text-center">
                <div className="text-3xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-bold text-honey-400">{stat.value}</div>
                <div className="text-sm text-gray-500">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>

          {/* Join Button → Registration */}
          <div className="flex items-center justify-center">
            <Link href="/register">
              <button className="px-10 py-5 rounded-xl bg-gradient-to-r from-honey-500 to-honey-600 text-black font-bold text-xl hover:scale-105 transition-transform flex items-center gap-2">
                <span>⚡</span>
                <span>{t("cta.button.startJourney")}</span>
              </button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-honey-400">100%</div>
              <div className="text-sm text-gray-500">{t("cta.trust.onChain")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-honey-400">
                {t("cta.trust.instant")}
              </div>
              <div className="text-sm text-gray-500">{t("cta.trust.rewards")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-honey-400">NFT</div>
              <div className="text-sm text-gray-500">{t("cta.trust.nftOwnership")}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
