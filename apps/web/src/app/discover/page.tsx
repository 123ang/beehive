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
import { Wallet, Compass, MapPin, ExternalLink, Store } from "lucide-react";

interface Merchant {
  id: number;
  merchantName: string;
  logoUrl: string | null;
  description: string | null;
  location: string | null;
  contactInfo: string | null;
  merchantPageUrl: string | null;
  active: boolean;
}

export default function DiscoverPage() {
  const { isConnected, address } = useAccount();
  const { t, lang } = useTranslation();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    setLoading(true);
    try {
      const result = await api.getMerchants();
      if (result.success && result.data) {
        setMerchants(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch merchants:", error);
    } finally {
      setLoading(false);
    }
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
                {t("discover.connectWallet") || "Connect Your Wallet"}
              </h2>
              <p className="text-gray-400 mb-6">
                {t("discover.connectWalletDesc") || "Connect your wallet to discover merchants"}
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
              <span className="text-gradient-gold">{t("discover.title") || "Discover"}</span>
            </h1>
            <p className="text-gray-400 mt-2">
              {t("discover.subtitle") || "Explore our partner merchants and their offerings"}
            </p>
          </motion.div>

          {/* Merchants Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
          ) : merchants.length === 0 ? (
            <div className="text-center py-12">
              <Compass className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                {t("discover.noMerchants") || "No merchants available"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {merchants.map((merchant, index) => (
                <motion.div
                  key={merchant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-glass rounded-xl overflow-hidden border border-gray-700/30 hover:border-yellow-500/50 transition-all"
                >
                  {/* Merchant Logo/Image */}
                  <div className="relative h-48 bg-gradient-to-br from-green-900/30 to-emerald-800/20 flex items-center justify-center">
                    {merchant.logoUrl ? (
                      <img
                        src={merchant.logoUrl}
                        alt={merchant.merchantName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="w-16 h-16 text-green-400/50" />
                    )}
                  </div>

                  {/* Merchant Details */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">{merchant.merchantName}</h3>
                    {merchant.description && (
                      <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                        {merchant.description}
                      </p>
                    )}

                    {/* Location */}
                    {merchant.location && (
                      <div className="flex items-center gap-2 mb-3 text-gray-400 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>{merchant.location}</span>
                      </div>
                    )}

                    {/* Contact Info */}
                    {merchant.contactInfo && (
                      <div className="mb-4">
                        <p className="text-gray-400 text-xs mb-1">
                          {t("discover.contact") || "Contact"}
                        </p>
                        <p className="text-white text-sm">{merchant.contactInfo}</p>
                      </div>
                    )}

                    {/* Visit Button */}
                    {merchant.merchantPageUrl && (
                      <Button
                        onClick={() => window.open(merchant.merchantPageUrl || "", "_blank")}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {t("discover.visitMerchant") || "Visit Merchant"}
                      </Button>
                    )}
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

