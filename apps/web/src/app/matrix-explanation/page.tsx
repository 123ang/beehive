"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Users, TrendingUp, Layers, DollarSign, Gift, Shield } from "lucide-react";

const matrixFeatures = [
  {
    icon: <Users className="w-6 h-6" />,
    title: "3×3 Structure",
    description: "Each member can have up to 3 direct referrals in their first level. As your network grows, you build a tree structure that expands exponentially.",
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: "19 Levels Deep",
    description: "Earn rewards from your network up to 19 layers deep. The deeper your network grows, the more earning potential you unlock.",
  },
  {
    icon: <DollarSign className="w-6 h-6" />,
    title: "Instant Payouts",
    description: "When someone in your network purchases a membership level, rewards are distributed instantly through smart contracts. No waiting, no middlemen.",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Spillover System",
    description: "If a sponsor already has 3 direct referrals, new members are placed in available positions below, benefiting the entire network.",
  },
  {
    icon: <Gift className="w-6 h-6" />,
    title: "BCC Token Rewards",
    description: "In addition to USDT rewards, earn BCC tokens with every level purchase. Build your token portfolio while growing your network.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "On-Chain Transparency",
    description: "All transactions and matrix positions are recorded on the blockchain. Verify your earnings and network structure at any time.",
  },
];

const levelRewards = [
  { level: 1, name: "Direct Sponsor", reward: "$100 USDT", description: "Earned when your direct referral purchases Level 1" },
  { level: 2, name: "Layer 2", reward: "$50 USDT", description: "Earned from 2nd layer members (your referrals' referrals)" },
  { level: 3, name: "Layer 3-19", reward: "Varies", description: "Rewards decrease with depth but multiply with network size" },
];

export default function MatrixExplanationPage() {
  return (
    <main className="min-h-screen">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-honey-400 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">
              <span className="text-white">The </span>
              <span className="text-gradient-gold">3×3 Matrix</span>
              <span className="text-white"> Explained</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Understand how our unique matrix system creates fair distribution 
              and maximizes earning potential for all members.
            </p>
          </motion.div>

          {/* Matrix Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-glass rounded-2xl p-8 mb-12"
          >
            <h2 className="text-2xl font-bold text-white mb-6 text-center font-display">
              How It Works
            </h2>
            
            {/* Simple Matrix Diagram */}
            <div className="flex flex-col items-center gap-6">
              {/* You */}
              <div className="w-16 h-16 hexagon bg-gradient-to-br from-honey-400 to-honey-600 flex items-center justify-center">
                <span className="text-black font-bold">YOU</span>
              </div>
              
              {/* Connection Lines */}
              <div className="flex items-center justify-center">
                <div className="w-1 h-8 bg-honey-500/30" />
              </div>
              
              {/* Level 1 - Your direct referrals */}
              <div className="flex gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 hexagon bg-honey-500/30 flex items-center justify-center">
                      <span className="text-honey-400 font-bold text-sm">L1</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Connection Lines */}
              <div className="flex gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-1 h-6 bg-honey-500/20" />
                ))}
              </div>
              
              {/* Level 2 */}
              <div className="flex gap-4 flex-wrap justify-center">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 hexagon bg-honey-500/20 flex items-center justify-center"
                  >
                    <span className="text-honey-400/70 font-bold text-xs">L2</span>
                  </div>
                ))}
              </div>
              
              <p className="text-gray-400 text-sm text-center mt-4">
                Each member brings 3 → Each of those brings 3 → Exponential growth!
              </p>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
          >
            {matrixFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-glass rounded-xl p-6 hover:bg-white/10 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-honey-500/20 flex items-center justify-center mb-4 text-honey-400">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Reward Structure */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-glass rounded-2xl p-8 mb-12"
          >
            <h2 className="text-2xl font-bold text-white mb-6 font-display">
              Reward Structure
            </h2>
            
            <div className="space-y-4">
              {levelRewards.map((item) => (
                <div
                  key={item.level}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-honey-500/20 flex items-center justify-center text-honey-400 font-bold">
                      {item.level}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-sm text-gray-400">{item.description}</p>
                    </div>
                  </div>
                  <div className="text-honey-400 font-bold">{item.reward}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <Link href="/membership">
              <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-honey-500 to-honey-600 text-black font-bold text-lg hover:scale-105 transition-transform">
                Start Your Journey Now
              </button>
            </Link>
            <p className="text-gray-400 text-sm mt-4">
              Join Level 1 for just $130 USDT and start building your network
            </p>
          </motion.div>
        </div>
      </div>
      
      <Footer />
    </main>
  );
}

