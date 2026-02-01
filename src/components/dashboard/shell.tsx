import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getTeacherSessions } from '@/lib/dal/class-session'
import { getTeacherBillingOverview } from '@/lib/dal/billing'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'
import { PlanBadge } from '@/components/billing/plan-badge'
import { TIER_LIMITS, type SubscriptionTier } from '@/lib/gates/tiers'

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
  const activeSessions = sessions.filter(s => s.status === 'active')
  const tier = (billing.tier || 'free') as SubscriptionTier
  const limits = TIER_LIMITS[tier]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {displayName}
        </h1>
        <p className="text-muted-foreground">
          Here is your teaching dashboard
        </p>
      </div>

      <div className="flex items-center gap-2">
        <PlanBadge tier={tier} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/sessions"
          className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Create Session</p>
            <p className="text-sm text-muted-foreground">Start a new class session</p>
          </div>
        </Link>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Plan &amp; Usage
            </p>
            <PlanBadge tier={tier} />
          </div>
          <div className="mt-3 space-y-1.5 text-sm">
            {limits.maxLiveBrackets === Infinity ? (
              <p>
                <span className="font-medium">{billing.usage.liveBrackets}</span>{' '}
                live brackets
              </p>
            ) : (
              <p>
                <span className="font-medium">{billing.usage.liveBrackets}</span>{' '}
                of {limits.maxLiveBrackets} live brackets
              </p>
            )}
            {limits.maxDraftBrackets === Infinity ? (
              <p>
                <span className="font-medium">{billing.usage.draftBrackets}</span>{' '}
                draft brackets
              </p>
            ) : (
              <p>
                <span className="font-medium">{billing.usage.draftBrackets}</span>{' '}
                of {limits.maxDraftBrackets} draft brackets
              </p>
            )}
          </div>
          <Link
            href="/billing"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View Plan <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {activeSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Sessions</h2>
            <Link
              href="/sessions"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeSessions.slice(0, 3).map((session) => (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
              >
                <p className="font-medium">{session.name || 'Unnamed Session'}</p>
                <p className="mt-1 font-mono text-lg font-bold">{session.code}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {session._count.participants} student{session._count.participants !== 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {activeSessions.length === 0 && (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No active sessions yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a session to get your students engaged.
          </p>
        </div>
      )}
    </div>
  )
}
