import { MarketingNavbar } from '../components/marketing/navbar/MarketingNavbar';
import { HeroSection } from '../components/marketing/hero/HeroSection';
import { LogoStrip } from '../components/marketing/sections/LogoStrip';
import { ProblemSection } from '../components/marketing/sections/ProblemSection';
import { ProductShowcase } from '../components/marketing/sections/ProductShowcase';
import { BranchNetwork } from '../components/marketing/sections/BranchNetwork';
import { IndustryGrid } from '../components/marketing/sections/IndustryGrid';
import { HowItWorks } from '../components/marketing/sections/HowItWorks';
import { OfflineSection } from '../components/marketing/sections/OfflineSection';
import { PricingSection } from '../components/marketing/sections/PricingSection';
import { FAQSection } from '../components/marketing/sections/FAQSection';
import { FinalCTA } from '../components/marketing/sections/FinalCTA';
import { MarketingFooter } from '../components/marketing/footer/MarketingFooter';
import { useAuthStore } from '../stores/authStore';
import { Navigate } from 'react-router-dom';

export function MarketingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <MarketingNavbar />
      <main>
        <HeroSection />
        <LogoStrip />
        <ProblemSection />
        <ProductShowcase />
        <BranchNetwork />
        <IndustryGrid />
        <HowItWorks />
        <OfflineSection />
        <PricingSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <MarketingFooter />
    </div>
  );
}
