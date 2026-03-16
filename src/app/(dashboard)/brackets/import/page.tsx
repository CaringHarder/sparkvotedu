import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'
import { TournamentBrowser } from '@/components/bracket/tournament-browser'

// ESPN provider fetches multiple dates + creates 68 entrants + 67 matchups
export const maxDuration = 60

export default async function ImportTournamentPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  // Fetch active sessions for this teacher
  const sessions = await prisma.classSession.findMany({
    where: { teacherId: teacher.id, status: 'active' },
    select: { id: true, code: true, name: true },
    orderBy: { createdAt: 'desc' },
  })

  // Serialize to plain objects for client component
  const serializedSessions = sessions.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
  }))

  return (
    <div className="space-y-6">
      {/* Breadcrumb + heading */}
      <div className="space-y-2">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/brackets"
            className="transition-colors hover:text-foreground"
          >
            Brackets
          </Link>
          <span>/</span>
          <span className="text-foreground">Import Tournament</span>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/brackets"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight">
              Import Sports Tournament
            </h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Browse available NCAA March Madness tournaments and import them as
          interactive sports brackets for your class.
        </p>
      </div>

      {/* Tournament browser */}
      <TournamentBrowser sessions={serializedSessions} />
    </div>
  )
}
