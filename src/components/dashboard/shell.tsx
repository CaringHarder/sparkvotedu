import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getTeacherSessions, migrateOrphanActivities } from '@/lib/dal/class-session'
import { getTeacherBillingOverview } from '@/lib/dal/billing'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Users, Sparkles } from 'lucide-react'
import { SessionCreator } from '@/components/teacher/session-creator'
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
  const dropdownSessions = [...activeSessions].sort((a, b) => {
    const nameA = (a.name || '').toLowerCase()
    const nameB = (b.name || '').toLowerCase()
    return nameA.localeCompare(nameB)
  })
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

      {/* Create Session + Plan grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Inline Session Creator */}
        <div className="flex items-start">
          <SessionCreator />
        </div>

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

      {/* Session Quick-Switch + Active Sessions */}
      {activeSessions.length > 0 && (
        <>
          <DashboardSessionDropdown
            sessions={dropdownSessions.map(s => ({
              id: s.id,
              name: s.name,
              code: s.code,
              _count: { participants: s._count.participants },
            }))}
          />
          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">Active Sessions</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeSessions.slice(0, 6).map((session) => (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="group rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:border-brand-amber/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-foreground">{session.name || `Unnamed Session \u2014 ${new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}</p>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Active
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xl font-bold tracking-wider text-brand-amber">
                    {session.code}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {session._count.participants} student{session._count.participants !== 1 ? 's' : ''}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {activeSessions.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue/10">
            <Sparkles className="h-7 w-7 text-brand-blue" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No active sessions</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a session above to start engaging your students with brackets and polls.
          </p>
        </div>
      )}
    </div>
  )
}
