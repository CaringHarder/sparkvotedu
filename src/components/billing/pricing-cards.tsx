'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import type { BillingInterval } from '@/config/pricing'
import { PLANS, FREE_PLAN } from '@/config/pricing'
import { createCheckoutSession, createPortalSession } from '@/actions/billing'
import { PricingToggle } from './pricing-toggle'
import type { SubscriptionTier } from '@/lib/gates/tiers'

const TIER_ORDER: readonly SubscriptionTier[] = ['free', 'pro', 'pro_plus'] as const

function tierIndex(tier: SubscriptionTier): number {
  return TIER_ORDER.indexOf(tier)
}

interface PlanPriceIds {
  proMonthly: string
  proAnnual: string
  proPlusMonthly: string
  proPlusAnnual: string
}

interface PricingCardsProps {
  currentTier?: SubscriptionTier
  priceIds?: PlanPriceIds
}

function SubscribeButton({
  priceId,
  label,
}: {
  priceId: string
  label: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <form
      action={async () => {
        setError(null)
        setPending(true)
        const result = await createCheckoutSession(priceId)
        // If we reach here, redirect didn't fire — must be an error
        if (result?.error) {
          setError(result.error)
        }
        setPending(false)
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? 'Redirecting…' : label}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs text-destructive">{error}</p>
      )}
    </form>
  )
}

function FeatureList({ features }: { features: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2.5 text-sm">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  )
}

export function PricingCards({ currentTier, priceIds }: PricingCardsProps) {
  const [interval, setInterval] = useState<BillingInterval>('monthly')

  const isAuthenticated = currentTier !== undefined

  // Build card data for all 3 tiers
  // Price IDs must come from server via props (process.env is undefined in client bundles)
  const cards: Array<{
    tier: SubscriptionTier
    name: string
    price: number
    priceLabel: string
    priceNote: string | null
    features: readonly string[]
    popular: boolean
    priceId: string | null
  }> = [
    {
      tier: 'free',
      name: FREE_PLAN.name,
      price: 0,
      priceLabel: '$0',
      priceNote: 'Free forever',
      features: FREE_PLAN.features,
      popular: false,
      priceId: null,
    },
    {
      tier: 'pro',
      name: PLANS.pro.name,
      price: interval === 'monthly' ? PLANS.pro.monthlyPrice : PLANS.pro.annualPrice,
      priceLabel: `$${interval === 'monthly' ? PLANS.pro.monthlyPrice : PLANS.pro.annualPrice}`,
      priceNote: interval === 'annual' ? 'per month, billed annually' : 'per month',
      features: PLANS.pro.features,
      popular: PLANS.pro.popular,
      priceId: priceIds ? (interval === 'monthly' ? priceIds.proMonthly : priceIds.proAnnual) : null,
    },
    {
      tier: 'pro_plus',
      name: PLANS.pro_plus.name,
      price: interval === 'monthly' ? PLANS.pro_plus.monthlyPrice : PLANS.pro_plus.annualPrice,
      priceLabel: `$${interval === 'monthly' ? PLANS.pro_plus.monthlyPrice : PLANS.pro_plus.annualPrice}`,
      priceNote: interval === 'annual' ? 'per month, billed annually' : 'per month',
      features: PLANS.pro_plus.features,
      popular: PLANS.pro_plus.popular,
      priceId: priceIds ? (interval === 'monthly' ? priceIds.proPlusMonthly : priceIds.proPlusAnnual) : null,
    },
  ]

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Billing interval toggle */}
      <PricingToggle interval={interval} onIntervalChange={setInterval} />

      {/* 3-column pricing grid */}
      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
        {cards.map((card) => {
          const isCurrent = isAuthenticated && currentTier === card.tier
          const isUpgrade = isAuthenticated && tierIndex(card.tier) > tierIndex(currentTier!)
          const isDowngrade = isAuthenticated && tierIndex(card.tier) < tierIndex(currentTier!)

          return (
            <div
              key={card.tier}
              className={`relative flex flex-col rounded-lg border bg-card p-6 ${
                card.popular
                  ? 'border-primary border-2 shadow-lg lg:scale-105'
                  : 'border-border'
              } ${isCurrent ? 'ring-2 ring-primary/50' : ''}`}
            >
              {/* Most Popular badge */}
              {card.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan name */}
              <h3 className="text-lg font-semibold">{card.name}</h3>

              {/* Price */}
              <div className="mt-4">
                <span className="text-4xl font-bold">{card.priceLabel}</span>
                {card.tier !== 'free' && (
                  <span className="ml-1 text-sm text-muted-foreground">/mo</span>
                )}
              </div>
              {card.priceNote && (
                <p className="mt-1 text-xs text-muted-foreground">{card.priceNote}</p>
              )}

              {/* Feature list */}
              <div className="mt-6 flex-1">
                <FeatureList features={card.features} />
              </div>

              {/* CTA button */}
              <div className="mt-8">
                {!isAuthenticated && (
                  // Public visitor mode
                  <Link
                    href="/signup"
                    className={`block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                      card.popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border bg-background text-foreground hover:bg-accent'
                    }`}
                  >
                    {card.tier === 'free' ? 'Get Started' : `Start with ${card.name}`}
                  </Link>
                )}

                {isCurrent && (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm font-semibold text-muted-foreground"
                  >
                    Current Plan
                  </button>
                )}

                {isUpgrade && card.priceId && (
                  <SubscribeButton
                    priceId={card.priceId}
                    label={`Upgrade to ${card.name}`}
                  />
                )}

                {isDowngrade && (
                  <form action={createPortalSession}>
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      Manage Subscription
                    </button>
                  </form>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
