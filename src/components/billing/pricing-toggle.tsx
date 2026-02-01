'use client'

import type { BillingInterval } from '@/config/pricing'

interface PricingToggleProps {
  interval: BillingInterval
  onIntervalChange: (interval: BillingInterval) => void
}

export function PricingToggle({ interval, onIntervalChange }: PricingToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full bg-muted p-1">
      <button
        type="button"
        onClick={() => onIntervalChange('monthly')}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          interval === 'monthly'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onIntervalChange('annual')}
        className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          interval === 'annual'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Annual
        <span className="ml-1.5 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Save ~20%
        </span>
      </button>
    </div>
  )
}
