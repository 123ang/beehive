"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Edit, ChevronLeft, ChevronRight, Network, X, User as UserIcon, Users } from "lucide-react";
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

interface MatrixMember {
  id: number;
  walletAddress: string;
  username: string | null;
  currentLevel: number | null;
}

interface MatrixChild {
  position: number;
  member: MatrixMember | null;
}

interface MatrixInfo {
  member: MatrixMember;
  isRoot: boolean;
  sponsor: MatrixMember | null;
  sponsorPosition: number | null;
  children: MatrixChild[];
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { t, lang } = useTranslation();
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
  });
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [matrixInfo, setMatrixInfo] = useState<MatrixInfo | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

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
        `${getApiEndpoint(`admin/users/members?page=${page}&limit=10${searchParam}`)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error(t("admin.errors.failedToFetch"));
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
      setTotalPages(Math.ceil((result.data.total || 0) / 10));
      setTotal(result.data.total || 0);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page when searching
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      walletAddress: user.walletAddress,
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
          }),
        }
      );

      if (!response.ok) throw new Error(t("admin.errors.failedToUpdate"));
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers(token);
    } catch (error) {
      console.error("Error updating member:", error);
      alert(t("admin.errors.failedToUpdate"));
    }
  };

  const handleViewMatrix = async (userId: number) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setLoadingMatrix(true);
    setShowMatrixModal(true);
    setMatrixInfo(null);

    try {
      const response = await fetch(
        getApiEndpoint(`admin/users/members/${userId}/matrix`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch matrix info");
      const result = await response.json();
      setMatrixInfo(result.data);
    } catch (error) {
      console.error("Error fetching matrix:", error);
      alert(t("admin.errors.failedToFetch"));
      setShowMatrixModal(false);
    } finally {
      setLoadingMatrix(false);
    }
  };

  if (loading && users.length === 0) {
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
          <div>
            <h2 className="text-2xl font-bold text-white">
              {t("admin.nav.users") || "Manage Users"}
            </h2>
            <p className="text-gray-400 mt-1">{t("admin.users.totalUsers").replace("{count}", total.toString())}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t("admin.users.searchPlaceholder")}
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
                    {t("admin.users.memberId")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {t("admin.users.walletAddress")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {t("admin.users.level")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {t("admin.users.status")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {t("admin.users.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      {t("admin.users.noUsersFound")}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {user.memberId || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-mono break-all">
                        {user.walletAddress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {user.membershipLevel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.status === "active"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {user.status === "active" && (lang === "zh-CN" || lang === "zh-TW")
                          ? lang === "zh-CN" ? "活跃" : "活躍"
                          : user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleViewMatrix(user.id)}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            title={t("admin.users.viewMatrix") || "View Matrix"}
                          >
                            <Network className="w-4 h-4" />
                            {t("admin.users.matrix") || "Matrix"}
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-honey-400 hover:text-honey-300 flex items-center gap-1"
                          >
                            <Edit className="w-4 h-4" />
                            {t("admin.users.edit") || "Edit"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {t("admin.users.page").replace("{current}", page.toString()).replace("{total}", totalPages.toString())}
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

        {/* Matrix Modal */}
        {showMatrixModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-glass rounded-xl p-6 border border-white/10 max-w-2xl w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">
                  {t("admin.users.matrixView") || "Matrix View"}
                </h3>
                <button
                  onClick={() => setShowMatrixModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {loadingMatrix ? (
                <div className="text-center py-8">
                  <div className="text-white">{t("admin.errors.loading")}</div>
                </div>
              ) : matrixInfo ? (
                <div className="space-y-6">
                  {/* Sponsor (if not root) */}
                  {!matrixInfo.isRoot && matrixInfo.sponsor ? (
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        {t("admin.users.sponsor") || "Sponsor"} ({t("admin.users.position") || "Position"}: {matrixInfo.sponsorPosition})
                      </h4>
                      <div
                        className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 cursor-pointer hover:bg-blue-500/20 transition-colors"
                        onClick={() => handleViewMatrix(matrixInfo.sponsor!.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-semibold">
                              ID: {matrixInfo.sponsor.id}
                            </p>
                            <p className="text-sm text-gray-400 font-mono break-all">
                              {matrixInfo.sponsor.walletAddress}
                            </p>
                          </div>
                          <div className="text-sm text-blue-400">
                            Level {matrixInfo.sponsor.currentLevel || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-green-400 font-semibold">{t("admin.users.rootMember") || "Root Member"}</p>
                      <p className="text-sm text-gray-400">{t("admin.users.noSponsor") || "This member has no sponsor"}</p>
                    </div>
                  )}

                  {/* Current Member */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      {t("admin.users.currentMember") || "Current Member"}
                    </h4>
                    <div className="bg-honey-500/20 border border-honey-500/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold">
                            ID: {matrixInfo.member.id}
                          </p>
                          <p className="text-sm text-gray-400 font-mono break-all">
                            {matrixInfo.member.walletAddress}
                          </p>
                        </div>
                        <div className="text-sm text-honey-400">
                          Level {matrixInfo.member.currentLevel || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Children (3 positions) */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {t("admin.users.downlines") || "Downlines"} (3x3 Matrix)
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {matrixInfo.children.map((child) => (
                        <div
                          key={child.position}
                          className={`rounded-lg p-4 text-center ${
                            child.member
                              ? "bg-white/10 border border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
                              : "bg-white/5 border border-dashed border-white/10"
                          }`}
                          onClick={() => child.member && handleViewMatrix(child.member.id)}
                        >
                          <p className="text-xs text-gray-500 mb-2">
                            {t("admin.users.position") || "Position"} {child.position}
                          </p>
                          {child.member ? (
                            <>
                              <p className="text-white font-semibold text-sm">
                                ID: {child.member.id}
                              </p>
                              <p className="text-xs text-gray-400 font-mono break-all">
                                {child.member.walletAddress}
                              </p>
                              <p className="text-xs text-honey-400 mt-1">
                                L{child.member.currentLevel || 0}
                              </p>
                            </>
                          ) : (
                            <p className="text-gray-500 text-sm">
                              {t("admin.users.empty") || "Empty"}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  {t("admin.users.noMatrixData") || "No matrix data available"}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowMatrixModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg"
                >
                  {t("admin.users.close") || "Close"}
                </button>
              </div>
            </div>
          </div>
        )}

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

