import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getTeacherBrackets } from '@/lib/dal/bracket'
import { BracketCard } from '@/components/bracket/bracket-card'

export default async function BracketsPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const brackets = await getTeacherBrackets(teacher.id)

  // Serialize dates to ISO strings for client components
  const serialized = brackets.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    size: b.size,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    _count: b._count,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Brackets</h1>
        <Link
          href="/brackets/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Bracket
        </Link>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {serialized.map((bracket) => (
            <BracketCard key={bracket.id} bracket={bracket} />
          ))}
        </div>
      )}
    </div>
  )
}
