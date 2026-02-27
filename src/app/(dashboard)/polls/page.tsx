import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BarChart3, Archive } from 'lucide-react'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getPollsByTeacherDAL } from '@/lib/dal/poll'
import { PollCardList } from '@/components/poll/poll-card-list'

export default async function PollsPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const polls = await getPollsByTeacherDAL(teacher.id)

  // Serialize dates for client rendering and filter out archived
  const serialized = polls
    .map((p) => ({
      id: p.id,
      question: p.question,
      pollType: p.pollType,
      status: p.status,
      updatedAt: p.updatedAt.toISOString(),
      _count: p._count,
      sessionId: p.sessionId ?? null,
      sessionCode: p.session?.code ?? null,
      sessionName: p.session?.name ?? null,
    }))
    .filter((p) => p.status !== 'archived')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Polls</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/polls/archived"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Archive className="h-4 w-4" />
            Archived
          </Link>
          <Link
            href="/polls/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Poll
          </Link>
        </div>
      </div>

      {serialized.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <BarChart3 className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No polls yet</p>
          <Link
            href="/polls/new"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create your first poll
          </Link>
        </div>
      ) : (
        <PollCardList
          polls={serialized}
          sessions={(() => {
            const seen = new Set<string>()
            const sessions: { id: string; name: string | null; code: string }[] = []
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
