/**
 * Feature gate functions for SparkVotEDU.
 *
 * All functions are PURE -- no database calls, no side effects, no async.
 * They take a subscription tier + context and return an AccessResult.
 *
 * The caller is responsible for looking up the user's tier from the
 * Teacher record, then passing it to these functions.
 *
 * Usage:
 *   const tier = teacher.subscriptionTier; // from database
 *   const result = canAccess(tier, 'analytics');
 *   if (!result.allowed) {
 *     // show upgrade prompt with result.reason and result.upgradeTarget
 *   }
 */

import { TIER_LIMITS, type SubscriptionTier } from './tiers';

export type FeatureKey = keyof typeof TIER_LIMITS.free;

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  upgradeTarget?: SubscriptionTier;
}

/**
 * Ordered tiers from lowest to highest. Used to find the minimum
 * tier that provides a given feature.
 */
const TIER_ORDER: readonly SubscriptionTier[] = ['free', 'pro', 'pro_plus'] as const;

/**
 * Find the minimum tier that provides a boolean feature.
 * Returns undefined if no tier provides it (shouldn't happen with valid FeatureKey).
 */
function findMinimumTierForBooleanFeature(feature: FeatureKey): SubscriptionTier | undefined {
  for (const t of TIER_ORDER) {
    if (TIER_LIMITS[t][feature] === true) {
      return t;
    }
  }
  return undefined;
}

/**
 * Determine the smart upgrade target for a given tier and feature.
 *
 * If the feature is not available on 'pro' (e.g., sportsIntegration),
 * then even a 'free' user's upgradeTarget should be 'pro_plus', not 'pro'.
 */
function getUpgradeTarget(currentTier: SubscriptionTier, feature: FeatureKey): SubscriptionTier {
  const minimumTier = findMinimumTierForBooleanFeature(feature);
  if (minimumTier) {
    return minimumTier;
  }
  // Fallback: next tier up
  return currentTier === 'free' ? 'pro' : 'pro_plus';
}

/**
 * Check if a tier can access a boolean feature (analytics, csvUpload, etc.).
 *
 * For non-boolean features (numbers, arrays), this always returns allowed: true.
 * Use the specialized functions (canCreateBracket, canUseBracketType, etc.)
 * for numeric/array limit checks.
 */
export function canAccess(tier: SubscriptionTier, feature: FeatureKey): AccessResult {
  const value = TIER_LIMITS[tier][feature];

  if (typeof value === 'boolean' && !value) {
    const upgradeTarget = getUpgradeTarget(tier, feature);
    return {
      allowed: false,
      reason: `${feature} requires ${upgradeTarget} plan`,
      upgradeTarget,
    };
  }

  return { allowed: true };
}

/**
 * Check if a tier can create another bracket given the current count.
 */
export function canCreateBracket(tier: SubscriptionTier, currentCount: number): AccessResult {
  const limit = TIER_LIMITS[tier].maxBrackets;

  if (currentCount >= limit) {
    const upgradeTarget: SubscriptionTier = tier === 'free' ? 'pro' : 'pro_plus';
    return {
      allowed: false,
      reason: `Bracket limit reached (${limit}). Upgrade to ${upgradeTarget} for more brackets.`,
      upgradeTarget,
    };
  }

  return { allowed: true };
}

/**
 * Check if a tier can use a specific bracket type.
 *
 * Determines upgradeTarget by finding the first tier that includes the bracket type.
 */
export function canUseBracketType(tier: SubscriptionTier, bracketType: string): AccessResult {
  const allowedTypes: readonly string[] = TIER_LIMITS[tier].bracketTypes;

  if (!allowedTypes.includes(bracketType)) {
    // Find the minimum tier that supports this bracket type
    let upgradeTarget: SubscriptionTier = 'pro_plus';
    for (const t of TIER_ORDER) {
      if ((TIER_LIMITS[t].bracketTypes as readonly string[]).includes(bracketType)) {
        upgradeTarget = t;
        break;
      }
    }

    return {
      allowed: false,
      reason: `${bracketType} brackets require ${upgradeTarget} plan`,
      upgradeTarget,
    };
  }

  return { allowed: true };
}

/**
 * Check if a tier supports the given number of entrants per bracket.
 */
export function canUseEntrantCount(tier: SubscriptionTier, entrantCount: number): AccessResult {
  const limit = TIER_LIMITS[tier].maxEntrantsPerBracket;

  if (entrantCount > limit) {
    const upgradeTarget: SubscriptionTier = tier === 'free' ? 'pro' : 'pro_plus';
    return {
      allowed: false,
      reason: `Entrant limit is ${limit}. Upgrade to ${upgradeTarget} for more entrants.`,
      upgradeTarget,
    };
  }

  return { allowed: true };
}
