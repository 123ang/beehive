"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";
import { getApiEndpoint } from "@/lib/apiUrl";

interface User {
  id: number;
  walletAddress: string;
  email: string | null;
  name: string | null;
  username: string | null;
  memberId: string | null;
  membershipLevel: number;
  status: string;
  createdAt: Date;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    walletAddress: "",
    username: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    fetchUsers(token);
  }, [router, page, search]);

  const fetchUsers = async (token: string) => {
    try {
      setLoading(true);
      // Query members table instead of users
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const response = await fetch(
        `${getApiEndpoint(`admin/users/members?page=${page}&limit=20${searchParam}`)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch members");
      const result = await response.json();
      // Map members to user format for display
      const mappedUsers = (result.data.members || []).map((member: any) => ({
        id: member.id,
        walletAddress: member.walletAddress,
        email: null,
        name: member.username,
        username: member.username,
        memberId: member.id.toString(),
        membershipLevel: member.currentLevel || 0,
        status: "active",
        createdAt: member.joinedAt,
      }));
      setUsers(mappedUsers);
      setTotalPages(Math.ceil((result.data.total || 0) / 20));
      setTotal(result.data.total || 0);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      walletAddress: user.walletAddress,
      username: user.username || "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const response = await fetch(
        getApiEndpoint(`admin/users/members/${editingUser.id}`),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: editForm.walletAddress,
            username: editForm.username,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update member");
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers(token);
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Failed to update member");
    }
  };

  if (loading && users.length === 0) {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {t("admin.nav.users") || "Manage Users"}
            </h2>
            <p className="text-gray-400 mt-1">Total: {total} users</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by wallet address or member ID..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-honey-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-glass rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Member ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Wallet Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {user.memberId || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                      {user.walletAddress.substring(0, 6)}...
                      {user.walletAddress.substring(38)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {user.username || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      Level {user.membershipLevel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-honey-400 hover:text-honey-300 flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        {t("admin.users.edit") || "Edit"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-glass rounded-xl p-6 border border-white/10 max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold text-white mb-4">
                {t("admin.users.editMember") || "Edit Member"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-white mb-2">
                    {t("admin.users.walletAddress") || "Wallet Address"}
                  </label>
                  <input
                    type="text"
                    value={editForm.walletAddress}
                    onChange={(e) =>
                      setEditForm({ ...editForm, walletAddress: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">
                    {t("admin.users.username") || "Username"}
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm({ ...editForm, username: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
                  >
                    {t("admin.users.save") || "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                    }}
                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg"
                  >
                    {t("admin.users.cancel") || "Cancel"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

