'use client'

import { useState, useEffect } from 'react'
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
  voteCounts?: Record<string, Record<string, number>> // matchupId -> { entrantId: voteCount }
  onBatchDecideByVotes?: () => void
  votingStyle?: 'simple' | 'advanced' // simple = compact cards, advanced = expanded with vote counts
  isBatchDeciding?: boolean
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
  voteCounts,
  onBatchDecideByVotes,
  votingStyle = 'simple',
  isBatchDeciding = false,
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

  // Simple mode: track which matchup is currently shown per round
  const [simpleMatchupIndex, setSimpleMatchupIndex] = useState<Record<number, number>>({})

  const getMatchupIndex = (roundNumber: number, totalMatchups: number) => {
    const idx = simpleMatchupIndex[roundNumber] ?? 0
    return Math.min(idx, totalMatchups - 1) // Clamp to valid range
  }

  const navigateMatchup = (roundNumber: number, direction: 'prev' | 'next', totalMatchups: number) => {
    setSimpleMatchupIndex((prev) => {
      const current = prev[roundNumber] ?? 0
      let next: number
      if (direction === 'next') {
        next = current >= totalMatchups - 1 ? 0 : current + 1 // Wrap around
      } else {
        next = current <= 0 ? totalMatchups - 1 : current - 1 // Wrap around
      }
      return { ...prev, [roundNumber]: next }
    })
  }

  // Auto-advance to next undecided matchup when current one is decided (simple mode)
  useEffect(() => {
    if (votingStyle !== 'simple') return
    Object.entries(simpleMatchupIndex).forEach(([roundStr, idx]) => {
      const roundNum = Number(roundStr)
      const roundMs = matchups.filter((m) => (m.roundRobinRound ?? m.round) === roundNum)
      if (roundMs.length === 0) return
      const current = roundMs[Math.min(idx, roundMs.length - 1)]
      if (current?.status === 'decided') {
        const nextUndecided = roundMs.findIndex((m, i) => i > idx && m.status !== 'decided')
        if (nextUndecided !== -1) {
          setSimpleMatchupIndex((prev) => ({ ...prev, [roundNum]: nextUndecided }))
        }
      }
    })
  }, [matchups, votingStyle, simpleMatchupIndex])

  function getEntrantName(id: string | null): string {
    if (!id) return 'TBD'
    return nameById.get(id) ?? 'Unknown'
  }

  // Hide future rounds from students in round_by_round pacing.
  // Only show rounds with at least one non-pending matchup (defense-in-depth:
  // the fixed currentRound computation already prevents future rounds from matching).
  const visibleRounds = !isTeacher && pacing === 'round_by_round'
    ? roundNumbers.filter((rn) => {
        const rm = roundsMap.get(rn) ?? []
        return rm.some((m) => m.status !== 'pending')
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
            {/* Round header: collapse button + status + batch decide as siblings */}
            <div className="flex items-center gap-2 px-3 py-2">
              {/* Collapse/expand button (no longer wraps everything) */}
              <button
                type="button"
                onClick={() => toggleRound(roundNumber)}
                className="flex flex-1 items-center gap-2 text-left text-sm font-medium transition-colors hover:text-primary"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                <span>Round {roundNumber}</span>
                <span className="text-xs text-muted-foreground">
                  {decidedCount}/{totalCount} decided
                </span>
              </button>

              {/* Complete badge (sibling, not nested) */}
              {isComplete && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Complete
                </span>
              )}

              {/* Batch decide button (sibling, not nested inside header button) */}
              {isTeacher && !isComplete && voteCounts && onBatchDecideByVotes && roundMatchups.some((m) => m.status === 'voting') && (
                <button
                  type="button"
                  onClick={() => onBatchDecideByVotes()}
                  disabled={isBatchDeciding}
                  className="rounded bg-violet-600 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBatchDeciding ? 'Deciding...' : 'Close All & Decide by Votes'}
                </button>
              )}
            </div>

            {/* Round matchups */}
            {isExpanded && (
              <div className="border-t px-3 pb-3 pt-2">
                {votingStyle === 'simple' && roundMatchups.length > 1 ? (
                  // Simple mode: show one matchup at a time with navigation
                  <div className="space-y-2">
                    {/* Navigation bar */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => navigateMatchup(roundNumber, 'prev', roundMatchups.length)}
                        className="rounded px-2 py-1 hover:bg-muted transition-colors"
                      >
                        &larr; Prev
                      </button>
                      <span className="font-medium">
                        Matchup {getMatchupIndex(roundNumber, roundMatchups.length) + 1} of {roundMatchups.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigateMatchup(roundNumber, 'next', roundMatchups.length)}
                        className="rounded px-2 py-1 hover:bg-muted transition-colors"
                      >
                        Next &rarr;
                      </button>
                    </div>

                    {/* Single matchup card */}
                    {(() => {
                      const idx = getMatchupIndex(roundNumber, roundMatchups.length)
                      const m = roundMatchups[idx]
                      return (
                        <MatchupCard
                          key={m.id}
                          matchup={m}
                          entrant1Name={getEntrantName(m.entrant1Id)}
                          entrant2Name={getEntrantName(m.entrant2Id)}
                          isTeacher={isTeacher}
                          onRecordResult={onRecordResult}
                          onStudentVote={onStudentVote}
                          votedMatchupId={votedMatchups?.[m.id] ?? null}
                          voteCounts={voteCounts?.[m.id]}
                          votingStyle={votingStyle}
                        />
                      )
                    })()}
                  </div>
                ) : (
                  // Advanced mode (or single matchup): show all matchups
                  <div className="space-y-2">
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
                        voteCounts={voteCounts?.[matchup.id]}
                        votingStyle={votingStyle}
                      />
                    ))}
                  </div>
                )}
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
  voteCounts?: Record<string, number> // entrantId -> count for this matchup
  votingStyle?: 'simple' | 'advanced'
}

function MatchupCard({
  matchup,
  entrant1Name,
  entrant2Name,
  isTeacher,
  onRecordResult,
  onStudentVote,
  votedMatchupId,
  voteCounts,
  votingStyle = 'simple',
}: MatchupCardProps) {
  const isDecided = matchup.status === 'decided'
  const isVoting = matchup.status === 'voting'
  const isPending = matchup.status === 'pending'

  const isTie = isDecided && matchup.winnerId === null
  const winnerId = matchup.winnerId

  // Student voting mode: show vote buttons instead of static entrant names
  const showStudentVote = isVoting && !isTeacher && !!onStudentVote

  const isAdvanced = votingStyle === 'advanced'

  return (
    <div
      className={`rounded-${isAdvanced ? 'lg' : 'md'} ${isAdvanced ? 'border-2 p-4 shadow-sm' : 'border p-2.5'} transition-colors ${
        isDecided
          ? 'bg-muted/30 border-muted'
          : isVoting
            ? isAdvanced
              ? 'border-blue-300 bg-gradient-to-r from-blue-50/40 to-blue-50/20'
              : 'border-blue-200 bg-blue-50/30'
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
          {isTeacher && isVoting && onRecordResult && (() => {
            const e1Votes = matchup.entrant1Id && voteCounts ? (voteCounts[matchup.entrant1Id] ?? 0) : 0
            const e2Votes = matchup.entrant2Id && voteCounts ? (voteCounts[matchup.entrant2Id] ?? 0) : 0
            const hasVotes = e1Votes > 0 || e2Votes > 0
            const e1Leads = e1Votes > e2Votes
            const e2Leads = e2Votes > e1Votes
            const isTiedVotes = hasVotes && e1Votes === e2Votes

            return (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onRecordResult(matchup.id, matchup.entrant1Id)}
                  className={`rounded px-2 py-0.5 text-xs font-medium text-white transition-colors ${
                    e1Leads ? 'bg-green-600 ring-2 ring-green-400 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {entrant1Name}{hasVotes ? ` (${e1Votes})` : ''} Wins
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
                  className={`rounded px-2 py-0.5 text-xs font-medium text-white transition-colors ${
                    e2Leads ? 'bg-green-600 ring-2 ring-green-400 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {entrant2Name}{hasVotes ? ` (${e2Votes})` : ''} Wins
                </button>
                {hasVotes && !isTiedVotes && (
                  <button
                    type="button"
                    onClick={() => {
                      const leaderId = e1Leads ? matchup.entrant1Id : matchup.entrant2Id
                      if (leaderId) onRecordResult(matchup.id, leaderId)
                    }}
                    className="rounded bg-violet-600 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-violet-700"
                  >
                    Decide by Votes
                  </button>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Advanced mode: show vote counts below the matchup */}
      {isAdvanced && voteCounts && !isTeacher && (
        <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
          <span>{entrant1Name}: {voteCounts[matchup.entrant1Id ?? ''] ?? 0}</span>
          <span>vs</span>
          <span>{entrant2Name}: {voteCounts[matchup.entrant2Id ?? ''] ?? 0}</span>
        </div>
      )}
    </div>
  )
}
