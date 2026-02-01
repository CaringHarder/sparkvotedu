import type { SubscriptionTier } from '@/lib/gates/tiers'

const BADGE_CONFIG: Record<
  SubscriptionTier,
  { label: string; className: string }
> = {
  free: {
    label: 'Free',
    className: 'bg-muted text-muted-foreground',
  },
  pro: {
    label: 'Pro',
    className: 'bg-primary/10 text-primary',
  },
  pro_plus: {
    label: 'Pro Plus',
    className:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  },
}

interface PlanBadgeProps {
  tier: SubscriptionTier
}

/**
 * Color-coded plan name badge.
 *
 * Renders a small rounded badge showing the current plan:
 * - Free: neutral (muted) styling
 * - Pro: primary accent styling
 * - Pro Plus: amber/gold styling with dark mode support
 */
export function PlanBadge({ tier }: PlanBadgeProps) {
  const config = BADGE_CONFIG[tier]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
