import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trophy, Archive } from 'lucide-react'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getTeacherBrackets } from '@/lib/dal/bracket'
import { BracketCardList } from '@/components/bracket/bracket-card-list'

export default async function BracketsPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const brackets = await getTeacherBrackets(teacher.id)

  // Serialize dates to ISO strings for client components
  const serialized = brackets
    .map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      size: b.size,
      status: b.status,
      bracketType: b.bracketType,
      createdAt: b.createdAt.toISOString(),
      _count: b._count,
      sessionCode: b.session?.code ?? null,
      sessionId: b.sessionId ?? null,
      sessionName: b.session?.name ?? null,
      viewingMode: b.viewingMode,
      roundRobinPacing: b.roundRobinPacing ?? null,
      predictiveMode: b.predictiveMode ?? null,
      predictiveResolutionMode: b.predictiveResolutionMode ?? null,
      sportGender: b.sportGender ?? null,
    }))
    .filter((b) => b.status !== 'archived')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Brackets</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/brackets/archived"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Archive className="h-4 w-4" />
            Archived
          </Link>
          <Link
            href="/brackets/import"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Trophy className="h-4 w-4" />
            Import Tournament
          </Link>
          <Link
            href="/brackets/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Bracket
          </Link>
        </div>
      </div>

      {serialized.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">No brackets yet</p>
          <Link
            href="/brackets/new"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create your first bracket
          </Link>
        </div>
      ) : (
        <BracketCardList
          brackets={serialized}
          sessions={(() => {
            const seen = new Set<string>()
            const sessions: { id: string; name: string | null; code: string }[] = []
            for (const b of brackets) {
              if (b.session && !seen.has(b.session.id)) {
                seen.add(b.session.id)
                sessions.push({ id: b.session.id, name: b.session.name, code: b.session.code })
              }
            }
            return sessions
          })()}
        />
      )}
    </div>
  )
}
