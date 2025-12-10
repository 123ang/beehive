"use client";

import { motion } from "framer-motion";
import { Shield, Network, GraduationCap, Gem, Coins, Gift } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";

const features = [
  {
    icon: <Shield className="w-6 h-6" />,
    titleKey: "features.web3Membership.title",
    descriptionKey: "features.web3Membership.desc",
    badgeKey: "features.web3Membership.badge",
  },
  {
    icon: <Network className="w-6 h-6" />,
    titleKey: "features.matrix.title",
    descriptionKey: "features.matrix.desc",
    badgeKey: "features.matrix.badge",
  },
  {
    icon: <GraduationCap className="w-6 h-6" />,
    titleKey: "features.learnEarn.title",
    descriptionKey: "features.learnEarn.desc",
    badgeKey: "features.learnEarn.badge",
  },
  {
    icon: <Gem className="w-6 h-6" />,
    titleKey: "features.nftMarketplace.title",
    descriptionKey: "features.nftMarketplace.desc",
    badgeKey: "features.nftMarketplace.badge",
  },
  {
    icon: <Coins className="w-6 h-6" />,
    titleKey: "features.bccRewards.title",
    descriptionKey: "features.bccRewards.desc",
    badgeKey: "features.bccRewards.badge",
  },
  {
    icon: <Gift className="w-6 h-6" />,
    titleKey: "features.smartRewards.title",
    descriptionKey: "features.smartRewards.desc",
    badgeKey: "features.smartRewards.badge",
  },
];

export function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section className="relative py-24 bg-dark-200/50" id="features-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-display">
            <span className="text-white">{t("features.heading").split(" ")[0]} </span>
            <span className="text-gradient-gold">{t("features.heading").split(" ").slice(1).join(" ")}</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            {t("features.subheading")}
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-glass rounded-2xl p-8 h-full transition-all duration-300 hover:bg-white/10 hover:shadow-glow-sm relative overflow-hidden">
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-honey-500/20 to-honey-600/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-honey-400">{feature.icon}</span>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-3">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  {t(feature.descriptionKey)}
                </p>

                {/* Badge */}
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-honey-500/10 border border-honey-500/30">
                  <span className="text-honey-400 text-sm font-medium">
                    {t(feature.badgeKey)}
                  </span>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-honey-500/0 to-honey-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
