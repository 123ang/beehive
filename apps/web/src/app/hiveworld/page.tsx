"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { api } from "@/lib/api";
import { useTranslation } from "@/i18n/TranslationProvider";
import { Wallet, Globe, Newspaper, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

interface NewsArticle {
  id: number;
  slug: string;
  status: string;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  title: string;
  description?: string | null;
  content: string;
  language: string;
}

export default function HiveworldPage() {
  const { isConnected, address } = useAccount();
  const { t, lang } = useTranslation();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, [lang]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const result = await api.getNews(lang);
      if (result.success && result.data) {
        setArticles(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch news:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(lang === "zh" ? "zh-CN" : lang === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    // Strip HTML tags for preview
    const textContent = content.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    if (textContent.length <= maxLength) return textContent;
    return textContent.substring(0, maxLength) + "...";
  };

  // Not connected state
  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
        <Header />
        <section className="pt-28 pb-16 min-h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-glass rounded-2xl p-12 max-w-md mx-auto"
            >
              <div className="w-20 h-20 rounded-full bg-honey-500/20 flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-10 h-10 text-honey-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                {t("hiveworld.connectWallet") || "Connect Your Wallet"}
              </h2>
              <p className="text-gray-400 mb-6">
                {t("hiveworld.connectWalletDesc") || "Connect your wallet to view news and updates"}
              </p>
              <ConnectButton />
            </motion.div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      <Header />

      <section className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold font-display">
              <span className="text-gradient-gold">{t("hiveworld.title") || "Hiveworld"}</span>
            </h1>
            <p className="text-gray-400 mt-2">
              {t("hiveworld.subtitle") || "Stay updated with the latest news and announcements"}
            </p>
          </motion.div>

          {/* News Articles */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                {t("hiveworld.noNews") || "No news articles available"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {articles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-glass rounded-xl overflow-hidden border border-gray-700/30 hover:border-yellow-500/50 transition-all"
                >
                  <Link href={`/hiveworld/${article.id}`}>
                    <div className="p-6 cursor-pointer">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-white mb-2 hover:text-yellow-400 transition-colors">
                            {article.title}
                          </h3>
                          <div className="flex items-center gap-4 text-gray-400 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(article.publishedAt || article.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <Newspaper className="w-8 h-8 text-yellow-400/50 flex-shrink-0" />
                      </div>

                      {(article.description || article.content) && (
                        <p className="text-gray-400 mb-4 line-clamp-3">
                          {article.description 
                            ? truncateContent(article.description, 200)
                            : truncateContent(article.content)}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors">
                        <span className="text-sm font-medium">
                          {t("hiveworld.readMore") || "Read More"}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

