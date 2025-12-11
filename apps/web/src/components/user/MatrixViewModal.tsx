"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User } from "lucide-react";
import { api } from "@/lib/api";
import { shortenAddress } from "@/lib/utils";
import { useTranslation } from "@/i18n/TranslationProvider";

interface MatrixMember {
  id: number;
  walletAddress: string;
  username?: string;
  currentLevel: number;
  position?: number;
}

interface MatrixData {
  member: MatrixMember;
  sponsor: MatrixMember | null;
  downlines: Array<{
    position: number;
    member: MatrixMember | null;
  }>;
}

interface MatrixViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

export function MatrixViewModal({ isOpen, onClose, walletAddress }: MatrixViewModalProps) {
  const { t } = useTranslation();
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentWallet, setCurrentWallet] = useState(walletAddress);

  useEffect(() => {
    if (isOpen && currentWallet) {
      fetchMatrix(currentWallet);
    }
  }, [isOpen, currentWallet]);

  const fetchMatrix = async (address: string) => {
    setLoading(true);
    try {
      const result = await api.getMatrix(address);
      if (result.success && result.data) {
        setMatrixData(result.data);
      } else {
        console.error("Failed to fetch matrix:", result.error);
      }
    } catch (error) {
      console.error("Matrix fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownlineClick = (member: MatrixMember | null) => {
    if (member && member.walletAddress) {
      setCurrentWallet(member.walletAddress);
      fetchMatrix(member.walletAddress);
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 15) return "text-purple-400";
    if (level >= 10) return "text-blue-400";
    if (level >= 5) return "text-green-400";
    return "text-orange-400";
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold text-white">{t("dashboard.matrix.title") || "矩阵视图"}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
              </div>
            ) : matrixData ? (
              <div className="space-y-6">
                {/* Sponsor Section - Clickable */}
                {matrixData.sponsor && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">
                        {t("dashboard.matrix.referrer") || "推荐人"}
                        {matrixData.sponsor.position && (
                          <span className="text-gray-400 text-sm ml-2">
                            ({t("dashboard.matrix.position") || "位置"}: {matrixData.sponsor.position})
                          </span>
                        )}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleDownlineClick(matrixData.sponsor)}
                      className="w-full bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 hover:bg-blue-900/50 hover:border-blue-600 transition-all cursor-pointer text-left"
                    >
                      <div className="font-bold text-white mb-1">ID: {matrixData.sponsor.id}</div>
                      <div className="text-gray-300 text-sm mb-2">{shortenAddress(matrixData.sponsor.walletAddress, 8)}</div>
                      <div className={`text-right font-semibold ${getLevelColor(matrixData.sponsor.currentLevel)}`}>
                        Level {matrixData.sponsor.currentLevel}
                      </div>
                    </button>
                  </div>
                )}

                {/* Current Member Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-orange-400" />
                    <h3 className="text-lg font-semibold text-white">
                      {t("dashboard.matrix.currentMember") || "当前成员"}
                    </h3>
                  </div>
                  <div className="bg-orange-900/30 border border-orange-700/50 rounded-lg p-4">
                    <div className="font-bold text-white mb-1">ID: {matrixData.member.id}</div>
                    <div className="text-gray-300 text-sm mb-2">{matrixData.member.walletAddress}</div>
                    <div className={`text-right font-semibold ${getLevelColor(matrixData.member.currentLevel)}`}>
                      Level {matrixData.member.currentLevel}
                    </div>
                  </div>
                </div>

                {/* Downlines Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-white">
                      {t("dashboard.matrix.downline") || "下线"} (3x3 Matrix)
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {matrixData.downlines.map((downline, index) => (
                      <div key={index}>
                        <div className="text-gray-400 text-sm mb-2">
                          {t("dashboard.matrix.position") || "位置"} {downline.position}
                        </div>
                        {downline.member ? (
                          <button
                            onClick={() => handleDownlineClick(downline.member)}
                            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800 hover:border-gray-600 transition-all cursor-pointer text-left"
                          >
                            <div className="font-bold text-white mb-1">ID: {downline.member.id}</div>
                            <div className="text-gray-300 text-xs mb-2 break-all">
                              {shortenAddress(downline.member.walletAddress, 8)}
                            </div>
                            <div className={`text-right font-semibold text-sm ${getLevelColor(downline.member.currentLevel)}`}>
                              L{downline.member.currentLevel}
                            </div>
                          </button>
                        ) : (
                          <div className="w-full bg-gray-800/30 border border-gray-700/30 rounded-lg p-4 text-center text-gray-500 text-sm">
                            {t("dashboard.matrix.empty") || "空位"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                {t("dashboard.matrix.noData") || "无法加载矩阵数据"}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              {t("dashboard.matrix.close") || "关闭"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

