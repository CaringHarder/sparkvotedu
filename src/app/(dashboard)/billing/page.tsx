import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getTeacherBillingOverview } from '@/lib/dal/billing'
import { createPortalSession } from '@/actions/billing'
import { PricingCards } from '@/components/billing/pricing-cards'
import { TIER_LIMITS, type SubscriptionTier } from '@/lib/gates/tiers'

export const metadata = {
  title: 'Billing & Plan - SparkVotEDU',
}

function TierBadge({ tier }: { tier: SubscriptionTier }) {
  const colors: Record<SubscriptionTier, string> = {
    free: 'bg-muted text-muted-foreground',
    pro: 'bg-primary/10 text-primary',
    pro_plus: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }
  const labels: Record<SubscriptionTier, string> = {
    free: 'Free',
    pro: 'Pro',
    pro_plus: 'Pro Plus',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${colors[tier]}`}>
      {labels[tier]}
    </span>
  )
}

function UsageItem({ label, current, max }: { label: string; current: number; max: number }) {
  const limitLabel = max === Infinity ? 'Unlimited' : String(max)
  const ratio = max === Infinity ? 0 : current / max
  const atLimit = max !== Infinity && current >= max

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <span className={`text-sm ${atLimit ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
        {current} of {limitLabel}
        {ratio > 0 && ratio < 1 && (
          <span className="ml-2 inline-block h-1.5 w-16 rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </span>
        )}
      </span>
    </div>
  )
}

export default async function BillingPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const overview = await getTeacherBillingOverview(teacher.id)
  const tier = (overview.tier || 'free') as SubscriptionTier
  const limits = TIER_LIMITS[tier]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription and view usage
        </p>
      </div>

      {/* Current plan section */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
            <div className="mt-1.5">
              <TierBadge tier={tier} />
            </div>
          </div>

          {/* Manage Subscription button (only for Stripe customers) */}
          {teacher.stripeCustomerId && (
            <form
              action={async () => {
                'use server'
                await createPortalSession()
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Manage Subscription
              </button>
            </form>
          )}
        </div>

        {/* Cancellation notice */}
        {overview.subscription?.cancelAtPeriodEnd && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            Your plan will be downgraded to Free on{' '}
            {new Date(overview.subscription.stripeCurrentPeriodEnd).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        )}

        {/* Usage summary */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <UsageItem
            label="Live brackets"
            current={overview.usage.liveBrackets}
            max={limits.maxLiveBrackets}
          />
          <UsageItem
            label="Draft brackets"
            current={overview.usage.draftBrackets}
            max={limits.maxDraftBrackets}
          />
          <UsageItem
            label="Total polls"
            current={overview.usage.totalPolls}
            max={Infinity}
          />
        </div>
      </div>

      {/* Pricing comparison */}
      <div>
        <h2 className="mb-6 text-lg font-semibold">Compare Plans</h2>
        <PricingCards currentTier={tier} />
      </div>
    </div>
  )
}
