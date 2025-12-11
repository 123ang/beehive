"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useTranslation } from "@/i18n/TranslationProvider";
import { ArrowLeft, Calendar, Video, ShoppingCart, Clock, ExternalLink } from "lucide-react";

interface ClassMeeting {
  id: number;
  meetingTitle: string;
  meetingTime: Date | string;
  meetingUrl: string;
  meetingPassword: string;
  meetingImage: string | null;
}

interface Class {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  category: string | null;
  active: boolean;
  meetings?: ClassMeeting[];
}

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [classItem, setClassItem] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchClass(Number(params.id));
    }
  }, [params.id]);

  const fetchClass = async (id: number) => {
    setLoading(true);
    try {
      const result = await api.getClass(id);
      if (result.success && result.data) {
        setClassItem(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch class:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!classItem) return;
    // TODO: Implement enrollment/purchase flow
    console.log("Enroll in class:", classItem);
    alert(t("education.enrollComingSoon") || "Enrollment functionality coming soon!");
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(lang === "zh" ? "zh-CN" : lang === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isUpcoming = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d > new Date();
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
            {t("education.back") || "Back"}
          </Button>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
          ) : !classItem ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                {t("education.classNotFound") || "Class not found"}
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Class Header */}
              <div className="bg-glass rounded-xl overflow-hidden border border-gray-700/30">
                {classItem.thumbnail && (
                  <div className="h-64 bg-gradient-to-br from-blue-900/30 to-purple-800/20">
                    <img
                      src={classItem.thumbnail}
                      alt={classItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  {classItem.category && (
                    <span className="inline-block bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm mb-4 border border-blue-500/50">
                      {classItem.category}
                    </span>
                  )}
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    {classItem.title}
                  </h1>
                  {classItem.description && (
                    <p className="text-gray-300 text-lg leading-relaxed">
                      {classItem.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Meetings */}
              {classItem.meetings && classItem.meetings.length > 0 && (
                <div className="bg-glass rounded-xl p-6 border border-gray-700/30">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-blue-400" />
                    {t("education.meetings") || "Meetings"}
                  </h2>
                  <div className="space-y-4">
                    {classItem.meetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className={`bg-gray-900/50 rounded-lg p-4 border ${
                          isUpcoming(meeting.meetingTime)
                            ? "border-blue-500/50"
                            : "border-gray-700/30"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">
                              {meeting.meetingTitle}
                            </h3>
                            <div className="flex items-center gap-4 text-gray-400 text-sm mb-3">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{formatDate(meeting.meetingTime)}</span>
                              </div>
                              {isUpcoming(meeting.meetingTime) && (
                                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">
                                  {t("education.upcoming") || "Upcoming"}
                                </span>
                              )}
                            </div>
                            {meeting.meetingPassword && (
                              <p className="text-gray-400 text-sm mb-2">
                                <span className="font-medium">
                                  {t("education.password") || "Password"}:{" "}
                                </span>
                                {meeting.meetingPassword}
                              </p>
                            )}
                          </div>
                          {isUpcoming(meeting.meetingTime) && meeting.meetingUrl && (
                            <Button
                              onClick={() => window.open(meeting.meetingUrl, "_blank")}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              {t("education.join") || "Join"}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enroll Button */}
              <div className="bg-glass rounded-xl p-6 border border-gray-700/30">
                <Button
                  onClick={handleEnroll}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-lg py-6"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {t("education.enrollNow") || "Enroll Now"}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

