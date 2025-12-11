"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Store, MapPin, ExternalLink, Sparkles } from "lucide-react";

interface Merchant {
  id: number;
  merchantName: string;
  logoUrl: string | null;
  description: string | null;
  location: string | null;
  merchantPageUrl: string | null;
}

export function DiscoverSection() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/members/merchants`
      );
      const data = await response.json();
      if (data.success) {
        setMerchants(data.data);
      }
    } catch (error) {
      console.error("Error fetching merchants:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-glass rounded-2xl p-8 border border-white/10">
        <div className="animate-pulse">
          <div className="h-6 bg-white/10 rounded w-32 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-glass rounded-2xl p-8 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Discover</h2>
        </div>
      </div>

      {/* Merchants Grid */}
      {merchants.length === 0 ? (
        <div className="text-center py-12">
          <Store className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No merchants available yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {merchants.map((merchant, index) => (
            <motion.div
              key={merchant.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="group bg-white/5 hover:bg-white/10 rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer"
              onClick={() => {
                if (merchant.merchantPageUrl) {
                  window.open(merchant.merchantPageUrl, "_blank");
                }
              }}
            >
              {/* Logo */}
              {merchant.logoUrl ? (
                <div className="w-16 h-16 rounded-lg bg-white/10 mb-4 overflow-hidden">
                  <img
                    src={merchant.logoUrl}
                    alt={merchant.merchantName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                  <Store className="w-8 h-8 text-purple-400" />
                </div>
              )}

              {/* Content */}
              <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-purple-400 transition-colors">
                {merchant.merchantName}
              </h3>

              {merchant.description && (
                <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                  {merchant.description}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                {merchant.location && (
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{merchant.location}</span>
                  </div>
                )}
                {merchant.merchantPageUrl && (
                  <div className="flex items-center gap-1 text-purple-400 text-sm group-hover:gap-2 transition-all">
                    <span>Visit</span>
                    <ExternalLink className="w-4 h-4" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

