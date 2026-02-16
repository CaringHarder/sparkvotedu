import { PricingCards } from '@/components/billing/pricing-cards'

export function PricingSection() {
  return (
    <section className="w-full bg-brand-blue-light/30 dark:bg-brand-blue-light/15">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        {/* Section heading */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Plans for Every Classroom
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Start free with everything you need. Upgrade for advanced brackets,
            analytics, and more.
          </p>
        </div>

        {/* Reuse PricingCards in public mode (no props = public visitor) */}
        <PricingCards />
      </div>
    </section>
  )
}
