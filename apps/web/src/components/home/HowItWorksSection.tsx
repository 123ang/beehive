"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslation } from "@/i18n/TranslationProvider";

const steps = [
  {
    number: "1",
    icon: "🔗",
    titleKey: "how.step1.title",
    descriptionKey: "how.step1.desc",
  },
  {
    number: "2",
    icon: "🎯",
    titleKey: "how.step2.title",
    descriptionKey: "how.step2.desc",
  },
  {
    number: "3",
    icon: "🚀",
    titleKey: "how.step3.title",
    descriptionKey: "how.step3.desc",
  },
];

export function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    <section className="relative py-24 overflow-hidden" id="how-it-works">
      <div className="absolute inset-0 bg-dark-200/30" />

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
            <span className="text-white">{t("how.heading").split(" ")[0]} </span>
            <span className="text-gradient-gold">{t("how.heading").split(" ").slice(1).join(" ")}</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {t("how.subheading")}
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <motion.div
              key={step.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              <div className="bg-glass rounded-2xl p-8 text-center h-full transition-all duration-300 hover:bg.white/10">
                {/* Step Number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-honey-500 flex items-center justify-center text-black font-bold">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="text-5xl mb-4 mt-4">
                  {step.icon}
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-3">
                  {t(step.titleKey)}
                </h3>
                <p className="text-gray-400">
                  {t(step.descriptionKey)}
                </p>
              </div>

              {/* Connector Line (except last item) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-honey-500 to-transparent" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Matrix Explanation Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-glass rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">🕸️</div>
            <h3 className="text-2xl font-bold text-white mb-3 font-display">
              {t("how.matrixCard.title")}
            </h3>
            <p className="text-gray-400 mb-6">
              {t("how.matrixCard.desc")}
            </p>
            <Link href="/matrix-explanation">
              <button className="px-6 py-3 rounded-xl bg-honey-500/20 text-honey-400 font-semibold hover:bg-honey-500/30 transition-colors border border-honey-500/30">
                {t("how.matrixCard.button")}
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
