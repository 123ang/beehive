"use client";

import { motion } from "framer-motion";
import { Crown, Star, Gem, Award } from "lucide-react";
import { MEMBERSHIP_LEVELS } from "@beehive/shared";
import { getLevelColor, formatNumber } from "@/lib/utils";
import Link from "next/link";
import { useTranslation } from "@/i18n/TranslationProvider";

const levelIcons: Record<number, React.ReactNode> = {
  1: <Award className="w-5 h-5" />,
  5: <Star className="w-5 h-5" />,
  10: <Gem className="w-5 h-5" />,
  15: <Crown className="w-5 h-5" />,
  19: <Crown className="w-5 h-5" />,
};

export function LevelsSection() {
  const { t } = useTranslation();
  // Show first 6 levels as preview
  const previewLevels = MEMBERSHIP_LEVELS.slice(0, 6);

  return (
    <section className="relative py-24 overflow-hidden" id="levels-section">
      <div className="absolute inset-0 bg-glow-gold" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-display">
            <span className="text-white">19 </span>
            <span className="text-gradient-gold">{t("levels.heading").replace("19 ", "")}</span>
          </h2>
          <p className="text-white text-lg max-w-2xl mx-auto">
            {t("levels.subheading")}
          </p>
        </motion.div>

        {/* Level Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {previewLevels.map((level, index) => (
            <motion.div
              key={level.level}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="level-card group"
            >
              {/* Level Badge */}
              <div
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: getLevelColor(level.level) }}
              >
                {level.level}
              </div>

              {/* Content */}
              <div className="p-6">
                <div
                  className="w-12 h-12 hexagon flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${getLevelColor(level.level)}30` }}
                >
                  <span style={{ color: getLevelColor(level.level) }}>
                    {levelIcons[level.level] || <Star className="w-5 h-5" />}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-4">
                  {(() => {
                    const translationKey = `levels.${level.level}`;
                    const translated = t(translationKey);
                    // If translation returns the key itself, use fallback
                    return translated === translationKey 
                      ? (level.nameCn || level.name)
                      : translated;
                  })()}
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm">{t("levels.price")}</span>
                    <span className="text-white font-semibold">
                      ${formatNumber(level.priceUSDT, 0)} USDT
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm">{t("levels.bccReward")}</span>
                    <span className="text-honey-400 font-semibold">
                      {formatNumber(level.bccReward, 0)} BCC
                    </span>
                  </div>
                </div>

                {/* Hover Effect Line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
                  style={{ backgroundColor: getLevelColor(level.level) }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-12"
        >
          <Link
            href="/membership"
            className="inline-flex items-center gap-2 text-honey-400 hover:text-honey-300 font-medium transition-colors"
          >
            {t("levels.viewAll")}
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
