'use client'

import { Lock } from 'lucide-react'
import Link from 'next/link'
import type { SubscriptionTier } from '@/lib/gates/tiers'

const TIER_ORDER: readonly SubscriptionTier[] = ['free', 'pro', 'pro_plus']

const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  pro: 'Pro',
  pro_plus: 'Pro Plus',
}

interface UpgradePromptProps {
  currentTier: SubscriptionTier
  requiredTier: SubscriptionTier
  featureName: string
  /** Optional link to billing/upgrade page. If provided, the icon becomes clickable. */
  href?: string
}

/**
 * Non-intrusive upgrade prompt: inline lock icon with hover tooltip.
 *
 * Shows a small lock icon that reveals a tooltip on hover indicating
 * which tier is needed to unlock the feature. Per CONTEXT.md: passive
 * nudge only -- no modals, no banners, no blocking overlays.
 *
 * Safety guard: does not render if currentTier >= requiredTier.
 */
export function UpgradePrompt({
  currentTier,
  requiredTier,
  featureName,
  href,
}: UpgradePromptProps) {
  // Safety guard: don't show if user already has access
  const currentIndex = TIER_ORDER.indexOf(currentTier)
  const requiredIndex = TIER_ORDER.indexOf(requiredTier)
  if (currentIndex >= requiredIndex) {
    return null
  }

  const tierLabel = TIER_LABELS[requiredTier]

  const content = (
    <div className="group relative inline-flex items-center gap-1 text-muted-foreground">
      <Lock className="h-3.5 w-3.5" />
      <span className="invisible absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:visible">
        Upgrade to {tierLabel} to unlock {featureName}
      </span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {content}
      </Link>
    )
  }

  return content
}
