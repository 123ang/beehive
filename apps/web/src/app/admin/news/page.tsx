"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Edit, Trash2, Eye, X, Save, EyeOff } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";

interface NewsArticle {
  id: number;
  slug: string;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  translations?: Record<string, { title: string; content: string }>;
}

interface NewsTranslation {
  title: string;
  content: string;
}

export default function AdminNewsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [currentLang, setCurrentLang] = useState<"en" | "zh-CN" | "zh-TW">("en");
  const [formData, setFormData] = useState({
    slug: "",
    status: "draft",
    translations: {
      en: { title: "", content: "" },
      "zh-CN": { title: "", content: "" },
      "zh-TW": { title: "", content: "" },
    } as Record<string, NewsTranslation>,
  });
  const contentEditableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    fetchArticles(token);
  }, [router]);

  // Update contentEditable when language changes
  useEffect(() => {
    if (contentEditableRef.current && (editingArticle || !articles.length)) {
      const content = formData.translations[currentLang]?.content || "";
      contentEditableRef.current.innerHTML = content || "<p class='text-gray-500'>Start typing your content here...</p>";
    }
  }, [currentLang, editingArticle]);

  const fetchArticles = async (token: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/admin/news`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch news");
      const result = await response.json();
      // Map the data to match our interface
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

  const handleSave = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    // Get content from contentEditable div
    if (contentEditableRef.current) {
      const content = contentEditableRef.current.innerHTML;
      setFormData((prev) => ({
        ...prev,
        translations: {
          ...prev.translations,
          [currentLang]: {
            ...prev.translations[currentLang],
            content,
          },
        },
      }));
    }

    // Auto-generate slug from title if not provided
    let slug = formData.slug;
    if (!slug && formData.translations.en?.title) {
      slug = formData.translations.en.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
    if (!slug) {
      alert("Please provide a slug or title");
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const url = editingArticle
        ? `${apiUrl}/api/admin/news/${editingArticle.id}`
        : `${apiUrl}/api/admin/news`;
      const method = editingArticle ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: slug,
          status: formData.status,
          translations: formData.translations,
        }),
      });

      if (!response.ok) throw new Error("Failed to save article");
      setEditingArticle(null);
      setFormData({
        slug: "",
        status: "draft",
        translations: {
          en: { title: "", content: "" },
          "zh-CN": { title: "", content: "" },
          "zh-TW": { title: "", content: "" },
        },
      });
      fetchArticles(token);
    } catch (error) {
      console.error("Error saving article:", error);
      alert("Failed to save article");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/admin/news/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete article");
      fetchArticles(token);
    } catch (error) {
      console.error("Error deleting article:", error);
      alert("Failed to delete article");
    }
  };

  const handleEdit = (article: NewsArticle) => {
    setEditingArticle(article);
    setFormData({
      slug: article.slug,
      status: article.status,
      translations: article.translations || {
        en: { title: "", content: "" },
        "zh-CN": { title: "", content: "" },
        "zh-TW": { title: "", content: "" },
      },
    });
    setCurrentLang("en");
    // Set content in contentEditable after a brief delay to ensure DOM is ready
    setTimeout(() => {
      if (contentEditableRef.current) {
        const content = article.translations?.en?.content || article.translations?.["zh-CN"]?.content || "";
        contentEditableRef.current.innerHTML = content;
      }
    }, 100);
  };

  const handleNewArticle = () => {
    setEditingArticle(null);
    setFormData({
      slug: "",
      status: "draft",
      translations: {
        en: { title: "", content: "" },
        "zh-CN": { title: "", content: "" },
        "zh-TW": { title: "", content: "" },
      },
    });
    setCurrentLang("en");
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-80px)]">
        {/* Articles List Sidebar */}
        <div className="w-80 bg-glass border-r border-white/10 overflow-y-auto">
          <div className="p-4 border-b border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {t("admin.nav.news") || "News Articles"}
              </h2>
              <button
                onClick={handleNewArticle}
                className="p-2 bg-honey-500 hover:bg-honey-600 text-black rounded-lg"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-2 space-y-2">
            {articles.map((article) => {
              const title = article.translations?.en?.title || article.translations?.["zh-CN"]?.title || article.slug;
              return (
                <div
                  key={article.id}
                  className={`p-3 rounded-lg transition-colors ${
                    editingArticle?.id === article.id
                      ? "bg-honey-500/20 border border-honey-500/30"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div
                    onClick={() => handleEdit(article)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-semibold text-white line-clamp-2 flex-1">
                        {title}
                      </h3>
                      <span
                        className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${
                          article.status === "published"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {article.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(article.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(article.id);
                      }}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {editingArticle || !articles.length ? (
            <>
              {/* Toolbar */}
              <div className="bg-glass border-b border-white/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    placeholder="Article slug (e.g., welcome-to-beehive)"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400"
                  />
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                      {(["en", "zh-CN", "zh-TW"] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            // Save current content before switching
                            if (contentEditableRef.current) {
                              const currentContent = contentEditableRef.current.innerHTML;
                              setFormData((prev) => ({
                                ...prev,
                                translations: {
                                  ...prev.translations,
                                  [currentLang]: {
                                    ...prev.translations[currentLang],
                                    content: currentContent,
                                  },
                                },
                              }));
                            }
                            setCurrentLang(lang);
                          }}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            currentLang === lang
                              ? "bg-honey-500 text-black"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          {lang === "en" ? "EN" : lang === "zh-CN" ? "简体" : "繁體"}
                        </button>
                      ))}
                    </div>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  {editingArticle && (
                    <button
                      onClick={() => {
                        setEditingArticle(null);
                        handleNewArticle();
                      }}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Title ({currentLang})
                    </label>
                    <input
                      type="text"
                      value={formData.translations[currentLang]?.title || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          translations: {
                            ...formData.translations,
                            [currentLang]: {
                              ...formData.translations[currentLang],
                              title: e.target.value,
                            },
                          },
                        })
                      }
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-2xl font-bold"
                      placeholder="Enter article title..."
                    />
                  </div>

                  {/* Rich Text Editor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Content ({currentLang})
                    </label>
                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                      {/* Toolbar */}
                      <div className="border-b border-white/10 p-2 flex gap-2 bg-white/5">
                        <button
                          type="button"
                          onClick={() => document.execCommand("bold", false)}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-white text-sm font-bold"
                          title="Bold"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand("italic", false)}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-white text-sm italic"
                          title="Italic"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand("underline", false)}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-white text-sm underline"
                          title="Underline"
                        >
                          U
                        </button>
                        <div className="w-px bg-white/20 mx-1" />
                        <button
                          type="button"
                          onClick={() => document.execCommand("formatBlock", false, "h2")}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-white text-sm"
                          title="Heading"
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand("formatBlock", false, "p")}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-white text-sm"
                          title="Paragraph"
                        >
                          P
                        </button>
                        <div className="w-px bg-white/20 mx-1" />
                        <button
                          type="button"
                          onClick={() => document.execCommand("insertUnorderedList", false)}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-white text-sm"
                          title="Bullet List"
                        >
                          •
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand("insertOrderedList", false)}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-white text-sm"
                          title="Numbered List"
                        >
                          1.
                        </button>
                        <div className="w-px bg-white/20 mx-1" />
                        <button
                          type="button"
                          onClick={() => {
                            const url = prompt("Enter image URL:");
                            if (url) {
                              document.execCommand("insertImage", false, url);
                            }
                          }}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-white text-sm"
                          title="Insert Image"
                        >
                          🖼️
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const url = prompt("Enter link URL:");
                            if (url) {
                              document.execCommand("createLink", false, url);
                            }
                          }}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-white text-sm"
                          title="Insert Link"
                        >
                          🔗
                        </button>
                      </div>
                      {/* Content Editable Area */}
                      <div
                        ref={contentEditableRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={(e) => {
                          const content = e.currentTarget.innerHTML;
                          setFormData((prev) => ({
                            ...prev,
                            translations: {
                              ...prev.translations,
                              [currentLang]: {
                                ...prev.translations[currentLang],
                                content,
                              },
                            },
                          }));
                        }}
                        className="min-h-[500px] p-6 text-white focus:outline-none [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:mb-2 [&_a]:text-honey-400 [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4"
                        style={{
                          color: "white",
                        }}
                      >
                        {formData.translations[currentLang]?.content ? (
                          <div dangerouslySetInnerHTML={{ __html: formData.translations[currentLang].content }} />
                        ) : (
                          <p className="text-gray-500">Start typing your content here...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400 mb-4">Select an article to edit or create a new one</p>
                <button
                  onClick={handleNewArticle}
                  className="flex items-center gap-2 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Create New Article
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

