"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { MEMBERSHIP_LEVELS } from "@beehive/shared";
import { getLevelColor, formatNumber } from "@/lib/utils";
import { useTranslation } from "@/i18n/TranslationProvider";
import { api } from "@/lib/api";
import { Crown, Star, Gem, Award, Check, Lock, ArrowRight } from "lucide-react";
import { PurchaseModal } from "@/components/web3/PurchaseModal";

// Level tier categories
const tiers = [
  { name: "Starter", levels: [1, 2, 3, 4, 5, 6] },
  { name: "Advanced", levels: [7, 8, 9, 10, 11, 12] },
  { name: "Elite", levels: [13, 14, 15, 16, 17, 18, 19] },
];

const tierNameKeys = {
  "Starter": "membership.tier.starter",
  "Advanced": "membership.tier.advanced",
  "Elite": "membership.tier.elite",
};

export default function MembershipPage() {
  const { isConnected, address } = useAccount();
  const { t } = useTranslation();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [currentUserLevel, setCurrentUserLevel] = useState<number>(0);
  const [isLoadingLevel, setIsLoadingLevel] = useState(false);
  const [referrerForPurchase, setReferrerForPurchase] = useState<string | null>(null);
  
  // Get referrer from URL parameter
  const [referrerAddress, setReferrerAddress] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      // Check both 'ref' (legacy) and 'referral_code' (new) for backward compatibility
      const ref = urlParams.get("referral_code") || urlParams.get("ref");
      if (ref) {
        setReferrerAddress(ref);
      }
    }
  }, []);

  // Fetch user's current level when wallet is connected
  useEffect(() => {
    const fetchUserLevel = async () => {
      if (!isConnected || !address) {
        setCurrentUserLevel(0);
        return;
      }

      setIsLoadingLevel(true);
      try {
        const response = await api.getDashboard(address);
        if (response.success && response.data) {
          setCurrentUserLevel(response.data.currentLevel || 0);
        }
      } catch (error) {
        console.error("Failed to fetch user level:", error);
        setCurrentUserLevel(0);
      } finally {
        setIsLoadingLevel(false);
      }
    };

    fetchUserLevel();
  }, [isConnected, address]);

  const handlePurchase = async (level: number) => {
    if (!isConnected || !address) return;
    
    // Get referrer from dashboard (if member) or URL parameter
    let referrer: string | null = null;
    
    try {
      const dashboard = await api.getDashboard(address);
      if (dashboard.success && dashboard.data) {
        // If user is already a member, use their sponsor
        if (dashboard.data.isMember && dashboard.data.sponsor?.walletAddress) {
          referrer = dashboard.data.sponsor.walletAddress;
        } 
        // If user is not a member yet (Level 1 purchase), check URL parameter
        else if (level === 1) {
          if (referrerAddress) {
            referrer = referrerAddress;
          } else {
            alert("Please provide a referrer address. Add ?ref=0x... to the URL or visit the membership page with a referral link.");
            return;
          }
        }
        // For upgrades (level > 1), user should already be a member with a sponsor
        else if (level > 1) {
          if (dashboard.data.sponsor?.walletAddress) {
            referrer = dashboard.data.sponsor.walletAddress;
          } else {
            // Fallback to URL parameter if sponsor not found
            referrer = referrerAddress || address;
          }
        }
      }
    } catch (error) {
      console.error("Failed to get referrer:", error);
      // On error, for Level 1, check URL parameter
      if (level === 1) {
        if (referrerAddress) {
          referrer = referrerAddress;
        } else {
          alert("Please provide a referrer address. Add ?ref=0x... to the URL or visit the membership page with a referral link.");
          return;
        }
      } else {
        // For upgrades, use URL parameter or fallback to own address
        referrer = referrerAddress || address;
      }
    }
    
    // Ensure we have a referrer before proceeding
    if (!referrer) {
      referrer = referrerAddress || address;
    }
    
    // Store referrer for the purchase modal
    setReferrerForPurchase(referrer);
    setSelectedLevel(level);
  };

  const handlePurchaseSuccess = () => {
    setSelectedLevel(null);
    // Refetch user level
    if (isConnected && address) {
      api.getDashboard(address).then((response) => {
        if (response.success && response.data) {
          setCurrentUserLevel(response.data.currentLevel || 0);
        }
      });
    }
  };

  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">
              <span className="text-gradient-gold">{t("membership.title")}</span>
            </h1>
            <p className="text-white text-lg max-w-2xl mx-auto">
              {t("membership.subtitle")}
            </p>
          </motion.div>

          {/* Level Tiers */}
          {tiers.map((tier, tierIndex) => (
            <div key={tier.name} className="mb-16">
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: tierIndex * 0.1 }}
                className="text-2xl font-bold text-white mb-6 flex items-center gap-3"
              >
                {tierIndex === 0 && <Award className="w-6 h-6 text-honey-400" />}
                {tierIndex === 1 && <Star className="w-6 h-6 text-honey-400" />}
                {tierIndex === 2 && <Crown className="w-6 h-6 text-honey-400" />}
                {t(tierNameKeys[tier.name as keyof typeof tierNameKeys])}
              </motion.h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tier.levels.map((levelNum, index) => {
                  const level = MEMBERSHIP_LEVELS.find((l) => l.level === levelNum);
                  if (!level) return null;

                  const isOwned = currentUserLevel >= level.level;
                  const isNextLevel = currentUserLevel + 1 === level.level;
                  const isLocked = isConnected && level.level > currentUserLevel + 1;
                  const canPurchase = isConnected && isNextLevel && !isOwned;
                  const isLevel1 = level.level === 1;
                  
                  // Determine unlock message for locked levels
                  const requiredLevel = level.level - 1;
                  const unlockMessage = isLocked 
                    ? t("membership.unlockMessage", { level: requiredLevel })
                    : null;

                  return (
                    <motion.div
                      key={level.level}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={`level-card ${isOwned ? "active" : ""} ${
                        (isLocked || (!canPurchase && !isOwned && !isNextLevel)) ? "locked" : ""
                      }`}
                    >
                      {/* Status Badge */}
                      <div className="absolute top-4 right-4">
                        {isOwned ? (
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-green-400" />
                          </div>
                        ) : isNextLevel ? (
                          <div className="px-2 py-1 rounded-full bg-honey-500/20 text-honey-400 text-xs font-medium">
                            {t("membership.next")}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="p-6">
                        {/* Level Icon */}
                        <div
                          className="w-14 h-14 hexagon flex items-center justify-center mb-4"
                          style={{ backgroundColor: `${getLevelColor(level.level)}30` }}
                        >
                          <span
                            className="text-xl font-bold"
                            style={{ color: getLevelColor(level.level) }}
                          >
                            {level.level}
                          </span>
                        </div>

                        {/* Level Name */}
                        <h3 className="text-xl font-bold text-white mb-4">
                          {(() => {
                            const translationKey = `levels.${level.level}`;
                            const translated = t(translationKey);
                            // If translation returns the key itself, use fallback
                            return translated === translationKey 
                              ? (level.nameCn || level.name)
                              : translated;
                          })()}
                        </h3>

                        {/* Stats */}
                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between items-center">
                            <span className="text-white text-sm">{t("membership.price")}</span>
                            <span className="text-white font-semibold">
                              ${formatNumber(level.priceUSDT, 0)} USDT
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white text-sm">{t("membership.bccReward")}</span>
                            <span className="text-honey-400 font-semibold">
                              {formatNumber(level.bccReward, 0)} BCC
                            </span>
                          </div>
                          {/* Empty row for level 1 to match other levels */}
                          {isLevel1 ? (
                            <div className="flex justify-between items-center opacity-0">
                              <span className="text-white text-sm">{t("membership.layerReward")}</span>
                              <span className="text-green-400 font-semibold">-</span>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <span className="text-white text-sm">
                                {t("membership.layerReward")}
                              </span>
                              <span className="text-green-400 font-semibold">
                                ${formatNumber(level.priceUSDT, 0)} USDT
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        {isOwned ? (
                          <div className="text-center py-3 bg-green-500/10 rounded-lg text-green-400 font-medium">
                            {t("membership.owned")}
                          </div>
                        ) : isLocked ? (
                          <div className="text-center py-3 bg-gray-500/10 rounded-lg text-gray-400 text-sm">
                            {unlockMessage || t("membership.locked")}
                          </div>
                        ) : (
                          <Button
                            className="w-full group"
                            onClick={() => handlePurchase(level.level)}
                            disabled={!canPurchase}
                          >
                            {isConnected
                              ? t("membership.purchase")
                              : t("membership.connectWalletButton")}
                            {canPurchase && (
                              <ArrowRight
                                size={16}
                                className="group-hover:translate-x-1 transition-transform"
                              />
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Bottom Accent */}
                      <div
                        className="h-1"
                        style={{ backgroundColor: getLevelColor(level.level) }}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />

      {/* Purchase Modal */}
      {selectedLevel && isConnected && address && (
        <PurchaseModal
          isOpen={!!selectedLevel}
          onClose={() => setSelectedLevel(null)}
          level={selectedLevel}
          referrer={referrerForPurchase || referrerAddress || address}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </main>
  );
}

