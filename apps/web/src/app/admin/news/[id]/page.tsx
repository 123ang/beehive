"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Save, ArrowLeft } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";
import { getApiEndpoint } from "@/lib/apiUrl";
import { LANGUAGES, type LanguageCode } from "@/i18n/translations";

interface NewsTranslation {
  title: string;
  description?: string;
  content: string;
}

export default function AdminNewsEditPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const articleId = parseInt(params.id as string);
  const [currentLang, setCurrentLang] = useState<LanguageCode>("en");
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    slug: "",
    status: "draft",
    translations: {
      en: { title: "", description: "", content: "" },
      "zh-CN": { title: "", description: "", content: "" },
      "zh-TW": { title: "", description: "", content: "" },
      ja: { title: "", description: "", content: "" },
      ko: { title: "", description: "", content: "" },
      th: { title: "", description: "", content: "" },
      ms: { title: "", description: "", content: "" },
    } as Record<string, NewsTranslation>,
  });
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const fetchArticle = async (token: string) => {
    try {
      const response = await fetch(getApiEndpoint(`admin/news/${articleId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(t("admin.errors.failedToFetch"));
      const result = await response.json();
      const article = result.data;

      setFormData({
        slug: article.slug,
        status: article.status,
        translations: {
          en: { title: "", content: "" },
          "zh-CN": { title: "", content: "" },
          "zh-TW": { title: "", content: "" },
          ja: { title: "", content: "" },
          ko: { title: "", content: "" },
          th: { title: "", content: "" },
          ms: { title: "", content: "" },
          ...(article.translations || {}),
        },
      });
    } catch (error) {
      console.error("Error fetching article:", error);
      alert(t("admin.errors.failedToFetch"));
      router.push("/admin/news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    fetchArticle(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, articleId]);

  // Set content when language changes (using key prop forces remount, so we set content after)
  useEffect(() => {
    if (contentEditableRef.current && !loading) {
      const content = formData.translations[currentLang]?.content || "";
      contentEditableRef.current.innerHTML = content;
      // Place cursor at end if there's content
      if (content) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(contentEditableRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLang, loading]);

  const handleSave = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setSaving(true);

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
      alert(t("admin.messages.pleaseProvideSlug"));
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(getApiEndpoint(`admin/news/${articleId}`), {
        method: "PUT",
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

      if (!response.ok) throw new Error(t("admin.errors.failedToSave"));
      
      // Stay on page so user can continue editing other languages
      // Optionally show a subtle success indicator (could be a toast notification)
    } catch (error) {
      console.error("Error saving article:", error);
      alert(t("admin.errors.failedToSave"));
    } finally {
      setSaving(false);
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
      <style dangerouslySetInnerHTML={{
        __html: `
          select {
            color: white !important;
          }
          select option {
            background-color: #1f2937 !important;
            color: white !important;
          }
          select option:checked {
            background-color: #fbbf24 !important;
            color: #000000 !important;
          }
        `
      }} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/admin/news")}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-white">
            {t("admin.news.editArticle")}
          </h2>
        </div>

        {/* Toolbar */}
        <div className="bg-glass border border-white/10 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder={t("admin.news.slugPlaceholder")}
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400"
            />
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            >
              <option value="draft">{t("admin.news.status.draft")}</option>
              <option value="published">{t("admin.news.status.published")}</option>
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? t("admin.errors.loading") : t("admin.news.save")}
          </button>
        </div>

        {/* Editor Content */}
        <div className="bg-glass border border-white/10 rounded-xl overflow-hidden">
          {/* Language Tabs */}
          <div className="border-b border-white/10 p-2 flex gap-1 overflow-x-auto">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
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
                  setCurrentLang(lang.code);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  currentLang === lang.code
                    ? "bg-honey-500 text-black"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="mr-2">{lang.flag}</span>
                {lang.name}
              </button>
            ))}
          </div>
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("admin.news.titleLabel")}
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
                placeholder={t("admin.news.enterTitle")}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("admin.news.descriptionLabel")}
              </label>
              <textarea
                value={formData.translations[currentLang]?.description || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    translations: {
                      ...formData.translations,
                      [currentLang]: {
                        ...formData.translations[currentLang],
                        description: e.target.value,
                      },
                    },
                  })
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 min-h-[100px]"
                placeholder={t("admin.news.enterDescription") || "Enter a brief description (optional)"}
              />
            </div>

            {/* Rich Text Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t("admin.news.contentLabel")}
              </label>
              <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                {/* Toolbar */}
                <div className="border-b border-gray-300 p-2 flex gap-2 bg-gray-100">
                  <button
                    type="button"
                    onClick={() => document.execCommand("bold", false)}
                    className="px-3 py-1 bg-white hover:bg-gray-200 rounded text-gray-800 text-sm font-bold border border-gray-300"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => document.execCommand("italic", false)}
                    className="px-3 py-1 bg-white hover:bg-gray-200 rounded text-gray-800 text-sm italic border border-gray-300"
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => document.execCommand("underline", false)}
                    className="px-3 py-1 bg-white hover:bg-gray-200 rounded text-gray-800 text-sm underline border border-gray-300"
                    title="Underline"
                  >
                    U
                  </button>
                  <div className="w-px bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => document.execCommand("formatBlock", false, "h2")}
                    className="px-3 py-1 bg-white hover:bg-gray-200 rounded text-gray-800 text-sm border border-gray-300"
                    title="Heading"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => document.execCommand("formatBlock", false, "p")}
                    className="px-3 py-1 bg-white hover:bg-gray-200 rounded text-gray-800 text-sm border border-gray-300"
                    title="Paragraph"
                  >
                    P
                  </button>
                  <div className="w-px bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => document.execCommand("insertUnorderedList", false)}
                    className="px-3 py-1 bg-white hover:bg-gray-200 rounded text-gray-800 text-sm border border-gray-300"
                    title="Bullet List"
                  >
                    •
                  </button>
                  <button
                    type="button"
                    onClick={() => document.execCommand("insertOrderedList", false)}
                    className="px-3 py-1 bg-white hover:bg-gray-200 rounded text-gray-800 text-sm border border-gray-300"
                    title="Numbered List"
                  >
                    1.
                  </button>
                  <div className="w-px bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt("Enter image URL:");
                      if (url) {
                        document.execCommand("insertImage", false, url);
                      }
                    }}
                    className="px-3 py-1 bg-white hover:bg-gray-200 rounded text-gray-800 text-sm border border-gray-300"
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
                    className="px-3 py-1 bg-white hover:bg-gray-200 rounded text-gray-800 text-sm border border-gray-300"
                    title="Insert Link"
                  >
                    🔗
                  </button>
                </div>
                {/* Content Editable Area */}
                <div
                  key={currentLang}
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
                  className="min-h-[500px] p-6 bg-white text-gray-900 focus:outline-none [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-gray-900 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:text-gray-900 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:text-gray-900 [&_p]:mb-4 [&_p]:text-gray-900 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:mb-2 [&_li]:text-gray-900 [&_a]:text-blue-600 [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4"
                  style={{
                    color: "#111827",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

