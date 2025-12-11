"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";
import { getApiEndpoint } from "@/lib/apiUrl";

interface Merchant {
  id: number;
  name: string;
  description: string | null;
  logoUrl: string | null;
  merchantPageUrl: string | null;
  category: string | null;
  active: boolean;
  createdAt: Date;
}

export default function AdminMerchantsPage() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logoUrl: "",
    merchantPageUrl: "",
    category: "",
    active: true,
  });

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    fetchMerchants(token);
  }, [router]);

  const fetchMerchants = async (token: string) => {
    try {
      const response = await fetch(getApiEndpoint("admin/merchants"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(t("admin.errors.failedToFetch"));
      const result = await response.json();
      setMerchants(result.data || []);
    } catch (error) {
      console.error("Error fetching merchants:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const url = editingMerchant
        ? getApiEndpoint(`admin/merchants/${editingMerchant.id}`)
        : getApiEndpoint("admin/merchants");
      const method = editingMerchant ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(t("admin.errors.failedToSave"));
      setShowModal(false);
      setEditingMerchant(null);
      setFormData({
        name: "",
        description: "",
        logoUrl: "",
        merchantPageUrl: "",
        category: "",
        active: true,
      });
      fetchMerchants(token);
    } catch (error) {
      console.error("Error saving merchant:", error);
      alert(t("admin.errors.failedToSave"));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("admin.confirm.deleteMerchant"))) return;
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const response = await fetch(getApiEndpoint(`admin/merchants/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(t("admin.errors.failedToDelete"));
      fetchMerchants(token);
    } catch (error) {
      console.error("Error deleting merchant:", error);
      alert(t("admin.errors.failedToDelete"));
    }
  };

  const handleEdit = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setFormData({
      name: merchant.name,
      description: merchant.description || "",
      logoUrl: merchant.logoUrl || "",
      merchantPageUrl: merchant.merchantPageUrl || "",
      category: merchant.category || "",
      active: merchant.active,
    });
    setShowModal(true);
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {t("admin.nav.merchants") || "Merchants Management"}
          </h2>
          <button
            onClick={() => {
              setEditingMerchant(null);
              setFormData({
                name: "",
                description: "",
                logoUrl: "",
                merchantPageUrl: "",
                category: "",
                active: true,
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
          >
            <Plus className="w-5 h-5" />
            {t("admin.merchants.addMerchant")}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {merchants.map((merchant) => (
            <div
              key={merchant.id}
              className="bg-glass rounded-xl p-6 border border-white/10"
            >
              {merchant.logoUrl && (
                <img
                  src={merchant.logoUrl}
                  alt={merchant.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <h3 className="text-xl font-bold text-white mb-2">{merchant.name}</h3>
              <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                {merchant.description}
              </p>
              {merchant.category && (
                <span className="inline-block px-2 py-1 bg-white/5 rounded text-xs text-gray-400 mb-4">
                  {merchant.category}
                </span>
              )}
              <div className="flex items-center justify-between mt-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    merchant.active
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {merchant.active 
                    ? (lang === "zh-CN" || lang === "zh-TW" 
                        ? (lang === "zh-CN" ? "活跃" : "活躍") 
                        : "Active")
                    : (lang === "zh-CN" || lang === "zh-TW" 
                        ? (lang === "zh-CN" ? "未启用" : "未啟用") 
                        : "Inactive")}
                </span>
                <div className="flex gap-2">
                  {merchant.merchantPageUrl && (
                    <a
                      href={merchant.merchantPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleEdit(merchant)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(merchant.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-glass rounded-xl border border-white/10 max-w-2xl w-full my-auto max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-white/10 flex-shrink-0">
                <h3 className="text-2xl font-bold text-white">
                  {editingMerchant ? t("admin.merchants.editMerchant") : t("admin.merchants.addMerchant")}
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-white mb-2">{t("admin.merchants.merchantName")}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.merchants.description")}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.merchants.logoUrl")}</label>
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.merchants.merchantPageUrl")}</label>
                  <input
                    type="url"
                    value={formData.merchantPageUrl}
                    onChange={(e) => setFormData({ ...formData, merchantPageUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.merchants.category")}</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="active" className="text-white">
                    {t("admin.merchants.active")}
                  </label>
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
                  >
                    {editingMerchant ? t("admin.messages.update") : t("admin.messages.create")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingMerchant(null);
                    }}
                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg"
                  >
                    {t("admin.users.cancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

