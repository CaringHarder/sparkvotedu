import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getArchivedSessions } from '@/lib/dal/class-session'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ArchivedSessionsClient } from './archived-sessions-client'

interface ArchivedSessionsPageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function ArchivedSessionsPage({
  searchParams,
}: ArchivedSessionsPageProps) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const { search } = await searchParams
  const sessions = await getArchivedSessions(teacher.id, search)

  // Serialize sessions to plain objects (dates to ISO strings)
  const serializedSessions = sessions.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    endedAt: s.endedAt?.toISOString() ?? null,
    archivedAt: s.archivedAt?.toISOString() ?? null,
    participantCount: s._count.participants,
    bracketCount: s._count.brackets,
    pollCount: s._count.polls,
  }))

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/sessions"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Archived Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Recover or permanently delete archived sessions.
          </p>
        </div>
      </div>

      <ArchivedSessionsClient
        sessions={serializedSessions}
        initialSearch={search ?? ''}
      />
    </div>
  )
}
