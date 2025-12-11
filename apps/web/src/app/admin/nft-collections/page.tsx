"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";
import { getApiEndpoint } from "@/lib/apiUrl";

interface NFTCollection {
  id: number;
  shortName: string;
  name: string;
  description: string | null;
  bccReward: string | number;
  maxSupply: number;
  minted: number;
  active: boolean;
  createdAt: Date;
}

export default function AdminNFTCollectionsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<NFTCollection | null>(null);
  const [formData, setFormData] = useState({
    shortName: "",
    name: "",
    description: "",
    bccReward: "",
    maxSupply: 1000,
    active: true,
  });

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    fetchCollections(token);
  }, [router]);

  const fetchCollections = async (token: string) => {
    try {
      const response = await fetch(getApiEndpoint("admin/nft-collections"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(t("admin.errors.failedToFetch"));
      const result = await response.json();
      setCollections(result.data || []);
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const url = editingCollection
        ? getApiEndpoint(`admin/nft-collections/${editingCollection.id}`)
        : getApiEndpoint("admin/nft-collections");
      const method = editingCollection ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shortName: formData.shortName,
          name: formData.name,
          description: formData.description,
          bccReward: parseFloat(formData.bccReward.toString()) || 0,
          maxSupply: formData.maxSupply,
          active: formData.active,
        }),
      });

      if (!response.ok) throw new Error(t("admin.errors.failedToSave"));
      setShowModal(false);
      setEditingCollection(null);
      setFormData({
        shortName: "",
        name: "",
        description: "",
        bccReward: "",
        maxSupply: 1000,
        active: true,
      });
      fetchCollections(token);
    } catch (error) {
      console.error("Error saving collection:", error);
      alert(t("admin.errors.failedToSave"));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("admin.confirm.deleteCollection"))) return;
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const response = await fetch(getApiEndpoint(`admin/nft-collections/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(t("admin.errors.failedToDelete"));
      fetchCollections(token);
    } catch (error) {
      console.error("Error deleting collection:", error);
      alert(t("admin.errors.failedToDelete"));
    }
  };

  const handleEdit = (collection: NFTCollection) => {
    setEditingCollection(collection);
    setFormData({
      shortName: collection.shortName,
      name: collection.name,
      description: collection.description || "",
      bccReward: collection.bccReward?.toString() || "",
      maxSupply: collection.maxSupply,
      active: collection.active,
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
            {t("admin.nft.title") || "NFT Collections Management"}
          </h2>
          <button
            onClick={() => {
              setEditingCollection(null);
              setFormData({
                shortName: "",
                name: "",
                description: "",
                bccReward: "",
                maxSupply: 1000,
                active: true,
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
          >
            <Plus className="w-5 h-5" />
            {t("admin.nft.addCollection") || "Add Collection"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="bg-glass rounded-xl p-6 border border-white/10"
            >
              <div className="mb-4">
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  {collection.shortName}
                </span>
                <h3 className="text-xl font-bold text-white mt-1">{collection.name}</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                {collection.description}
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{t("admin.nft.minted")}:</span>
                  <span className="text-white">
                    {collection.minted} / {collection.maxSupply}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Price (BCC):</span>
                  <span className="text-honey-400 font-semibold">
                    {parseFloat(collection.bccReward.toString()).toLocaleString()} BCC
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    collection.active
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {collection.active ? t("admin.admins.status.active") : t("admin.admins.status.inactive")}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(collection)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(collection.id)}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-glass rounded-xl p-6 border border-white/10 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-white mb-4">
                {editingCollection
                  ? t("admin.nft.editCollection") || "Edit Collection"
                  : t("admin.nft.addCollection") || "Add Collection"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-white mb-2">{t("admin.nft.shortName")}</label>
                  <input
                    type="text"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    placeholder={t("admin.nft.shortNamePlaceholder")}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">{t("admin.nft.shortNameHint")}</p>
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.nft.name")}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    placeholder={t("admin.nft.namePlaceholder")}
                    required
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.nft.description")}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    rows={4}
                    placeholder={t("admin.nft.descriptionPlaceholder")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white mb-2">{t("admin.nft.maxSupply")}</label>
                    <input
                      type="number"
                      value={formData.maxSupply}
                      onChange={(e) =>
                        setFormData({ ...formData, maxSupply: parseInt(e.target.value) || 1000 })
                      }
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                      required
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-2">{t("admin.nft.priceBcc")}</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.bccReward}
                      onChange={(e) => setFormData({ ...formData, bccReward: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                      placeholder="0.0"
                      required
                      min={0}
                    />
                  </div>
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
                    {t("admin.nft.active")}
                  </label>
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
                  >
                    {editingCollection ? t("admin.messages.update") : t("admin.messages.create")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingCollection(null);
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

