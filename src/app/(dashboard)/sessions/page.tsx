import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getTeacherSessions } from '@/lib/dal/class-session'
import { SessionCreator } from '@/components/teacher/session-creator'
import { DashboardSessionDropdown } from '@/components/dashboard/dashboard-session-dropdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SessionCardMenu } from '@/components/teacher/session-card-menu'
import Link from 'next/link'

export default async function SessionsPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const sessions = await getTeacherSessions(teacher.id)
  const activeSessions = sessions.filter(s => s.status === 'active')
  const dropdownSessions = [...activeSessions].sort((a, b) => {
    const nameA = (a.name || '').toLowerCase()
    const nameB = (b.name || '').toLowerCase()
    return nameA.localeCompare(nameB)
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Sessions</h1>
        <p className="text-muted-foreground">
          Create and manage your class sessions.
        </p>
      </div>

      {activeSessions.length > 0 && (
        <DashboardSessionDropdown
          sessions={dropdownSessions.map(s => ({
            id: s.id,
            name: s.name,
            code: s.code,
            _count: { participants: s._count.participants },
          }))}
        />
      )}

      <SessionCreator />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sessions yet. Create one above to get started.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <div key={session.id} className="relative">
                <Link
                  href={`/sessions/${session.id}`}
                  className="block"
                >
                  <Card className="transition-shadow hover:shadow-md cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base pr-8">
                          {session.name || `Unnamed Session \u2014 ${new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </CardTitle>
                        <Badge
                          variant={
                            session.status === 'active'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {session.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-lg font-bold">
                          {session.code}
                        </span>
                        <span className="text-muted-foreground">
                          {session._count.participants} student
                          {session._count.participants !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Created{' '}
                        {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
                <div className="absolute right-3 top-3 z-10">
                  <SessionCardMenu
                    sessionId={session.id}
                    sessionName={session.name}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
