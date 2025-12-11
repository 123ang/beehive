"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, Calendar, ArrowRight } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";
import { getApiEndpoint } from "@/lib/apiUrl";

interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  content: string;
  publishedAt: string;
}

export function NewsSection() {
  const { lang } = useTranslation();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, [lang]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${getApiEndpoint(`members/news?lang=${lang}`)}`
      );
      const data = await response.json();
      if (data.success) {
        setNews(data.data.slice(0, 6)); // Show latest 6 articles
      }
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-glass rounded-2xl p-8 border border-white/10">
        <div className="animate-pulse">
          <div className="h-6 bg-white/10 rounded w-32 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-glass rounded-2xl p-8 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-honey-500/20 flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-honey-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Company News</h2>
        </div>
      </div>

      {/* News List */}
      {news.length === 0 ? (
        <div className="text-center py-12">
          <Newspaper className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No news articles yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {news.map((article, index) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-honey-500/50 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-2 group-hover:text-honey-400 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                    {article.content.replace(/<[^>]*>/g, "").substring(0, 150)}...
                  </p>
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-honey-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

