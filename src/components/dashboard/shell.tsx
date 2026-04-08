import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getTeacherSessions, migrateOrphanActivities } from '@/lib/dal/class-session'
import { getTeacherBillingOverview } from '@/lib/dal/billing'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ArrowRight, Sparkles, Zap } from 'lucide-react'
import { PlanBadge } from '@/components/billing/plan-badge'
import { TIER_LIMITS, type SubscriptionTier } from '@/lib/gates/tiers'
import { DashboardSessionDropdown } from '@/components/dashboard/dashboard-session-dropdown'

export async function DashboardShell() {
  const teacher = await getAuthenticatedTeacher()

  if (!teacher) {
    redirect('/login')
  }

  const displayName = teacher.name || teacher.email
  const [sessions, billing] = await Promise.all([
    getTeacherSessions(teacher.id),
    getTeacherBillingOverview(teacher.id),
  ])
  // D-13: Silently migrate orphan activities to "General" session
  await migrateOrphanActivities(teacher.id)

  const activeSessions = sessions.filter(s => s.status === 'active')
  const tier = (billing.tier || 'free') as SubscriptionTier
  const limits = TIER_LIMITS[tier]

  // Calculate usage percentages for progress bars
  const liveBracketPct = limits.maxLiveBrackets === Infinity
    ? 0
    : Math.round((billing.usage.liveBrackets / limits.maxLiveBrackets) * 100)
  const draftBracketPct = limits.maxDraftBrackets === Infinity
    ? 0
    : Math.round((billing.usage.draftBrackets / limits.maxDraftBrackets) * 100)

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, <span className="text-brand-blue">{displayName}</span>
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here is your teaching dashboard
        </p>
      </div>

      {/* Action cards grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Create Session card -- primary CTA */}
        <Link
          href="/sessions"
          className="group relative overflow-hidden rounded-xl border border-brand-blue/20 bg-gradient-to-br from-brand-blue/5 via-background to-brand-blue/10 p-5 shadow-sm transition-all duration-200 hover:border-brand-blue/40 hover:shadow-md dark:from-brand-blue/10 dark:to-brand-blue/5"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blue text-white shadow-sm">
              <Plus className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">Create Session</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Start a new class session and engage your students
              </p>
            </div>
          </div>
          {/* Hover arrow indicator */}
          <ArrowRight className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-blue opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
        </Link>

        {/* Plan & Usage card */}
        <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Plan & Usage</p>
            <PlanBadge tier={tier} />
          </div>

          <div className="mt-4 space-y-3">
            {/* Live brackets usage */}
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Live brackets</span>
                <span className="font-medium tabular-nums">
                  {limits.maxLiveBrackets === Infinity
                    ? billing.usage.liveBrackets
                    : `${billing.usage.liveBrackets} / ${limits.maxLiveBrackets}`}
                </span>
              </div>
              {limits.maxLiveBrackets !== Infinity && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-brand-blue transition-all duration-300"
                    style={{ width: `${Math.min(liveBracketPct, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Draft brackets usage */}
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Draft brackets</span>
                <span className="font-medium tabular-nums">
                  {limits.maxDraftBrackets === Infinity
                    ? billing.usage.draftBrackets
                    : `${billing.usage.draftBrackets} / ${limits.maxDraftBrackets}`}
                </span>
              </div>
              {limits.maxDraftBrackets !== Infinity && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-brand-amber transition-all duration-300"
                    style={{ width: `${Math.min(draftBracketPct, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          <Link
            href="/billing"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:underline"
          >
            Manage Plan <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Session Quick-Switch (D-16, D-17) */}
      {activeSessions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">Active Sessions</h2>
          <DashboardSessionDropdown
            sessions={activeSessions.map(s => ({
              id: s.id,
              name: s.name,
              code: s.code,
              _count: { participants: s._count.participants },
            }))}
          />
        </div>
      )}

      {/* Empty state */}
      {activeSessions.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue/10">
            <Sparkles className="h-7 w-7 text-brand-blue" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No active sessions</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a session to start engaging your students with brackets and polls.
          </p>
          <Link
            href="/sessions"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-blue-dark"
          >
            <Zap className="h-4 w-4" />
            Create your first session
          </Link>
        </div>
      )}
    </div>
  )
}
