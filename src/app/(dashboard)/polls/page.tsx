import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BarChart3 } from 'lucide-react'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getPollsByTeacherDAL } from '@/lib/dal/poll'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PollStatusBadge } from '@/components/poll/poll-status'
import type { PollStatus } from '@/lib/poll/types'

export default async function PollsPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const polls = await getPollsByTeacherDAL(teacher.id)

  // Serialize dates for client rendering
  const serialized = polls.map((p) => ({
    id: p.id,
    question: p.question,
    description: p.description,
    pollType: p.pollType,
    status: p.status as PollStatus,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    options: p.options.map((o) => ({
      id: o.id,
      text: o.text,
      position: o.position,
    })),
    _count: p._count,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Polls</h1>
        <Link
          href="/polls/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Poll
        </Link>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {serialized.map((poll) => (
            <Link key={poll.id} href={`/polls/${poll.id}`} className="group">
              <Card className="transition-colors group-hover:border-primary/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-sm font-medium">
                      {poll.question}
                    </CardTitle>
                    <PollStatusBadge status={poll.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="capitalize">{poll.pollType}</span>
                    <span>{poll.options.length} options</span>
                    <span>{poll._count.votes} vote{poll._count.votes !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {new Date(poll.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
