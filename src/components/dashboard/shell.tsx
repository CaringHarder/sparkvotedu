import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getTeacherSessions } from '@/lib/dal/class-session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'

export async function DashboardShell() {
  const teacher = await getAuthenticatedTeacher()

  if (!teacher) {
    redirect('/login')
  }

  const displayName = teacher.name || teacher.email
  const sessions = await getTeacherSessions(teacher.id)
  const activeSessions = sessions.filter(s => s.status === 'active')

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
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {teacher.subscriptionTier === 'free'
            ? 'Free'
            : teacher.subscriptionTier === 'pro'
              ? 'Pro'
              : 'Pro Plus'}
        </span>
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
