'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Trophy, Minus, Clock } from 'lucide-react'
import type { MatchupData, BracketEntrantData } from '@/lib/bracket/types'

interface RoundRobinMatchupsProps {
  matchups: MatchupData[]
  entrants: BracketEntrantData[]
  currentRound: number
  pacing: 'round_by_round' | 'all_at_once'
  isTeacher: boolean
  onRecordResult?: (matchupId: string, winnerId: string | null) => void
  onStudentVote?: (matchupId: string, entrantId: string) => void
  votedMatchups?: Record<string, string> // matchupId -> voted entrantId
}

/**
 * Matchup grid component showing round-robin matchups organized by round.
 *
 * For round-by-round pacing: only the current round is expanded, others collapsed.
 * For all-at-once pacing: all rounds are expanded.
 * Teacher can record results via win/tie buttons on voting-status matchups.
 */
export function RoundRobinMatchups({
  matchups,
  entrants,
  currentRound,
  pacing,
  isTeacher,
  onRecordResult,
  onStudentVote,
  votedMatchups,
}: RoundRobinMatchupsProps) {
  // Group matchups by roundRobinRound
  const roundsMap = new Map<number, MatchupData[]>()
  for (const matchup of matchups) {
    const round = matchup.roundRobinRound ?? matchup.round
    if (!roundsMap.has(round)) {
      roundsMap.set(round, [])
    }
    roundsMap.get(round)!.push(matchup)
  }

  const roundNumbers = Array.from(roundsMap.keys()).sort((a, b) => a - b)

  // Build entrant name lookup
  const nameById = new Map<string, string>()
  for (const e of entrants) {
    nameById.set(e.id, e.name)
  }

  // For round-by-round: expand only the current round by default
  // For all-at-once: expand all rounds
  const defaultExpanded =
    pacing === 'all_at_once'
      ? new Set(roundNumbers)
      : new Set([currentRound])

  const [expanded, setExpanded] = useState<Set<number>>(defaultExpanded)

  function toggleRound(roundNumber: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(roundNumber)) {
        next.delete(roundNumber)
      } else {
        next.add(roundNumber)
      }
      return next
    })
  }

  function getEntrantName(id: string | null): string {
    if (!id) return 'TBD'
    return nameById.get(id) ?? 'Unknown'
  }

  // Hide future rounds from students in round_by_round pacing
  const visibleRounds = !isTeacher && pacing === 'round_by_round'
    ? roundNumbers.filter((rn) => {
        const rm = roundsMap.get(rn) ?? []
        // Show rounds that have at least one non-pending matchup, OR are the current round
        return rm.some((m) => m.status !== 'pending') || rn === currentRound
      })
    : roundNumbers

  return (
    <div className="space-y-2">
      {visibleRounds.map((roundNumber) => {
        const roundMatchups = roundsMap.get(roundNumber) ?? []
        const isExpanded = expanded.has(roundNumber)
        const decidedCount = roundMatchups.filter((m) => m.status === 'decided').length
        const totalCount = roundMatchups.length
        const isComplete = decidedCount === totalCount && totalCount > 0

        return (
          <div key={roundNumber} className="rounded-lg border">
            {/* Round header (collapsible) */}
            <button
              type="button"
              onClick={() => toggleRound(roundNumber)}
              className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold">Round {roundNumber}</span>
                <span className="text-xs text-muted-foreground">
                  {decidedCount}/{totalCount} decided
                </span>
              </div>
              {isComplete && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Complete
                </span>
              )}
            </button>

            {/* Round matchups */}
            {isExpanded && (
              <div className="border-t px-3 pb-3 pt-2 space-y-2">
                {roundMatchups.map((matchup) => (
                  <MatchupCard
                    key={matchup.id}
                    matchup={matchup}
                    entrant1Name={getEntrantName(matchup.entrant1Id)}
                    entrant2Name={getEntrantName(matchup.entrant2Id)}
                    isTeacher={isTeacher}
                    onRecordResult={onRecordResult}
                    onStudentVote={onStudentVote}
                    votedMatchupId={votedMatchups?.[matchup.id] ?? null}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MatchupCard sub-component
// ---------------------------------------------------------------------------

interface MatchupCardProps {
  matchup: MatchupData
  entrant1Name: string
  entrant2Name: string
  isTeacher: boolean
  onRecordResult?: (matchupId: string, winnerId: string | null) => void
  onStudentVote?: (matchupId: string, entrantId: string) => void
  votedMatchupId?: string | null // The entrant ID the student voted for in this matchup
}

function MatchupCard({
  matchup,
  entrant1Name,
  entrant2Name,
  isTeacher,
  onRecordResult,
  onStudentVote,
  votedMatchupId,
}: MatchupCardProps) {
  const isDecided = matchup.status === 'decided'
  const isVoting = matchup.status === 'voting'
  const isPending = matchup.status === 'pending'

  const isTie = isDecided && matchup.winnerId === null
  const winnerId = matchup.winnerId

  // Student voting mode: show vote buttons instead of static entrant names
  const showStudentVote = isVoting && !isTeacher && !!onStudentVote

  return (
    <div
      className={`rounded-md border p-2.5 transition-colors ${
        isDecided
          ? 'bg-muted/30 border-muted'
          : isVoting
            ? 'border-blue-200 bg-blue-50/30'
            : ''
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Student vote buttons OR entrant names with result indicators */}
        {showStudentVote ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onStudentVote!(matchup.id, matchup.entrant1Id!)}
              disabled={!!votedMatchupId}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                votedMatchupId === matchup.entrant1Id
                  ? 'bg-primary text-primary-foreground'
                  : votedMatchupId
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {entrant1Name} {votedMatchupId === matchup.entrant1Id ? '\u2713' : ''}
            </button>
            <span className="text-xs text-muted-foreground">vs</span>
            <button
              type="button"
              onClick={() => onStudentVote!(matchup.id, matchup.entrant2Id!)}
              disabled={!!votedMatchupId}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                votedMatchupId === matchup.entrant2Id
                  ? 'bg-primary text-primary-foreground'
                  : votedMatchupId
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {entrant2Name} {votedMatchupId === matchup.entrant2Id ? '\u2713' : ''}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <span
              className={`font-medium ${
                isDecided && winnerId === matchup.entrant1Id
                  ? 'text-green-700'
                  : isDecided && !isTie
                    ? 'text-muted-foreground'
                    : ''
              }`}
            >
              {entrant1Name}
              {isDecided && winnerId === matchup.entrant1Id && (
                <Trophy className="ml-1 inline h-3 w-3 text-amber-500" />
              )}
            </span>

            <span className="text-xs text-muted-foreground">vs</span>

            <span
              className={`font-medium ${
                isDecided && winnerId === matchup.entrant2Id
                  ? 'text-green-700'
                  : isDecided && !isTie
                    ? 'text-muted-foreground'
                    : ''
              }`}
            >
              {entrant2Name}
              {isDecided && winnerId === matchup.entrant2Id && (
                <Trophy className="ml-1 inline h-3 w-3 text-amber-500" />
              )}
            </span>
          </div>
        )}

        {/* Status / Actions */}
        <div className="flex items-center gap-1.5">
          {isPending && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Upcoming
            </span>
          )}

          {/* Show "Vote!" badge for students on voting matchups (when they haven't voted yet) */}
          {isVoting && !isTeacher && !votedMatchupId && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Vote!
            </span>
          )}

          {/* Show "Voted" badge for students who have already voted */}
          {isVoting && !isTeacher && !!votedMatchupId && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Voted
            </span>
          )}

          {isTie && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
              <Minus className="h-3 w-3" />
              Tie
            </span>
          )}

          {isDecided && !isTie && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Decided
            </span>
          )}

          {/* Teacher controls for voting matchups */}
          {isTeacher && isVoting && onRecordResult && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onRecordResult(matchup.id, matchup.entrant1Id)}
                className="rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
              >
                {entrant1Name} Wins
              </button>
              <button
                type="button"
                onClick={() => onRecordResult(matchup.id, null)}
                className="rounded bg-yellow-500 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-yellow-600"
              >
                Tie
              </button>
              <button
                type="button"
                onClick={() => onRecordResult(matchup.id, matchup.entrant2Id)}
                className="rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
              >
                {entrant2Name} Wins
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
