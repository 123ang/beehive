"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link2, Copy, Check, Users } from "lucide-react";
import { useAccount } from "wagmi";

interface ReferralData {
  referralCode: string;
  memberId: string;
  referralLink: string;
}

export function ReferralLink() {
  const { address, isConnected } = useAccount();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      generateReferralCode();
    }
  }, [isConnected, address]);

  const generateReferralCode = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/referral/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ walletAddress: address }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setReferralData(data.data);
      }
    } catch (error) {
      console.error("Error generating referral code:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!referralData) return;

    try {
      await navigator.clipboard.writeText(referralData.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  if (!isConnected || loading) {
    return null;
  }

  if (!referralData) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-glass rounded-2xl p-6 border border-white/10"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-honey-500/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-honey-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Your Referral Link</h3>
          <p className="text-gray-400 text-sm">
            Member ID: {referralData.memberId}
          </p>
        </div>
      </div>

      {/* Referral Code */}
      <div className="mb-4">
        <label className="block text-gray-400 text-sm mb-2">
          Referral Code
        </label>
        <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-honey-400 font-mono font-semibold">
            {referralData.referralCode}
          </p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="mb-4">
        <label className="block text-gray-400 text-sm mb-2">
          Referral Link
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white text-sm truncate">
              {referralData.referralLink}
            </p>
          </div>
          <button
            onClick={copyToClipboard}
            className="px-4 py-3 rounded-xl bg-honey-500/20 hover:bg-honey-500/30 border border-honey-500/50 text-honey-400 transition-all flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <p className="text-blue-400 text-sm">
          <strong>💡 Tip:</strong> Share this link with friends to earn rewards
          when they join and upgrade their membership!
        </p>
      </div>
    </motion.div>
  );
}

