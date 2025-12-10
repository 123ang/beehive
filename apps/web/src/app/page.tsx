import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { LevelsSection } from "@/components/home/LevelsSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { CTASection } from "@/components/home/CTASection";

export default function HomePage() {
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
