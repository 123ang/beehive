"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useTranslation } from "@/i18n/TranslationProvider";
import { ArrowLeft, User, Mail, CheckCircle, AlertCircle, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterPage() {
  const { isConnected, address } = useAccount();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get referral code from URL parameter
  const urlReferralCode = searchParams.get("ref") || "";
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    referralCode: urlReferralCode,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralStatus, setReferralStatus] = useState<{
    valid: boolean;
    message: string;
    referrerInfo?: string;
  } | null>(null);

  // Validate referral code when it changes
  useEffect(() => {
    if (formData.referralCode) {
      validateReferralCode(formData.referralCode);
    } else {
      setReferralStatus(null);
    }
  }, [formData.referralCode]);

  // Update referral code when URL param changes
  useEffect(() => {
    if (urlReferralCode && !formData.referralCode) {
      setFormData((prev) => ({ ...prev, referralCode: urlReferralCode }));
    }
  }, [urlReferralCode]);

  const validateReferralCode = async (code: string) => {
    // TODO: Call API to validate referral code
    // For now, simulate validation
    if (code.length > 0) {
      setReferralStatus({
        valid: true,
        message: t("register.referralStatus.valid"),
        referrerInfo: `user_${code} (${t("register.referralStatus.level2")})`,
      });
    } else {
      setReferralStatus(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Email validation (only if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t("register.errors.emailInvalid");
    }

    // Wallet is required
    if (!isConnected) {
      newErrors.wallet = t("register.errors.walletRequired");
    }

    // Referral code is required
    if (!formData.referralCode) {
      newErrors.referralCode = t("register.errors.referralCodeRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement registration API call
      console.log("Registering with:", {
        username: formData.username || null,
        email: formData.email || null,
        walletAddress: address,
        referralCode: formData.referralCode,
      });
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Redirect to membership page
      router.push("/membership");
    } catch (error) {
      console.error("Registration error:", error);
      setErrors({ submit: t("register.errors.submitFailed") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white hover:text-honey-400 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>{t("register.back")}</span>
            </Link>
          </motion.div>

          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">
              <span className="text-gradient-gold">{t("register.title")}</span>
            </h1>
            {isConnected && address && (
              <p className="text-white text-lg">
                {t("register.connected")}: {formatAddress(address)}
              </p>
            )}
          </motion.div>

          {/* Registration Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-glass rounded-2xl p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Referral Status */}
              {formData.referralCode && (
                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-honey-400" />
                    <h3 className="text-honey-400 font-semibold">{t("register.referralStatus.title")}</h3>
                  </div>
                  {referralStatus?.valid ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <p className="text-white">
                        {referralStatus.message}: {referralStatus.referrerInfo}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <p className="text-red-400">{t("register.referralStatus.invalid")}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Wallet Connection Status */}
              <div className="mb-6">
                <label className="block text-honey-400 font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {t("register.walletAddress")} *
                </label>
                {isConnected && address ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div className="flex-1">
                      <p className="text-green-400 font-medium">{t("register.walletConnected")}</p>
                      <p className="text-white text-sm font-mono">{address}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <p className="text-red-400">{t("register.walletNotConnected")}</p>
                    </div>
                    <ConnectButton label={t("header.connectWallet")} />
                  </div>
                )}
                {errors.wallet && (
                  <p className="text-red-400 text-sm mt-2">{errors.wallet}</p>
                )}
              </div>

              {/* Username (Optional) */}
              <div>
                <label htmlFor="username" className="block text-honey-400 font-medium mb-2 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {t("register.username")} *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-honey-500/50 focus:ring-1 focus:ring-honey-500/50 transition-all"
                    placeholder={t("register.usernamePlaceholder")}
                  />
                </div>
                {errors.username && (
                  <p className="text-red-400 text-sm mt-2">{errors.username}</p>
                )}
              </div>

              {/* Email (Optional) */}
              <div>
                <label htmlFor="email" className="block text-honey-400 font-medium mb-2 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  {t("register.email")} ({t("register.optional")})
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-honey-500/50 focus:ring-1 focus:ring-honey-500/50 transition-all"
                    placeholder={t("register.emailPlaceholder")}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-400 text-sm mt-2">{errors.email}</p>
                )}
              </div>

              {/* Referral Code (Required) */}
              <div>
                <label htmlFor="referralCode" className="block text-honey-400 font-medium mb-2 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t("register.referralCode")} *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="referralCode"
                    name="referralCode"
                    value={formData.referralCode}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-honey-500/50 focus:ring-1 focus:ring-honey-500/50 transition-all"
                    placeholder={t("register.referralCodePlaceholder")}
                  />
                </div>
                {errors.referralCode && (
                  <p className="text-red-400 text-sm mt-2">{errors.referralCode}</p>
                )}
              </div>

              {/* Next Steps */}
              <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-honey-400 font-semibold mb-3">{t("register.nextSteps.title")}</h3>
                <ul className="space-y-2 text-white text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-honey-400 mt-1">•</span>
                    <span>{t("register.nextSteps.step1")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-honey-400 mt-1">•</span>
                    <span>{t("register.nextSteps.step2")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-honey-400 mt-1">•</span>
                    <span>{t("register.nextSteps.step3")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-honey-400 mt-1">•</span>
                    <span>{t("register.nextSteps.step4")}</span>
                  </li>
                </ul>
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 text-sm">{errors.submit}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !isConnected || !formData.referralCode}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-honey-500 to-honey-600 text-black font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t("register.submitting") : t("register.submit")}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
