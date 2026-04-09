'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LineChart, Trophy, BarChart3, ArrowRight } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

interface SessionData {
  id: string
  name: string | null
  brackets: BracketItem[]
  polls: PollItem[]
}

interface AnalyticsHubProps {
  sessions: SessionData[]
  orphanBrackets: BracketItem[]
  orphanPolls: PollItem[]
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

export function AnalyticsHub({ sessions, orphanBrackets, orphanPolls }: AnalyticsHubProps) {
  const hasOrphans = orphanBrackets.length > 0 || orphanPolls.length > 0
  const hasAnyData = sessions.length > 0 || hasOrphans

  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions[0]?.id ?? 'unassigned'
  )

  if (!hasAnyData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-2">
          <LineChart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No activities with analytics data yet
          </p>
        </div>
      </div>
    )
  }

  const selectedSession = selectedSessionId === 'unassigned'
    ? null
    : sessions.find((s) => s.id === selectedSessionId)

  return (
    <div className="space-y-8">
      {/* Header with dropdown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LineChart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        </div>
        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select session..." />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((session) => (
              <SelectItem key={session.id} value={session.id}>
                {session.name || 'Unnamed Session'}
              </SelectItem>
            ))}
            {hasOrphans && (
              <SelectItem value="unassigned">Unassigned</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Filtered content */}
      {selectedSessionId === 'unassigned' ? (
        <SessionSection
          title="Unassigned"
          brackets={orphanBrackets}
          polls={orphanPolls}
        />
      ) : selectedSession ? (
        <SessionSection
          title={selectedSession.name || 'Unnamed Session'}
          brackets={selectedSession.brackets}
          polls={selectedSession.polls}
        />
      ) : null}
    </div>
  )
}
