"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { LevelsSection } from "@/components/home/LevelsSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { CTASection } from "@/components/home/CTASection";
import { api } from "@/lib/api";

export default function HomePage() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkMemberAndRedirect = async () => {
      if (!isConnected || !address) {
        setChecked(true);
        return;
      }

      try {
        // Check if the wallet address is in the member database
        const result = await api.getDashboard(address);
        if (result.success && result.data?.isMember) {
          // User is a member, redirect to dashboard
          router.push(`/user/dashboard?address=${encodeURIComponent(address)}`);
          return;
        }
      } catch (error) {
        console.error("Error checking membership:", error);
      } finally {
        setChecked(true);
      }
    };

    checkMemberAndRedirect();
  }, [isConnected, address, router]);

  // Show loading state while checking membership
  if (!checked && isConnected && address) {
    return (
      <main className="min-h-screen pb-20 md:pb-0">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20 md:pb-0">
      <Header />
      <HeroSection />
      <div id="features">
        <FeaturesSection />
      </div>
      <LevelsSection />
      <div id="how-it-works">
        <HowItWorksSection />
      </div>
      <div id="education">
        <CTASection />
      </div>
      <Footer />
      <BottomNavigation />
    </main>
  );
}
