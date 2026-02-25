import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getArchivedPollsDAL } from '@/lib/dal/poll'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ArchivedPollsClient } from './archived-polls-client'

export default async function ArchivedPollsPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const polls = await getArchivedPollsDAL(teacher.id)

  // Serialize dates to ISO strings for client components
  const serialized = polls.map((p) => ({
    id: p.id,
    question: p.question,
    pollType: p.pollType,
    status: p.status,
    updatedAt: p.updatedAt.toISOString(),
    _count: p._count,
  }))

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/polls"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Archived Polls</h1>
          <p className="text-sm text-muted-foreground">
            Recover or permanently delete archived polls.
          </p>
        </div>
      </div>

      <ArchivedPollsClient polls={serialized} />
    </div>
  )
}
