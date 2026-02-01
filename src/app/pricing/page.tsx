import Link from 'next/link'
import { PricingCards } from '@/components/billing/pricing-cards'

export const metadata = {
  title: 'Pricing - SparkVotEDU',
  description: 'Simple, transparent pricing. Choose the plan that fits your classroom.',
}

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose the plan that fits your classroom
        </p>
      </div>

      {/* Pricing cards (public mode -- no currentTier) */}
      <div className="mt-12">
        <PricingCards />
      </div>

      {/* Sign in link */}
      <p className="mt-12 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  )
}
