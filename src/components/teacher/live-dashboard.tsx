'use client'

import { useState, useMemo, useCallback, useEffect, useRef, useTransition } from 'react'
import { useRealtimeBracket } from '@/hooks/use-realtime-bracket'
import { useSessionPresence } from '@/hooks/use-student-session'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'
import { DoubleElimDiagram } from '@/components/bracket/double-elim-diagram'
import { RoundRobinStandings } from '@/components/bracket/round-robin-standings'
import { RoundRobinMatchups } from '@/components/bracket/round-robin-matchups'
import { WinnerReveal } from '@/components/bracket/winner-reveal'
import { CelebrationScreen } from '@/components/bracket/celebration-screen'
import { ParticipationSidebar } from '@/components/teacher/participation-sidebar'
import { QRCodeDisplay } from '@/components/teacher/qr-code-display'
import { openMatchupsForVoting, advanceMatchup, batchAdvanceRound } from '@/actions/bracket-advance'
import { recordResult, advanceRound } from '@/actions/round-robin'
import type { BracketWithDetails, MatchupData, RoundRobinStanding } from '@/lib/bracket/types'
import type { VoteCounts } from '@/types/vote'

interface LiveDashboardProps {
  bracket: BracketWithDetails
  totalRounds: number
  participants: Array<{ id: string; funName: string; lastSeenAt: string }>
  initialVoteCounts: Record<string, VoteCounts>
  initialVoterIds: Record<string, string[]>
  sessionCode?: string | null
  standings?: RoundRobinStanding[]
}

interface RevealState {
  winnerName: string
  entrant1Name: string
  entrant2Name: string
  entrant1Votes: number
  entrant2Votes: number
}

export function LiveDashboard({
  bracket,
  totalRounds,
  participants,
  initialVoteCounts,
  initialVoterIds,
  sessionCode,
  standings = [],
}: LiveDashboardProps) {
  const [selectedMatchupId, setSelectedMatchupId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [revealState, setRevealState] = useState<RevealState | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Bracket type detection
  const isDoubleElim = bracket.bracketType === 'double_elimination'
  const isRoundRobin = bracket.bracketType === 'round_robin'
  const isPredictive = bracket.bracketType === 'predictive'

  // Track previous matchup statuses for detecting newly decided matchups
  const prevMatchupStatusRef = useRef<Record<string, string>>({})

  // Real-time vote count updates via Supabase Broadcast
  const { voteCounts: realtimeVoteCounts, matchups: realtimeMatchups, bracketCompleted } =
    useRealtimeBracket(bracket.id)

  // Track connected students via Supabase Presence
  const { connectedStudents } = useSessionPresence(
    bracket.sessionId ?? '__no_session__',
    '__teacher__'
  )

  // Derive connected participant IDs set from presence data
  const connectedIds = useMemo(() => {
    const names = new Set(connectedStudents.map((s) => s.funName))
    const ids = new Set<string>()
    for (const p of participants) {
      if (names.has(p.funName)) {
        ids.add(p.id)
      }
    }
    return ids
  }, [connectedStudents, participants])

  // Merge initial matchups with real-time updates
  const currentMatchups: MatchupData[] = useMemo(() => {
    if (realtimeMatchups) {
      return realtimeMatchups as MatchupData[]
    }
    return bracket.matchups
  }, [realtimeMatchups, bracket.matchups])

  // Merge initial vote counts with real-time updates
  const mergedVoteCounts = useMemo(() => {
    const merged = { ...initialVoteCounts }
    for (const [matchupId, counts] of Object.entries(realtimeVoteCounts)) {
      const voteCounts: VoteCounts = {}
      for (const [key, value] of Object.entries(counts)) {
        if (key !== 'total') {
          voteCounts[key] = value
        }
      }
      merged[matchupId] = voteCounts
    }
    return merged
  }, [initialVoteCounts, realtimeVoteCounts])

  // Detect newly decided FINAL matchup and trigger WinnerReveal
  useEffect(() => {
    const prev = prevMatchupStatusRef.current
    for (const matchup of currentMatchups) {
      const prevStatus = prev[matchup.id]
      if (
        prevStatus &&
        prevStatus !== 'decided' &&
        matchup.status === 'decided' &&
        matchup.winner &&
        matchup.round === totalRounds &&
        matchup.position === 1
      ) {
        setRevealState({
          winnerName: matchup.winner.name,
          entrant1Name: matchup.entrant1?.name ?? 'TBD',
          entrant2Name: matchup.entrant2?.name ?? 'TBD',
          entrant1Votes: 0,
          entrant2Votes: 0,
        })
      }
    }
    const newStatuses: Record<string, string> = {}
    for (const m of currentMatchups) {
      newStatuses[m.id] = m.status
    }
    prevMatchupStatusRef.current = newStatuses
  }, [currentMatchups, totalRounds])

  // Show celebration when bracket is completed
  useEffect(() => {
    if (bracketCompleted) {
      const timer = setTimeout(() => setShowCelebration(true), 4000)
      return () => clearTimeout(timer)
    }
  }, [bracketCompleted])

  // Get voter IDs for selected matchup
  const currentVoterIds = useMemo(() => {
    if (!selectedMatchupId) return []
    return initialVoterIds[selectedMatchupId] ?? []
  }, [selectedMatchupId, initialVoterIds])

  // Current round
  const currentRound = useMemo(() => {
    for (let r = 1; r <= totalRounds; r++) {
      const roundMatchups = currentMatchups.filter((m) => m.round === r)
      const allDecided = roundMatchups.every((m) => m.status === 'decided')
      if (!allDecided) return r
    }
    return totalRounds
  }, [currentMatchups, totalRounds])

  // Champion name for celebration
  const championName = useMemo(() => {
    const finalMatchup = currentMatchups.find(
      (m) => m.round === totalRounds && m.position === 1
    )
    return finalMatchup?.winner?.name ?? 'Champion'
  }, [currentMatchups, totalRounds])

  // Round-level status counts
  const roundStatus = useMemo(() => {
    const status: Record<number, { pending: number; voting: number; decided: number; total: number }> = {}
    for (let r = 1; r <= totalRounds; r++) {
      const rm = currentMatchups.filter((m) => m.round === r)
      status[r] = {
        pending: rm.filter((m) => m.status === 'pending').length,
        voting: rm.filter((m) => m.status === 'voting').length,
        decided: rm.filter((m) => m.status === 'decided').length,
        total: rm.length,
      }
    }
    return status
  }, [currentMatchups, totalRounds])

  // Build inline vote count labels for diagram: matchupId -> "3-2" style label
  const voteLabels = useMemo(() => {
    const labels: Record<string, { e1: number; e2: number }> = {}
    for (const m of currentMatchups) {
      if (m.status === 'voting' || m.status === 'decided') {
        const counts = mergedVoteCounts[m.id] ?? {}
        labels[m.id] = {
          e1: m.entrant1Id ? (counts[m.entrant1Id] ?? 0) : 0,
          e2: m.entrant2Id ? (counts[m.entrant2Id] ?? 0) : 0,
        }
      }
    }
    return labels
  }, [currentMatchups, mergedVoteCounts])

  // Actions
  const handleOpenVoting = useCallback(() => {
    setError(null)
    const pendingIds = currentMatchups
      .filter((m) => m.round === currentRound && m.status === 'pending')
      .map((m) => m.id)
    if (pendingIds.length === 0) return
    startTransition(async () => {
      const result = await openMatchupsForVoting({ bracketId: bracket.id, matchupIds: pendingIds })
      if (result && 'error' in result) setError(result.error as string)
    })
  }, [currentMatchups, currentRound, bracket.id])

  const handleCloseAndAdvance = useCallback(() => {
    setError(null)
    const votingMatchups = currentMatchups.filter(
      (m) => m.round === currentRound && m.status === 'voting'
    )
    const advanceList: Array<{ matchupId: string; winnerId: string }> = []
    const tiedCount = { value: 0 }

    for (const m of votingMatchups) {
      const counts = mergedVoteCounts[m.id] ?? {}
      const e1 = m.entrant1Id ? (counts[m.entrant1Id] ?? 0) : 0
      const e2 = m.entrant2Id ? (counts[m.entrant2Id] ?? 0) : 0
      if (e1 > e2 && m.entrant1Id) {
        advanceList.push({ matchupId: m.id, winnerId: m.entrant1Id })
      } else if (e2 > e1 && m.entrant2Id) {
        advanceList.push({ matchupId: m.id, winnerId: m.entrant2Id })
      } else if (e1 > 0) {
        tiedCount.value++
      }
    }

    if (tiedCount.value > 0 && advanceList.length === 0) {
      setError('All matchups are tied. Click a matchup in the bracket to break ties.')
      return
    }

    startTransition(async () => {
      for (const { matchupId, winnerId } of advanceList) {
        const result = await advanceMatchup({ bracketId: bracket.id, matchupId, winnerId })
        if (result && 'error' in result) { setError(result.error as string); return }
      }
      if (tiedCount.value > 0) {
        setError(`${advanceList.length} advanced. ${tiedCount.value} tied — click matchup to break tie.`)
      }
    })
  }, [currentMatchups, currentRound, mergedVoteCounts, bracket.id])

  const handleAdvanceRound = useCallback(() => {
    setError(null)
    startTransition(async () => {
      const result = await batchAdvanceRound({ bracketId: bracket.id, round: currentRound })
      if (result && 'error' in result) setError(result.error as string)
    })
  }, [bracket.id, currentRound])

  // Round-robin: current round, advance logic, and handlers
  const currentRoundRobinRound = useMemo(() => {
    if (!isRoundRobin) return 1
    const rrMatchup = currentMatchups.find((m) => m.status !== 'decided' && m.roundRobinRound != null)
    return rrMatchup?.roundRobinRound ?? 1
  }, [isRoundRobin, currentMatchups])

  const canAdvanceRoundRobin = useMemo(() => {
    if (!isRoundRobin) return false
    const pacing = (bracket.roundRobinPacing ?? 'round_by_round') as 'round_by_round' | 'all_at_once'
    if (pacing !== 'round_by_round') return false
    const currentRoundMatchups = currentMatchups.filter((m) => m.roundRobinRound === currentRoundRobinRound)
    const allDecided = currentRoundMatchups.length > 0 && currentRoundMatchups.every((m) => m.status === 'decided')
    const nextRoundExists = currentMatchups.some((m) => (m.roundRobinRound ?? 0) > currentRoundRobinRound)
    return allDecided && nextRoundExists
  }, [isRoundRobin, currentMatchups, currentRoundRobinRound, bracket.roundRobinPacing])

  const handleRecordRoundRobinResult = useCallback((matchupId: string, winnerId: string | null) => {
    setError(null)
    startTransition(async () => {
      const result = await recordResult({
        bracketId: bracket.id,
        matchupId,
        winnerId,
      })
      if (result && 'error' in result) setError(result.error as string)
    })
  }, [bracket.id])

  const handleAdvanceRoundRobin = useCallback(() => {
    setError(null)
    const nextRound = currentRoundRobinRound + 1
    startTransition(async () => {
      const result = await advanceRound({
        bracketId: bracket.id,
        roundNumber: nextRound,
      })
      if (result && 'error' in result) setError(result.error as string)
    })
  }, [bracket.id, currentRoundRobinRound])

  // Click matchup in diagram to select it for per-matchup actions
  const handleMatchupClick = useCallback((matchupId: string) => {
    setSelectedMatchupId((prev) => (prev === matchupId ? null : matchupId))
  }, [])

  // Per-matchup action: teacher picks winner (tie break or override)
  const handlePickWinner = useCallback((matchupId: string, winnerId: string) => {
    setError(null)
    setSelectedMatchupId(null)
    startTransition(async () => {
      const result = await advanceMatchup({ bracketId: bracket.id, matchupId, winnerId })
      if (result && 'error' in result) setError(result.error as string)
    })
  }, [bracket.id])

  // Get selected matchup details
  const selectedMatchup = currentMatchups.find((m) => m.id === selectedMatchupId) ?? null

  // Round label helper
  function getRoundLabel(round: number): string {
    if (round === totalRounds) return 'Final'
    if (round === totalRounds - 1) return 'Semis'
    if (round === totalRounds - 2) return 'Quarters'
    return `R${round}`
  }

  // Determine primary action for action bar
  const rs = roundStatus[currentRound]
  const allRoundDecided = rs && rs.decided === rs.total && rs.total > 0
  const hasVoting = rs && rs.voting > 0
  const hasPending = rs && rs.pending > 0
  const bracketDone = currentRound === totalRounds && allRoundDecided

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Winner Reveal overlay */}
      {revealState && (
        <WinnerReveal
          winnerName={revealState.winnerName}
          entrant1Name={revealState.entrant1Name}
          entrant2Name={revealState.entrant2Name}
          onComplete={() => setRevealState(null)}
        />
      )}

      {/* Celebration Screen overlay */}
      {showCelebration && (
        <CelebrationScreen
          championName={championName}
          bracketName={bracket.name}
          onDismiss={() => { setShowCelebration(false); setRevealState(null) }}
        />
      )}

      {/* Top bar with actions */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <h1 className="text-lg font-bold">{bracket.name}</h1>
        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          LIVE
        </span>

        {/* Round tabs (SE / DE only) */}
        {!isRoundRobin && (
          <div className="flex gap-1">
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
              const s = roundStatus[round]
              const isActive = round === currentRound
              const isComplete = s && s.decided === s.total && s.total > 0
              return (
                <span
                  key={round}
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isComplete
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {getRoundLabel(round)}
                  {isComplete && ' ✓'}
                </span>
              )
            })}
          </div>
        )}

        {/* Round-robin: current round indicator */}
        {isRoundRobin && (
          <span className="rounded px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground">
            Round {currentRoundRobinRound}
          </span>
        )}

        <div className="flex-1" />

        {/* Primary action buttons (SE / DE) */}
        {!isRoundRobin && hasPending && (
          <button
            onClick={handleOpenVoting}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Opening...' : `Open Voting (${rs!.pending})`}
          </button>
        )}

        {!isRoundRobin && hasVoting && (
          <button
            onClick={handleCloseAndAdvance}
            disabled={isPending}
            className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {isPending ? 'Closing...' : `Close & Advance (${rs!.voting})`}
          </button>
        )}

        {!isRoundRobin && allRoundDecided && !bracketDone && (
          <button
            onClick={handleAdvanceRound}
            disabled={isPending}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? 'Advancing...' : `Next Round →`}
          </button>
        )}

        {/* Round-robin advance button in top bar */}
        {isRoundRobin && canAdvanceRoundRobin && (
          <button
            onClick={handleAdvanceRoundRobin}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Opening...' : `Open Round ${currentRoundRobinRound + 1}`}
          </button>
        )}

        {!isRoundRobin && bracketDone && (
          <span className="flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Complete!
          </span>
        )}

        {sessionCode && <QRCodeDisplay code={sessionCode} />}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Pick winner modal */}
      {selectedMatchup && selectedMatchup.status === 'voting' && (() => {
        const votes = voteLabels[selectedMatchup.id]
        const e1Votes = votes?.e1 ?? 0
        const e2Votes = votes?.e2 ?? 0
        const isTied = e1Votes === e2Votes
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedMatchupId(null)}>
            <div className="mx-4 w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-1 text-center text-base font-bold">Pick Winner</h2>
              <p className="mb-5 text-center text-xs text-muted-foreground">
                {isTied ? 'Tied — teacher breaks the tie' : 'Override or confirm the vote leader'}
              </p>

              <div className="flex gap-3">
                {selectedMatchup.entrant1Id && (
                  <button
                    onClick={() => handlePickWinner(selectedMatchup.id, selectedMatchup.entrant1Id!)}
                    disabled={isPending}
                    className="flex flex-1 flex-col items-center gap-1.5 rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-4 transition-colors hover:border-blue-400 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:border-blue-600 dark:hover:bg-blue-950/50"
                  >
                    <span className="text-sm font-semibold">{selectedMatchup.entrant1?.name ?? 'TBD'}</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{e1Votes} vote{e1Votes !== 1 ? 's' : ''}</span>
                  </button>
                )}
                {selectedMatchup.entrant2Id && (
                  <button
                    onClick={() => handlePickWinner(selectedMatchup.id, selectedMatchup.entrant2Id!)}
                    disabled={isPending}
                    className="flex flex-1 flex-col items-center gap-1.5 rounded-lg border-2 border-orange-200 bg-orange-50 px-4 py-4 transition-colors hover:border-orange-400 hover:bg-orange-100 disabled:opacity-50 dark:border-orange-800 dark:bg-orange-950/30 dark:hover:border-orange-600 dark:hover:bg-orange-950/50"
                  >
                    <span className="text-sm font-semibold">{selectedMatchup.entrant2?.name ?? 'TBD'}</span>
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{e2Votes} vote{e2Votes !== 1 ? 's' : ''}</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedMatchupId(null)}
                className="mt-4 w-full rounded-md py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      })()}

      {/* Main content: diagram + sidebar */}
      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* Bracket diagram / type-specific view */}
        <div className="flex-1 overflow-auto rounded-lg border bg-card p-4">
          {isDoubleElim ? (
            <DoubleElimDiagram
              bracket={bracket}
              entrants={bracket.entrants}
              matchups={currentMatchups}
              isTeacher={true}
            />
          ) : isRoundRobin ? (
            <div className="space-y-6">
              {/* Standings table */}
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Standings
                </h2>
                <RoundRobinStandings
                  standings={standings}
                  isLive={bracket.roundRobinStandingsMode === 'live'}
                />
              </div>

              {/* Matchup grid */}
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Matchups
                </h2>
                <RoundRobinMatchups
                  matchups={currentMatchups}
                  entrants={bracket.entrants}
                  currentRound={currentRoundRobinRound}
                  pacing={(bracket.roundRobinPacing ?? 'round_by_round') as 'round_by_round' | 'all_at_once'}
                  isTeacher={true}
                  onRecordResult={handleRecordRoundRobinResult}
                />
              </div>
            </div>
          ) : (
            /* SE and Predictive: standard bracket diagram with vote counts */
            <BracketDiagram
              matchups={currentMatchups}
              totalRounds={totalRounds}
              voteLabels={voteLabels}
              onMatchupClick={handleMatchupClick}
              selectedMatchupId={selectedMatchupId}
            />
          )}
        </div>

        {/* Participation sidebar */}
        <ParticipationSidebar
          participants={participants}
          connectedIds={connectedIds}
          voterIds={currentVoterIds}
          selectedMatchupId={selectedMatchupId}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isOpen={sidebarOpen}
        />
      </div>
    </div>
  )
}
