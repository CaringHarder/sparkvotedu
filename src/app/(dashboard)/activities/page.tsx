import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trophy, BarChart3 } from 'lucide-react'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getTeacherBrackets } from '@/lib/dal/bracket'
import { getPollsByTeacherDAL } from '@/lib/dal/poll'
import { ActivitiesList } from './activities-list'

export default async function ActivitiesPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const [brackets, polls] = await Promise.all([
    getTeacherBrackets(teacher.id),
    getPollsByTeacherDAL(teacher.id),
  ])

  // Serialize brackets into a unified shape
  const bracketItems = brackets.map((b) => ({
    id: b.id,
    name: b.name,
    type: 'bracket' as const,
    status: b.status,
    updatedAt: b.createdAt.toISOString(),
    sessionId: b.sessionId ?? null,
    sessionName: b.session?.name ?? null,
    meta: {
      size: b.size,
      entrants: b._count?.entrants ?? 0,
      sessionCode: b.session?.code ?? null,
      bracketType: b.bracketType,
      viewingMode: b.viewingMode,
      roundRobinPacing: b.roundRobinPacing ?? null,
      predictiveMode: b.predictiveMode ?? null,
      sessionName: b.session?.name ?? null,
    },
  }))

  // Serialize polls into a unified shape
  const pollItems = polls.map((p) => ({
    id: p.id,
    name: p.question,
    type: 'poll' as const,
    status: p.status,
    updatedAt: p.updatedAt.toISOString(),
    sessionId: p.sessionId ?? null,
    sessionName: p.session?.name ?? null,
    meta: {
      pollType: p.pollType,
      votes: p._count?.votes ?? 0,
      sessionName: p.session?.name ?? null,
    },
  }))

  // Merge and sort by updatedAt descending
  const allItems = [...bracketItems, ...pollItems].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activities</h1>
          <p className="text-sm text-muted-foreground">
            Manage your brackets and polls
          </p>
        </div>
        <CreateNewDropdown />
      </div>

      {allItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No activities yet. Create your first bracket or poll to get started!
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/brackets/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              <Trophy className="h-4 w-4" />
              New Bracket
            </Link>
            <Link
              href="/polls/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <BarChart3 className="h-4 w-4" />
              New Poll
            </Link>
          </div>
        </div>
      ) : (
        <ActivitiesList
          items={allItems}
          sessions={(() => {
            const seen = new Set<string>()
            const sessions: { id: string; name: string | null; code: string }[] = []
            for (const b of brackets) {
              if (b.session && !seen.has(b.session.id)) {
                seen.add(b.session.id)
                sessions.push({ id: b.session.id, name: b.session.name, code: b.session.code })
              }
            }
            for (const p of polls) {
              if (p.session && !seen.has(p.session.id)) {
                seen.add(p.session.id)
                sessions.push({ id: p.session.id, name: p.session.name, code: p.session.code })
              }
            }
            return sessions
          })()}
        />
      )}
    </div>
  )
}

function CreateNewDropdown() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/brackets/new"
        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        <Trophy className="h-4 w-4 text-amber-600" />
        New Bracket
      </Link>
      <Link
        href="/polls/new"
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        New Poll
      </Link>
    </div>
  )
}
