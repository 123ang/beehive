"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useTranslation } from "@/i18n/TranslationProvider";
import { ArrowLeft, Calendar, Newspaper } from "lucide-react";

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

export default function NewsArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchArticle(Number(params.id));
    }
  }, [params.id, lang]);

  const fetchArticle = async (id: number) => {
    setLoading(true);
    try {
      const result = await api.getNewsArticle(id, lang);
      if (result.success && result.data) {
        setArticle(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch article:", error);
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      <Header />

      <section className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            onClick={() => router.back()}
            className="mb-6 bg-gray-800 hover:bg-gray-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("hiveworld.back") || "Back"}
          </Button>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
          ) : !article ? (
            <div className="text-center py-12">
              <Newspaper className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                {t("hiveworld.articleNotFound") || "Article not found"}
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-glass rounded-xl p-8 border border-gray-700/30"
            >
              <div className="flex items-center gap-2 mb-4 text-gray-400 text-sm">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(article.publishedAt || article.createdAt)}</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
                {article.title}
              </h1>

              <div
                className="prose prose-invert max-w-none text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

