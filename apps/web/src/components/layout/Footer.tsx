"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";
import { api } from "@/lib/api";

export function Footer({ hideSubscription = false }: { hideSubscription?: boolean }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form after 5 seconds when subscribed
  useEffect(() => {
    if (subscribed || alreadySubscribed) {
      const timer = setTimeout(() => {
        setSubscribed(false);
        setAlreadySubscribed(false);
        setEmail("");
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [subscribed, alreadySubscribed]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubscribing(true);
    setError(null);

    try {
      const response = await api.subscribeNewsletter(email);
      
      if (response.success) {
        // Check if it's an already subscribed response
        if ((response as any).alreadySubscribed) {
          setAlreadySubscribed(true);
        } else {
          setSubscribed(true);
        }
        setEmail("");
      } else {
        setError(response.error || "Failed to subscribe. Please try again.");
      }
    } catch (err: any) {
      console.error("Subscription error:", err);
      setError("Failed to subscribe. Please try again later.");
    } finally {
      setIsSubscribing(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const socialLinks = [
    { icon: "🐦", href: "https://twitter.com/beehive", label: "Twitter" },
    { icon: "💬", href: "https://t.me/beehive", label: "Telegram" },
    { icon: "📱", href: "https://tiktok.com/@beehive", label: "TikTok" },
    { icon: "🎥", href: "https://youtube.com/@beehive", label: "YouTube" },
  ];

  return (
    <footer className="relative border-t border-white/5" id="footer">
      <div className="absolute inset-0 bg-dark-200/50 backdrop-blur-sm" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stay Updated - One Row */}
        {!hideSubscription && (
        <div className="mb-12">
          <h3 className="text-xl font-bold text-white mb-4 font-display text-center">
            {t("footer.stayUpdated")}
          </h3>
          <p className="text-white text-sm mb-4 text-center">
            {t("footer.subscribeText")}
          </p>
          
          <form onSubmit={handleSubscribe} className="max-w-md mx-auto space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("footer.emailPlaceholder")}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border.white/10 text-white placeholder-gray-500 focus:outline-none focus:border-honey-500/50 focus:ring-1 focus:ring-honey-500/50 transition-all"
                disabled={isSubscribing || subscribed || alreadySubscribed}
              />
              <button
                type="submit"
                disabled={isSubscribing || subscribed || alreadySubscribed || !email}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-honey-500 to-honey-600 text-black font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubscribing ? "..." : (subscribed || alreadySubscribed) ? "✓" : t("footer.subscribeButton")}
              </button>
            </div>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm text-center"
              >
                {error}
              </motion.p>
            )}
            {subscribed && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-green-400 text-sm text-center"
              >
                {t("footer.subscribedThankYou")}
              </motion.p>
            )}
            {alreadySubscribed && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-yellow-400 text-sm text-center"
              >
                {t("footer.alreadySubscribed")}
              </motion.p>
            )}
            <p className="text-white text-xs text-center">
              {t("footer.privacy")}
            </p>
          </form>
        </div>
        )}

        {/* Follow Us and Back to Top */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          {/* Social Links */}
          <div className="flex items-center gap-4">
            <span className="text-white font-semibold">{t("footer.followUs")}</span>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-honey-500/20 border border-white/10 hover:border-honey-500/30 flex items-center justify-center text-xl transition-all hover:scale-110"
                  title={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Back to Top */}
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all group"
          >
            <span>{t("footer.backToTop")}</span>
            <ArrowUp
              size={18}
              className="group-hover:-translate-y-1 transition-transform"
            />
            <span>⬆️</span>
          </button>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            {t("footer.copyright")}
          </p>
          <Link
            href="/admin/login"
            className="text-gray-500 hover:text-honey-400 text-sm transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
