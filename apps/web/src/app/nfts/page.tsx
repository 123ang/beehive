"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { useTranslation } from "@/i18n/TranslationProvider";
import { Wallet, Gem, ShoppingCart, CheckCircle } from "lucide-react";

interface NFTCollection {
  id: number;
  shortName: string;
  name: string;
  description: string | null;
  bccReward: string;
  imageUrl: string | null;
  active: boolean;
  maxSupply: number;
  minted: number;
  contractCollectionId: number | null;
}

export default function NFTsPage() {
  const { isConnected, address } = useAccount();
  const { t, lang } = useTranslation();
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const result = await api.getNFTCollections();
      if (result.success && result.data) {
        setCollections(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch NFT collections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (collection: NFTCollection) => {
    // TODO: Implement NFT purchase flow
    console.log("Purchase NFT:", collection);
    alert(t("nft.purchaseComingSoon") || "Purchase functionality coming soon!");
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
                {t("nft.connectWallet") || "Connect Your Wallet"}
              </h2>
              <p className="text-gray-400 mb-6">
                {t("nft.connectWalletDesc") || "Connect your wallet to view and purchase NFTs"}
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
              <span className="text-gradient-gold">{t("nft.title") || "NFT Collections"}</span>
            </h1>
            <p className="text-gray-400 mt-2">
              {t("nft.subtitle") || "Discover and purchase exclusive NFT collections"}
            </p>
          </motion.div>

          {/* NFT Collections Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12">
              <Gem className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                {t("nft.noCollections") || "No NFT collections available"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection, index) => (
                <motion.div
                  key={collection.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-glass rounded-xl overflow-hidden border border-gray-700/30 hover:border-yellow-500/50 transition-all"
                >
                  {/* NFT Image */}
                  <div className="relative h-64 bg-gradient-to-br from-yellow-900/30 to-orange-800/20 flex items-center justify-center">
                    {collection.imageUrl ? (
                      <img
                        src={collection.imageUrl}
                        alt={collection.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Gem className="w-24 h-24 text-yellow-400/50" />
                    )}
                    <div className="absolute top-4 right-4 bg-yellow-500/20 backdrop-blur-sm px-3 py-1 rounded-full border border-yellow-500/50">
                      <span className="text-yellow-400 text-xs font-semibold">
                        {collection.shortName}
                      </span>
                    </div>
                  </div>

                  {/* NFT Details */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">{collection.name}</h3>
                    {collection.description && (
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {collection.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-xs mb-1">
                          {t("nft.minted") || "Minted"}
                        </p>
                        <p className="text-white font-semibold">
                          {collection.minted} / {collection.maxSupply}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">
                          {t("nft.bccReward") || "BCC Reward"}
                        </p>
                        <p className="text-yellow-400 font-semibold">
                          {formatNumber(parseFloat(collection.bccReward || "0"), 2)} BCC
                        </p>
                      </div>
                    </div>

                    {/* Purchase Button */}
                    <Button
                      onClick={() => handlePurchase(collection)}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                      disabled={collection.minted >= collection.maxSupply || !collection.active}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {collection.minted >= collection.maxSupply
                        ? t("nft.soldOut") || "Sold Out"
                        : t("nft.purchase") || "Purchase"}
                    </Button>
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

