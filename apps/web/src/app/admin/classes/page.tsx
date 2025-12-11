"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Edit, Trash2, Calendar, Video, RefreshCw } from "lucide-react";
import { useTranslation } from "@/i18n/TranslationProvider";

interface Class {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  category: string | null;
  active: boolean;
  createdAt: Date;
  meetings?: ClassMeeting[];
}

interface ClassMeeting {
  id: number;
  classId: number;
  meetingTitle: string;
  meetingTime: string | Date;
  meetingUrl: string;
  meetingPassword: string;
  meetingImage: string | null;
  speaker: string | null;
  description: string | null;
}

export default function AdminClassesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<ClassMeeting | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classFormData, setClassFormData] = useState({
    title: "",
    description: "",
    thumbnail: "",
    category: "",
    active: true,
  });
  const [meetingFormData, setMeetingFormData] = useState({
    meetingTitle: "",
    meetingDate: "",
    meetingTime: "",
    meetingUrl: "",
    meetingPassword: "",
    speaker: "",
    description: "",
    meetingImage: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    fetchClasses(token);
  }, [router]);

  const fetchClasses = async (token: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/admin/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch classes");
      const result = await response.json();
      const classesWithMeetings = await Promise.all(
        (result.data || []).map(async (classItem: Class) => {
          const classResponse = await fetch(`${apiUrl}/api/admin/classes/${classItem.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (classResponse.ok) {
            const classData = await classResponse.json();
            return { ...classItem, meetings: classData.data?.meetings || [] };
          }
          return { ...classItem, meetings: [] };
        })
      );
      setClasses(classesWithMeetings);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const password = Math.floor(100000 + Math.random() * 900000).toString();
    setMeetingFormData({ ...meetingFormData, meetingPassword: password });
  };

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const url = editingClass
        ? `${apiUrl}/api/admin/classes/${editingClass.id}`
        : `${apiUrl}/api/admin/classes`;
      const method = editingClass ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(classFormData),
      });

      if (!response.ok) throw new Error("Failed to save class");
      setShowClassModal(false);
      setEditingClass(null);
      setClassFormData({ title: "", description: "", thumbnail: "", category: "", active: true });
      fetchClasses(token);
    } catch (error) {
      console.error("Error saving class:", error);
      alert("Failed to save class");
    }
  };

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("adminToken");
    if (!token || !selectedClassId) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const meetingDateTime = new Date(`${meetingFormData.meetingDate}T${meetingFormData.meetingTime}`);
      
      const url = editingMeeting
        ? `${apiUrl}/api/admin/classes/meetings/${editingMeeting.id}`
        : `${apiUrl}/api/admin/classes/${selectedClassId}/meetings`;
      const method = editingMeeting ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingTitle: meetingFormData.meetingTitle,
          meetingTime: meetingDateTime.toISOString(),
          meetingUrl: meetingFormData.meetingUrl,
          meetingPassword: meetingFormData.meetingPassword,
          speaker: meetingFormData.speaker || null,
          description: meetingFormData.description || null,
          meetingImage: meetingFormData.meetingImage || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to save meeting");
      setShowMeetingModal(false);
      setEditingMeeting(null);
      setSelectedClassId(null);
      setMeetingFormData({
        meetingTitle: "",
        meetingDate: "",
        meetingTime: "",
        meetingUrl: "",
        meetingPassword: "",
        speaker: "",
        description: "",
        meetingImage: "",
      });
      fetchClasses(token);
    } catch (error) {
      console.error("Error saving meeting:", error);
      alert("Failed to save meeting");
    }
  };

  const handleDeleteClass = async (id: number) => {
    if (!confirm("Are you sure you want to delete this class?")) return;
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/admin/classes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete class");
      fetchClasses(token);
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Failed to delete class");
    }
  };

  const handleDeleteMeeting = async (meetingId: number) => {
    if (!confirm(t("admin.classes.deleteConfirm"))) return;
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/admin/classes/meetings/${meetingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete meeting");
      fetchClasses(token);
    } catch (error) {
      console.error("Error deleting meeting:", error);
      alert("Failed to delete meeting");
    }
  };

  const handleEditClass = (classItem: Class) => {
    setEditingClass(classItem);
    setClassFormData({
      title: classItem.title,
      description: classItem.description || "",
      thumbnail: classItem.thumbnail || "",
      category: classItem.category || "",
      active: classItem.active,
    });
    setShowClassModal(true);
  };

  const handleEditMeeting = (meeting: ClassMeeting) => {
    setEditingMeeting(meeting);
    const meetingDate = new Date(meeting.meetingTime);
    setMeetingFormData({
      meetingTitle: meeting.meetingTitle,
      meetingDate: meetingDate.toISOString().split("T")[0],
      meetingTime: meetingDate.toTimeString().slice(0, 5),
      meetingUrl: meeting.meetingUrl,
      meetingPassword: meeting.meetingPassword,
      speaker: meeting.speaker || "",
      description: meeting.description || "",
      meetingImage: meeting.meetingImage || "",
    });
    setSelectedClassId(meeting.classId);
    setShowMeetingModal(true);
  };

  const handleAddMeeting = (classId: number) => {
    setEditingMeeting(null);
    setSelectedClassId(classId);
    setMeetingFormData({
      meetingTitle: "",
      meetingDate: "",
      meetingTime: "",
      meetingUrl: "",
      meetingPassword: "",
      speaker: "",
      description: "",
      meetingImage: "",
    });
    setShowMeetingModal(true);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {t("admin.classes.title") || "Classes Management"}
          </h2>
          <button
            onClick={() => {
              setEditingClass(null);
              setClassFormData({ title: "", description: "", thumbnail: "", category: "", active: true });
              setShowClassModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
          >
            <Plus className="w-5 h-5" />
            {t("admin.classes.addClass") || "Add Class"}
          </button>
        </div>

        <div className="space-y-6">
          {classes.map((classItem) => (
            <div
              key={classItem.id}
              className="bg-glass rounded-xl p-6 border border-white/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">{classItem.title}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        classItem.active
                          ? "bg-green-500/20 text-green-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {classItem.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {classItem.description && (
                    <p className="text-gray-400 text-sm mb-2">{classItem.description}</p>
                  )}
                  {classItem.category && (
                    <span className="text-xs text-gray-500">Category: {classItem.category}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddMeeting(classItem.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-honey-500/20 hover:bg-honey-500/30 text-honey-400 rounded-lg text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {t("admin.classes.addMeeting")}
                  </button>
                  <button
                    onClick={() => handleEditClass(classItem)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClass(classItem.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Meetings Section */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  {t("admin.classes.meetings") || "Meetings"}
                </h4>
                {classItem.meetings && classItem.meetings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classItem.meetings.map((meeting) => {
                      const meetingDate = new Date(meeting.meetingTime);
                      return (
                        <div
                          key={meeting.id}
                          className="bg-white/5 rounded-lg p-4 border border-white/10"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-white">{meeting.meetingTitle}</h5>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditMeeting(meeting)}
                                className="p-1 bg-white/5 hover:bg-white/10 rounded text-white"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteMeeting(meeting.id)}
                                className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {meetingDate.toLocaleString()}
                            </div>
                            {meeting.speaker && (
                              <div>Speaker: <span className="text-white">{meeting.speaker}</span></div>
                            )}
                            <div>Link: <a href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-honey-400 hover:underline">{meeting.meetingUrl}</a></div>
                            <div>Password: <span className="text-white font-mono">{meeting.meetingPassword}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">{t("admin.classes.noMeetings") || "No meetings yet"}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Class Modal */}
        {showClassModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-glass rounded-xl p-6 border border-white/10 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-white mb-4">
                {editingClass
                  ? t("admin.classes.editClass") || "Edit Class"
                  : t("admin.classes.addClass") || "Add Class"}
              </h3>
              <form onSubmit={handleClassSubmit} className="space-y-4">
                <div>
                  <label className="block text-white mb-2">{t("admin.classes.classTitle") || "Class Title"}</label>
                  <input
                    type="text"
                    value={classFormData.title}
                    onChange={(e) => setClassFormData({ ...classFormData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.classes.description") || "Description"}</label>
                  <textarea
                    value={classFormData.description}
                    onChange={(e) => setClassFormData({ ...classFormData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.classes.thumbnail") || "Thumbnail URL"}</label>
                  <input
                    type="url"
                    value={classFormData.thumbnail}
                    onChange={(e) => setClassFormData({ ...classFormData, thumbnail: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.classes.category") || "Category"}</label>
                  <input
                    type="text"
                    value={classFormData.category}
                    onChange={(e) => setClassFormData({ ...classFormData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={classFormData.active}
                    onChange={(e) => setClassFormData({ ...classFormData, active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="active" className="text-white">
                    {t("admin.classes.active") || "Active"}
                  </label>
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
                  >
                    {t("admin.classes.save") || "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClassModal(false);
                      setEditingClass(null);
                    }}
                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg"
                  >
                    {t("admin.classes.cancel") || "Cancel"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Meeting Modal */}
        {showMeetingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-glass rounded-xl p-6 border border-white/10 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-white mb-4">
                {editingMeeting
                  ? t("admin.classes.editMeeting") || "Edit Meeting"
                  : t("admin.classes.addMeeting") || "Add Meeting"}
              </h3>
              <form onSubmit={handleMeetingSubmit} className="space-y-4">
                <div>
                  <label className="block text-white mb-2">{t("admin.classes.meetingTitle") || "Meeting Title"}</label>
                  <input
                    type="text"
                    value={meetingFormData.meetingTitle}
                    onChange={(e) => setMeetingFormData({ ...meetingFormData, meetingTitle: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white mb-2">{t("admin.classes.meetingDate") || "Date"}</label>
                    <input
                      type="date"
                      value={meetingFormData.meetingDate}
                      onChange={(e) => setMeetingFormData({ ...meetingFormData, meetingDate: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-2">{t("admin.classes.meetingTime") || "Time"}</label>
                    <input
                      type="time"
                      value={meetingFormData.meetingTime}
                      onChange={(e) => setMeetingFormData({ ...meetingFormData, meetingTime: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.classes.meetingLink") || "Meeting Link"}</label>
                  <input
                    type="url"
                    value={meetingFormData.meetingUrl}
                    onChange={(e) => setMeetingFormData({ ...meetingFormData, meetingUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    placeholder="https://..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.classes.meetingPassword") || "Meeting Password"}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={meetingFormData.meetingPassword}
                      onChange={(e) => setMeetingFormData({ ...meetingFormData, meetingPassword: e.target.value })}
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono"
                      maxLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="px-4 py-2 bg-honey-500/20 hover:bg-honey-500/30 text-honey-400 rounded-lg flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t("admin.classes.generatePassword") || "Generate"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.classes.speaker") || "Speaker"}</label>
                  <input
                    type="text"
                    value={meetingFormData.speaker}
                    onChange={(e) => setMeetingFormData({ ...meetingFormData, speaker: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.classes.meetingDescription") || "Meeting Description"}</label>
                  <textarea
                    value={meetingFormData.description}
                    onChange={(e) => setMeetingFormData({ ...meetingFormData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">{t("admin.classes.meetingImage") || "Meeting Image URL"}</label>
                  <input
                    type="url"
                    value={meetingFormData.meetingImage}
                    onChange={(e) => setMeetingFormData({ ...meetingFormData, meetingImage: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-honey-500 hover:bg-honey-600 text-black font-semibold rounded-lg"
                  >
                    {t("admin.classes.save") || "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMeetingModal(false);
                      setEditingMeeting(null);
                      setSelectedClassId(null);
                    }}
                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg"
                  >
                    {t("admin.classes.cancel") || "Cancel"}
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
