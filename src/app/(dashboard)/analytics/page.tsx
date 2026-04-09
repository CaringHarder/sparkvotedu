import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LineChart, Trophy, BarChart3, ArrowRight } from 'lucide-react'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'

const BRACKET_TYPE_LABELS: Record<string, string> = {
  single_elimination: 'Single Elim',
  double_elimination: 'Double Elim',
  round_robin: 'Round Robin',
  predictive: 'Predictive',
  sports: 'Sports',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  closed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  archived: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
        STATUS_STYLES[status] ?? STATUS_STYLES.active
      }`}
    >
      {status}
    </span>
  )
}

type BracketItem = {
  id: string
  name: string
  bracketType: string
  status: string
  size: number
  _count: { matchups: number }
}

type PollItem = {
  id: string
  question: string
  pollType: string
  status: string
  _count: { votes: number }
}

function BracketCard({ bracket }: { bracket: BracketItem }) {
  return (
    <Link
      href={`/brackets/${bracket.id}/analytics`}
      className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-card-foreground group-hover:text-primary">
          {bracket.name}
        </h3>
        <div className="flex items-center gap-1.5">
          {BRACKET_TYPE_LABELS[bracket.bracketType] && (
            <span
              className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
                bracket.bracketType === 'sports'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
              }`}
            >
              {BRACKET_TYPE_LABELS[bracket.bracketType]}
            </span>
          )}
          <StatusBadge status={bracket.status} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{bracket.size} entrants</span>
          <span>
            {bracket._count.matchups} matchup
            {bracket._count.matchups !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          View Analytics
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  )
}

function PollCard({ poll }: { poll: PollItem }) {
  return (
    <Link
      href={`/polls/${poll.id}/analytics`}
      className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold text-card-foreground group-hover:text-primary">
          {poll.question}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium capitalize text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            {poll.pollType}
          </span>
          <StatusBadge status={poll.status} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          <span>
            {poll._count.votes} vote
            {poll._count.votes !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          View Analytics
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  )
}

function SessionSection({
  title,
  brackets,
  polls,
}: {
  title: string
  brackets: BracketItem[]
  polls: PollItem[]
}) {
  const hasBoth = brackets.length > 0 && polls.length > 0

  return (
    <section className="space-y-4">
      <h2 className="border-b border-border/60 pb-2 text-base font-semibold tracking-tight">
        {title}
      </h2>

      {hasBoth && brackets.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Trophy className="h-4 w-4" />
            Brackets
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {brackets.map((b) => (
              <BracketCard key={b.id} bracket={b} />
            ))}
          </div>
        </div>
      )}

      {!hasBoth && brackets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {brackets.map((b) => (
            <BracketCard key={b.id} bracket={b} />
          ))}
        </div>
      )}

      {hasBoth && polls.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            Polls
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {polls.map((p) => (
              <PollCard key={p.id} poll={p} />
            ))}
          </div>
        </div>
      )}

      {!hasBoth && polls.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {polls.map((p) => (
            <PollCard key={p.id} poll={p} />
          ))}
        </div>
      )}
    </section>
  )
}

export default async function AnalyticsHubPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  // Fetch sessions with their analytics-eligible activities
  const sessionsPromise = prisma.classSession.findMany({
    where: { teacherId: teacher.id },
    include: {
      brackets: {
        where: { status: { in: ['active', 'completed'] } },
        select: {
          id: true,
          name: true,
          bracketType: true,
          status: true,
          size: true,
          _count: { select: { matchups: { where: { isBye: false } } } },
        },
        orderBy: { updatedAt: 'desc' },
      },
      polls: {
        where: { status: { in: ['active', 'closed', 'archived'] } },
        select: {
          id: true,
          question: true,
          pollType: true,
          status: true,
          _count: { select: { votes: true } },
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const orphanBracketsPromise = prisma.bracket.findMany({
    where: {
      teacherId: teacher.id,
      sessionId: null,
      status: { in: ['active', 'completed'] },
    },
    select: {
      id: true,
      name: true,
      bracketType: true,
      status: true,
      size: true,
      _count: { select: { matchups: { where: { isBye: false } } } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const orphanPollsPromise = prisma.poll.findMany({
    where: {
      teacherId: teacher.id,
      sessionId: null,
      status: { in: ['active', 'closed', 'archived'] },
    },
    select: {
      id: true,
      question: true,
      pollType: true,
      status: true,
      _count: { select: { votes: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const [sessions, orphanBrackets, orphanPolls] = await Promise.all([
    sessionsPromise,
    orphanBracketsPromise,
    orphanPollsPromise,
  ])

  // Filter to sessions that have at least one bracket or poll
  const nonEmptySessions = sessions.filter(
    (s) => s.brackets.length > 0 || s.polls.length > 0
  )

  const hasOrphans = orphanBrackets.length > 0 || orphanPolls.length > 0
  const hasAnyData = nonEmptySessions.length > 0 || hasOrphans

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <LineChart className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      </div>

      {!hasAnyData && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No activities with analytics data yet
          </p>
        </div>
      )}

      {/* Session-grouped sections */}
      {nonEmptySessions.map((session) => (
        <SessionSection
          key={session.id}
          title={session.name || 'Unnamed Session'}
          brackets={session.brackets}
          polls={session.polls}
        />
      ))}

      {/* Unassigned section */}
      {hasOrphans && (
        <SessionSection
          title="Unassigned"
          brackets={orphanBrackets}
          polls={orphanPolls}
        />
      )}
    </div>
  )
}
