"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Edit, Trash2, Shield, Users, Key } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";
import { getApiEndpoint } from "@/lib/apiUrl";

interface Admin {
  id: number;
  email: string;
  name: string;
  roleId: number;
  active: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  roleName: string;
  isMasterAdmin: boolean;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  isMasterAdmin: boolean;
  permissions?: string[];
}

const ALL_PERMISSIONS = [
  "user.list",
  "user.view",
  "user.modify_address",
  "user.bulk_import",
  "admin.list",
  "admin.create",
  "admin.update",
  "admin.delete",
  "dashboard.view",
  "news.create",
  "news.update",
  "news.delete",
  "merchant.create",
  "merchant.update",
  "merchant.delete",
  "class.create",
  "class.update",
  "class.delete",
  "nft.create",
  "nft.update",
  "nft.delete",
  "nft.mint",
];

export default function AdminAdminsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"admins" | "roles">("admins");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [adminForm, setAdminForm] = useState({
    email: "",
    password: "",
    name: "",
    roleId: 0,
    active: true,
  });
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    isMasterAdmin: false,
    permissions: [] as string[],
  });

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    fetchData(token);
  }, [router]);

  const fetchData = async (token: string) => {
    try {
      setLoading(true);

      const [adminsRes, rolesRes] = await Promise.all([
        fetch(getApiEndpoint("admin/admins"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(getApiEndpoint("admin/admins/roles"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAdmins(adminsData.data || []);
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleDetails = async (roleId: number) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const response = await fetch(getApiEndpoint(`admin/admins/roles/${roleId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setRoleForm({
          name: result.data.name,
          description: result.data.description || "",
          isMasterAdmin: result.data.isMasterAdmin || false,
          permissions: result.data.permissions || [],
        });
      }
    } catch (error) {
      console.error("Error fetching role details:", error);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const url = editingAdmin
        ? getApiEndpoint(`admin/admins/${editingAdmin.id}`)
        : getApiEndpoint("admin/admins");
      const method = editingAdmin ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(adminForm),
      });

      if (!response.ok) throw new Error("Failed to save admin");
      setShowAdminModal(false);
      setEditingAdmin(null);
      setAdminForm({ email: "", password: "", name: "", roleId: 0, active: true });
      fetchData(token);
    } catch (error) {
      console.error("Error saving admin:", error);
      alert("Failed to save admin");
    }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const url = editingRole
        ? getApiEndpoint(`admin/admins/roles/${editingRole.id}`)
        : getApiEndpoint("admin/admins/roles");
      const method = editingRole ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(roleForm),
      });

      if (!response.ok) throw new Error("Failed to save role");
      setShowRoleModal(false);
      setEditingRole(null);
      setRoleForm({ name: "", description: "", isMasterAdmin: false, permissions: [] });
      fetchData(token);
    } catch (error) {
      console.error("Error saving role:", error);
      alert("Failed to save role");
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!confirm("Are you sure you want to delete this admin?")) return;
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const response = await fetch(getApiEndpoint(`admin/admins/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete admin");
      fetchData(token);
    } catch (error) {
      console.error("Error deleting admin:", error);
      alert("Failed to delete admin");
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const response = await fetch(getApiEndpoint(`admin/admins/roles/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete role");
      }
      fetchData(token);
    } catch (error: any) {
      console.error("Error deleting role:", error);
      alert(error.message || "Failed to delete role");
    }
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
      <style dangerouslySetInnerHTML={{
        __html: `
          select option {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          select option:checked {
            background-color: #fbbf24 !important;
            color: #000000 !important;
          }
        `
      }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Admin Management</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10">
          <button
            onClick={() => setActiveTab("admins")}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === "admins"
                ? "text-honey-400 border-b-2 border-honey-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Admins
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === "roles"
                ? "text-honey-400 border-b-2 border-honey-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Shield className="w-5 h-5 inline mr-2" />
            Roles & Permissions
          </button>
        </div>

        {/* Admins Tab */}
        {activeTab === "admins" && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setEditingAdmin(null);
                  setAdminForm({ email: "", password: "", name: "", roleId: roles[0]?.id || 0, active: true });
                  setShowAdminModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
              >
                <Plus className="w-5 h-5" />
                Add Admin
              </button>
            </div>

            <div className="bg-glass rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 text-white">{admin.name}</td>
                      <td className="px-6 py-4 text-white">{admin.email}</td>
                      <td className="px-6 py-4">
                        <span className="text-white">
                          {admin.roleName}
                          {admin.isMasterAdmin && (
                            <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                              Master
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            admin.active
                              ? "bg-green-500/20 text-green-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {admin.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingAdmin(admin);
                              setAdminForm({
                                email: admin.email,
                                password: "",
                                name: admin.name,
                                roleId: admin.roleId,
                                active: admin.active,
                              });
                              setShowAdminModal(true);
                            }}
                            className="text-honey-400 hover:text-honey-300"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === "roles" && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setEditingRole(null);
                  setRoleForm({ name: "", description: "", isMasterAdmin: false, permissions: [] });
                  setShowRoleModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
              >
                <Plus className="w-5 h-5" />
                Add Role
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {roles.map((role) => (
                <div key={role.id} className="bg-glass rounded-xl p-6 border border-white/10">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {role.name}
                        {role.isMasterAdmin && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                            Master Admin
                          </span>
                        )}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">{role.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setEditingRole(role);
                          await fetchRoleDetails(role.id);
                          setShowRoleModal(true);
                        }}
                        className="text-honey-400 hover:text-honey-300"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Modal */}
        {showAdminModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-glass rounded-xl p-6 border border-white/10 max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold text-white mb-4">
                {editingAdmin ? "Edit Admin" : "Add Admin"}
              </h3>
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="block text-white mb-2">Name</label>
                  <input
                    type="text"
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">Email</label>
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">
                    Password {editingAdmin && "(leave blank to keep current)"}
                  </label>
                  <input
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    required={!editingAdmin}
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">Role</label>
                  <select
                    value={adminForm.roleId}
                    onChange={(e) => setAdminForm({ ...adminForm, roleId: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white [&>option]:bg-white [&>option]:text-black"
                    required
                  >
                    <option value={0} className="bg-white text-black">
                      Select a role
                    </option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id} className="bg-white text-black">
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={adminForm.active}
                    onChange={(e) => setAdminForm({ ...adminForm, active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="active" className="text-white">Active</label>
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
                  >
                    {editingAdmin ? "Update" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminModal(false);
                      setEditingAdmin(null);
                    }}
                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Role Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-glass rounded-xl p-6 border border-white/10 max-w-2xl w-full mx-4 my-8">
              <h3 className="text-2xl font-bold text-white mb-4">
                {editingRole ? "Edit Role" : "Add Role"}
              </h3>
              <form onSubmit={handleRoleSubmit} className="space-y-4">
                <div>
                  <label className="block text-white mb-2">Role Name</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">Description</label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isMasterAdmin"
                    checked={roleForm.isMasterAdmin}
                    onChange={(e) => setRoleForm({ ...roleForm, isMasterAdmin: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isMasterAdmin" className="text-white">Master Admin</label>
                </div>
                <div>
                  <label className="block text-white mb-2">Permissions</label>
                  <div className="bg-white/5 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_PERMISSIONS.map((permission) => (
                        <label key={permission} className="flex items-center gap-2 text-white text-sm">
                          <input
                            type="checkbox"
                            checked={roleForm.permissions.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRoleForm({
                                  ...roleForm,
                                  permissions: [...roleForm.permissions, permission],
                                });
                              } else {
                                setRoleForm({
                                  ...roleForm,
                                  permissions: roleForm.permissions.filter((p) => p !== permission),
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span>{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
                  >
                    {editingRole ? "Update" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoleModal(false);
                      setEditingRole(null);
                    }}
                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg"
                  >
                    Cancel
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

