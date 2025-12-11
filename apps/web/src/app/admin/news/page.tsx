"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";
import { getApiEndpoint } from "@/lib/apiUrl";

interface NewsArticle {
  id: number;
  slug: string;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  translations?: Record<string, { title: string; content: string }>;
}

export default function AdminNewsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    fetchArticles(token);
  }, [router]);

  const fetchArticles = async (token: string) => {
    try {
      const response = await fetch(getApiEndpoint("admin/news"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(t("admin.errors.failedToFetch"));
      const result = await response.json();
      const mappedArticles = (result.data || []).map((article: any) => ({
        id: article.id,
        slug: article.slug,
        status: article.status,
        publishedAt: article.publishedAt,
        createdAt: article.createdAt,
        translations: article.translations || {},
      }));
      setArticles(mappedArticles);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("admin.confirm.deleteArticle"))) return;
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const response = await fetch(getApiEndpoint(`admin/news/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(t("admin.errors.failedToDelete"));
      fetchArticles(token);
    } catch (error) {
      console.error("Error deleting article:", error);
      alert(t("admin.errors.failedToDelete"));
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white">{t("admin.errors.loading")}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {t("admin.news.title")}
          </h2>
          <button
            onClick={() => router.push("/admin/news/new")}
            className="flex items-center gap-2 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
          >
            <Plus className="w-5 h-5" />
            {t("admin.news.addArticle")}
          </button>
        </div>

        {/* Articles Table */}
        {articles.length === 0 ? (
          <div className="bg-glass rounded-xl p-12 border border-white/10 text-center">
            <p className="text-gray-400 mb-4">{t("admin.news.noArticlesFound")}</p>
            <button
              onClick={() => router.push("/admin/news/new")}
              className="flex items-center gap-2 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg mx-auto"
            >
              <Plus className="w-5 h-5" />
              {t("admin.news.addArticle")}
            </button>
          </div>
        ) : (
          <div className="bg-glass rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    {t("admin.news.articleTitle")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    {t("admin.news.slug")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    {t("admin.news.status")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    {t("admin.news.created")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    {t("admin.news.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {articles.map((article) => {
                  const title = article.translations?.en?.title || 
                               article.translations?.["zh-CN"]?.title || 
                               article.translations?.["zh-TW"]?.title || 
                               article.slug;
                  return (
                    <tr key={article.id} className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-400 text-sm font-mono">{article.slug}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            article.status === "published"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {article.status === "published" 
                            ? t("admin.news.status.published")
                            : t("admin.news.status.draft")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-400 text-sm">
                          {new Date(article.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/admin/news/${article.id}`)}
                            className="text-honey-400 hover:text-honey-300"
                            title={t("admin.news.editArticle")}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="text-red-400 hover:text-red-300"
                            title={t("admin.news.deleteConfirm")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
