import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getArchivedBracketsDAL } from '@/lib/dal/bracket'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ArchivedBracketsClient } from './archived-brackets-client'

export default async function ArchivedBracketsPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const brackets = await getArchivedBracketsDAL(teacher.id)

  // Serialize dates to ISO strings for client components
  const serialized = brackets.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    size: b.size,
    status: b.status,
    bracketType: b.bracketType,
    createdAt: b.createdAt.toISOString(),
    _count: b._count,
    sessionCode: b.session?.code ?? null,
  }))

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/brackets"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Archived Brackets</h1>
          <p className="text-sm text-muted-foreground">
            Recover or permanently delete archived brackets.
          </p>
        </div>
      </div>

      <ArchivedBracketsClient brackets={serialized} />
    </div>
  )
}
