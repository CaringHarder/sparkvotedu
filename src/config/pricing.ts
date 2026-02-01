/**
 * Static pricing configuration for SparkVotEDU.
 *
 * Maps Stripe Price IDs (from env) to application tiers.
 * All prices are static -- no runtime Stripe API calls needed.
 *
 * Pricing: Free / Pro ($12/mo or $120/yr) / Pro Plus ($20/mo or $192/yr)
 */

export type BillingInterval = 'monthly' | 'annual'

export const FREE_PLAN = {
  name: 'Free',
  price: 0,
  features: [
    'Single-elimination brackets (4/8/16)',
    'Up to 2 live brackets',
    'Up to 2 draft brackets',
    'Simple polls (up to 6 options)',
    'Basic analytics',
  ],
} as const

export const PLANS = {
  pro: {
    name: 'Pro',
    monthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    annualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
    monthlyPrice: 12,
    annualPrice: 10, // per month, billed annually ($120/year)
    popular: true,
    features: [
      'Everything in Free plus...',
      'Unlimited brackets',
      'Full analytics + CSV export',
      'Simple and ranked polls',
      'Up to 32 entrants per bracket',
      'Up to 12 poll options',
    ],
  },
  pro_plus: {
    name: 'Pro Plus',
    monthlyPriceId: process.env.STRIPE_PRO_PLUS_MONTHLY_PRICE_ID!,
    annualPriceId: process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID!,
    monthlyPrice: 20,
    annualPrice: 16, // per month, billed annually ($192/year)
    popular: false,
    features: [
      'Everything in Pro plus...',
      'Predictive brackets',
      'Double-elimination, round-robin',
      'Non-power-of-two bracket sizes',
      'Up to 64 entrants per bracket',
      'Up to 32 poll options',
      'Sports integration',
    ],
  },
} as const

/** All 4 Stripe Price IDs for validation */
export const PRICE_IDS = [
  PLANS.pro.monthlyPriceId,
  PLANS.pro.annualPriceId,
  PLANS.pro_plus.monthlyPriceId,
  PLANS.pro_plus.annualPriceId,
]

/** Maps a Stripe Price ID to the application tier. Falls back to 'pro' for unknown IDs. */
const PRICE_TO_TIER: Record<string, 'pro' | 'pro_plus'> = {
  [PLANS.pro.monthlyPriceId]: 'pro',
  [PLANS.pro.annualPriceId]: 'pro',
  [PLANS.pro_plus.monthlyPriceId]: 'pro_plus',
  [PLANS.pro_plus.annualPriceId]: 'pro_plus',
}

export function priceIdToTier(priceId: string): 'pro' | 'pro_plus' {
  return PRICE_TO_TIER[priceId] ?? 'pro'
}
