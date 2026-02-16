import { LandingNav } from '@/components/landing/landing-nav'
import { HeroSection } from '@/components/landing/hero-section'
import { HowItWorksSection } from '@/components/landing/how-it-works-section'
import { UseCasesSection } from '@/components/landing/use-cases-section'
import { WhyTeachersSection } from '@/components/landing/why-teachers-section'
import { PricingSection } from '@/components/landing/pricing-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { TrustSection } from '@/components/landing/trust-section'
import { FinalCTASection } from '@/components/landing/final-cta-section'
import { LandingFooter } from '@/components/landing/landing-footer'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <UseCasesSection />
        <WhyTeachersSection />
        <PricingSection />
        <FeaturesSection />
        <TrustSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  )
}
