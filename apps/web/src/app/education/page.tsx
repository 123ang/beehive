"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useTranslation } from "@/i18n/TranslationProvider";
import { Wallet, GraduationCap, Calendar, Video, ShoppingCart, Clock } from "lucide-react";
import Link from "next/link";

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
  upcomingMeetings?: ClassMeeting[];
  meetings?: ClassMeeting[];
}

export default function EducationPage() {
  const { isConnected, address } = useAccount();
  const { t, lang } = useTranslation();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const result = await api.getClasses();
      if (result.success && result.data) {
        setClasses(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (classItem: Class) => {
    // TODO: Implement enrollment/purchase flow
    console.log("Enroll in class:", classItem);
    alert(t("education.enrollComingSoon") || "Enrollment functionality coming soon!");
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    // Map LanguageCode to locale string for date formatting
    const localeMap: Record<string, string> = {
      "en": "en-US",
      "zh-CN": "zh-CN",
      "zh-TW": "zh-TW",
      "ja": "ja-JP",
      "ko": "ko-KR",
      "th": "th-TH",
      "ms": "ms-MY",
    };
    const locale = localeMap[lang] || "en-US";
    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Not connected state
  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
        <Header />
        <section className="pt-28 pb-16 min-h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-glass rounded-2xl p-12 max-w-md mx-auto"
            >
              <div className="w-20 h-20 rounded-full bg-honey-500/20 flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-10 h-10 text-honey-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                {t("education.connectWallet") || "Connect Your Wallet"}
              </h2>
              <p className="text-gray-400 mb-6">
                {t("education.connectWalletDesc") || "Connect your wallet to view and enroll in classes"}
              </p>
              <ConnectButton />
            </motion.div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      <Header />

      <section className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold font-display">
              <span className="text-gradient-gold">{t("education.title") || "Education"}</span>
            </h1>
            <p className="text-gray-400 mt-2">
              {t("education.subtitle") || "Enroll in classes and expand your knowledge"}
            </p>
          </motion.div>

          {/* Classes Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                {t("education.noClasses") || "No classes available"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((classItem, index) => (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-glass rounded-xl overflow-hidden border border-gray-700/30 hover:border-yellow-500/50 transition-all"
                >
                  {/* Class Thumbnail */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-900/30 to-purple-800/20 flex items-center justify-center">
                    {classItem.thumbnail ? (
                      <img
                        src={classItem.thumbnail}
                        alt={classItem.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <GraduationCap className="w-16 h-16 text-blue-400/50" />
                    )}
                    {classItem.category && (
                      <div className="absolute top-4 left-4 bg-blue-500/20 backdrop-blur-sm px-3 py-1 rounded-full border border-blue-500/50">
                        <span className="text-blue-400 text-xs font-semibold">
                          {classItem.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Class Details */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">{classItem.title}</h3>
                    {classItem.description && (
                      <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                        {classItem.description}
                      </p>
                    )}

                    {/* Upcoming Meetings */}
                    {classItem.upcomingMeetings && classItem.upcomingMeetings.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-blue-400" />
                          <span className="text-gray-400 text-xs">
                            {t("education.upcomingMeetings") || "Upcoming Meetings"}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {classItem.upcomingMeetings.slice(0, 2).map((meeting) => (
                            <div
                              key={meeting.id}
                              className="bg-gray-900/50 rounded p-2 text-xs"
                            >
                              <p className="text-white font-medium">{meeting.meetingTitle}</p>
                              <p className="text-gray-400">
                                {formatDate(meeting.meetingTime)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/education/${classItem.id}`}
                        className="flex-1"
                      >
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                          <Video className="w-4 h-4 mr-2" />
                          {t("education.viewDetails") || "View Details"}
                        </Button>
                      </Link>
                      <Button
                        onClick={() => handleEnroll(classItem)}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {t("education.enroll") || "Enroll"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

