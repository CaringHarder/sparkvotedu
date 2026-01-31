/**
 * Subscription tier definitions for SparkVotEDU.
 *
 * TIER_LIMITS is the single source of truth for what each subscription
 * tier can access. Every feature gate in the application reads from
 * this constant -- no scattered `if (tier === 'pro')` checks.
 *
 * Pricing: Free / Pro ($12/mo) / Pro Plus ($20/mo)
 */

export type SubscriptionTier = 'free' | 'pro' | 'pro_plus';

export const TIER_LIMITS = {
  free: {
    maxBrackets: 3,
    maxEntrantsPerBracket: 16,
    bracketTypes: ['single_elimination'],
    pollTypes: ['simple'],
    maxPollOptions: 6,
    analytics: false,
    sportsIntegration: false,
    csvUpload: false,
    liveEventMode: false,
    maxLiveBrackets: 2,
    maxDraftBrackets: 2,
  },
  pro: {
    maxBrackets: 25,
    maxEntrantsPerBracket: 64,
    bracketTypes: ['single_elimination', 'double_elimination', 'round_robin'],
    pollTypes: ['simple', 'ranked'],
    maxPollOptions: 12,
    analytics: true,
    sportsIntegration: false,
    csvUpload: true,
    liveEventMode: true,
    maxLiveBrackets: 10,
    maxDraftBrackets: 15,
  },
  pro_plus: {
    maxBrackets: Infinity,
    maxEntrantsPerBracket: 128,
    bracketTypes: ['single_elimination', 'double_elimination', 'round_robin', 'predictive'],
    pollTypes: ['simple', 'ranked'],
    maxPollOptions: 32,
    analytics: true,
    sportsIntegration: true,
    csvUpload: true,
    liveEventMode: true,
    maxLiveBrackets: Infinity,
    maxDraftBrackets: Infinity,
  },
} as const;
