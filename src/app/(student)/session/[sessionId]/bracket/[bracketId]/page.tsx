'use client'

import { useEffect, useState, useCallback, useTransition, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { SimpleVotingView } from '@/components/student/simple-voting-view'
import { AdvancedVotingView } from '@/components/student/advanced-voting-view'
import { DoubleElimDiagram } from '@/components/bracket/double-elim-diagram'
import { RoundRobinStandings } from '@/components/bracket/round-robin-standings'
import { RoundRobinMatchups } from '@/components/bracket/round-robin-matchups'
import { PredictiveBracket } from '@/components/bracket/predictive-bracket'
import { PredictionLeaderboard } from '@/components/bracket/prediction-leaderboard'
import { WinnerReveal } from '@/components/bracket/winner-reveal'
import { CelebrationScreen } from '@/components/bracket/celebration-screen'
import { useRealtimeBracket } from '@/hooks/use-realtime-bracket'
import { castVote } from '@/actions/vote'
import type { BracketWithDetails, MatchupData, BracketEntrantData } from '@/lib/bracket/types'

/**
 * Bracket state from the /api/brackets/[bracketId]/state endpoint.
 * Matches the shape returned by the enriched state API.
 */
interface BracketStateResponse {
  id: string
  name: string
  status: string
  viewingMode: string
  showVoteCounts: boolean
  votingTimerSeconds: number | null
  bracketType: string
  predictionStatus: string | null
  predictiveMode: string | null
  roundRobinPacing: string | null
  roundRobinVotingStyle: string | null
  roundRobinStandingsMode: string | null
  maxEntrants: number | null
  playInEnabled: boolean
  matchups: Array<{
    id: string
    round: number
    position: number
    status: string
    entrant1Id: string | null
    entrant2Id: string | null
    winnerId: string | null
    entrant1: { id: string; name: string; seedPosition: number } | null
    entrant2: { id: string; name: string; seedPosition: number } | null
    winner: { id: string; name: string; seedPosition: number } | null
    voteCounts?: Record<string, number>
    bracketRegion: string | null
    isBye: boolean
    roundRobinRound: number | null
    nextMatchupId: string | null
  }>
  entrants: { id: string; name: string; seedPosition: number }[]
}

type PageState =
  | { type: 'loading' }
  | { type: 'no-identity' }
  | { type: 'not-found' }
  | { type: 'wrong-session' }
  | { type: 'draft' }
  | { type: 'completed'; bracket: BracketWithDetails }
  | { type: 'ready'; bracket: BracketWithDetails; participantId: string; initialVotes: Record<string, string | null> }

/**
 * Student bracket voting page.
 *
 * Client component that:
 * 1. Reads participant identity from localStorage (established Phase 2 pattern)
 * 2. Fetches bracket state from /api/brackets/[bracketId]/state
 * 3. Fetches participant's initial votes from /api/brackets/[bracketId]/votes
 * 4. Routes to correct bracket view based on bracketType:
 *    - double_elimination: DoubleElimDiagram with Winners/Losers/Grand Finals tabs
 *    - round_robin: RoundRobinStandings + RoundRobinMatchups grid
 *    - predictive: PredictiveBracket prediction UI
 *    - single_elimination: SimpleVotingView or AdvancedVotingView based on viewingMode
 *
 * Handles edge cases: bracket not found, wrong session, draft status, completed bracket.
 */
export default function StudentBracketVotingPage() {
  const params = useParams<{ sessionId: string; bracketId: string }>()
  const sessionId = params.sessionId
  const bracketId = params.bracketId

  const [state, setState] = useState<PageState>({ type: 'loading' })

  useEffect(() => {
    async function loadBracket() {
      // Read participant identity from localStorage
      let participantId: string | null = null
      try {
        const stored = localStorage.getItem(`sparkvotedu_session_${sessionId}`)
        if (stored) {
          const data = JSON.parse(stored)
          participantId = data.participantId ?? null
        }
      } catch {
        // localStorage not available
      }

      if (!participantId) {
        setState({ type: 'no-identity' })
        return
      }

      try {
        // Fetch bracket state
        const bracketRes = await fetch(`/api/brackets/${bracketId}/state`)
        if (!bracketRes.ok) {
          setState({ type: 'not-found' })
          return
        }

        const bracketData: BracketStateResponse = await bracketRes.json()

        // Validate bracket belongs to this session by checking sessionId
        // The state API does not return sessionId, so we trust the route structure
        // (the bracket is accessed via /session/[sessionId]/bracket/[bracketId])

        // Convert API response to BracketWithDetails shape
        const bracket = toBracketWithDetails(bracketData, bracketId)

        // Handle bracket status
        if (bracketData.status === 'draft') {
          // For predictive brackets with predictions_open, show PredictiveBracket
          // (predictionStatus controls lifecycle separately from bracket status)
          if (bracketData.bracketType === 'predictive' && bracketData.predictionStatus === 'predictions_open') {
            setState({
              type: 'ready',
              bracket,
              participantId,
              initialVotes: {},
            })
            return
          }
          setState({ type: 'draft' })
          return
        }

        if (bracketData.status === 'completed') {
          setState({ type: 'completed', bracket })
          return
        }

        // Fetch participant's initial votes
        const votesRes = await fetch(
          `/api/brackets/${bracketId}/votes?pid=${encodeURIComponent(participantId)}`
        )
        const voteMap: Record<string, string> = votesRes.ok
          ? await votesRes.json()
          : {}

        // Build initialVotes with null for matchups not yet voted on
        const initialVotes: Record<string, string | null> = {}
        for (const matchup of bracketData.matchups) {
          initialVotes[matchup.id] = voteMap[matchup.id] ?? null
        }

        setState({
          type: 'ready',
          bracket,
          participantId,
          initialVotes,
        })
      } catch {
        setState({ type: 'not-found' })
      }
    }

    loadBracket()
  }, [sessionId, bracketId])

  const backLink = (
    <Link
      href={`/session/${sessionId}`}
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path
          fillRule="evenodd"
          d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
          clipRule="evenodd"
        />
      </svg>
      Back to brackets
    </Link>
  )

  // Loading state
  if (state.type === 'loading') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading bracket...</p>
        </div>
      </div>
    )
  }

  // No participant identity
  if (state.type === 'no-identity') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold">Session not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            It looks like you haven&apos;t joined this session yet.
            Ask your teacher for the class code.
          </p>
        </div>
      </div>
    )
  }

  // Bracket not found
  if (state.type === 'not-found' || state.type === 'wrong-session') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold">Bracket not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This bracket may have been removed or is not available.
          </p>
        </div>
      </div>
    )
  }

  // Draft bracket
  if (state.type === 'draft') {
    return (
      <div>
        {backLink}
        <div className="flex items-center justify-center py-16">
          <div className="max-w-sm text-center">
            <p className="text-lg font-semibold">Not ready yet!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This bracket isn&apos;t active yet. Your teacher is still setting it up.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Completed bracket (show read-only bracket based on type)
  if (state.type === 'completed') {
    const { bracket } = state
    return (
      <div>
        {backLink}
        <div className="px-4 py-6 text-center">
          <h1 className="mb-2 text-2xl font-bold">{bracket.name}</h1>
          <p className="mb-6 text-sm text-muted-foreground">This bracket has been completed!</p>
          {bracket.bracketType === 'double_elimination' ? (
            <DoubleElimDiagram
              bracket={bracket}
              entrants={bracket.entrants}
              matchups={bracket.matchups}
              isTeacher={false}
            />
          ) : bracket.bracketType === 'round_robin' ? (
            <div className="space-y-4 text-left">
              <RoundRobinStandings
                standings={[]}
                isLive={bracket.roundRobinStandingsMode === 'live'}
              />
              <RoundRobinMatchups
                matchups={bracket.matchups}
                entrants={bracket.entrants}
                currentRound={1}
                pacing={(bracket.roundRobinPacing ?? 'round_by_round') as 'round_by_round' | 'all_at_once'}
                isTeacher={false}
              />
            </div>
          ) : bracket.bracketType === 'predictive' ? (
            <PredictiveBracket
              bracket={bracket}
              participantId=""
              isTeacher={false}
            />
          ) : (
            <AdvancedVotingView
              bracket={bracket}
              participantId=""
              initialVotes={{}}
            />
          )}
        </div>
      </div>
    )
  }

  // Ready state: render appropriate view based on bracketType
  const { bracket, participantId, initialVotes } = state

  // Predictive brackets: show prediction UI when predictions are open, or live bracket otherwise
  if (bracket.bracketType === 'predictive') {
    if (bracket.predictionStatus === 'predictions_open') {
      return (
        <div>
          {backLink}
          <PredictiveBracket
            bracket={bracket}
            participantId={participantId}
            isTeacher={false}
          />
        </div>
      )
    }
    // Predictions closed, bracket is active -- show live resolving view with real-time
    return (
      <div>
        {backLink}
        <PredictiveLiveView
          bracket={bracket}
          participantId={participantId}
          initialVotes={initialVotes}
        />
      </div>
    )
  }

  // Round-robin brackets: standings table + matchup grid with real-time + voting
  if (bracket.bracketType === 'round_robin') {
    return (
      <div>
        {backLink}
        <RRLiveView
          bracket={bracket}
          participantId={participantId}
        />
      </div>
    )
  }

  // Double-elimination brackets: tabbed Winners/Losers/Grand Finals diagram with voting
  if (bracket.bracketType === 'double_elimination') {
    return (
      <div>
        {backLink}
        <DEVotingView
          bracket={bracket}
          participantId={participantId}
          initialVotes={initialVotes}
        />
      </div>
    )
  }

  // Single-elimination (default): viewingMode routing
  if (bracket.viewingMode === 'simple') {
    return (
      <div>
        {backLink}
        <SimpleVotingView
          matchups={bracket.matchups}
          participantId={participantId}
          bracketId={bracket.id}
          bracketName={bracket.name}
          initialVotes={initialVotes}
        />
      </div>
    )
  }

  // Default to advanced view
  return (
    <div>
      {backLink}
      <AdvancedVotingView
        bracket={bracket}
        participantId={participantId}
        initialVotes={initialVotes}
      />
    </div>
  )
}

// --- Wrapper components for real-time + voting ---
// These exist as separate components so hooks can be called unconditionally.

/**
 * DEVotingView: Double-elimination bracket with real-time subscription and voting.
 * Mirrors AdvancedVotingView pattern for DE brackets.
 */
interface DERevealState {
  winnerName: string
  entrant1Name: string
  entrant2Name: string
}

function DEVotingView({
  bracket,
  participantId,
  initialVotes,
}: {
  bracket: BracketWithDetails
  participantId: string
  initialVotes: Record<string, string | null>
}) {
  const [votes, setVotes] = useState<Record<string, string | null>>(initialVotes)
  const [isPending, startTransition] = useTransition()
  const [revealState, setRevealState] = useState<DERevealState | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const hasShownRevealRef = useRef(false)

  // Real-time bracket updates
  const { matchups: realtimeMatchups, transport, bracketCompleted } = useRealtimeBracket(bracket.id)
  const currentMatchups = (realtimeMatchups as MatchupData[] | null) ?? bracket.matchups

  const handleEntrantClick = useCallback(
    (matchupId: string, entrantId: string) => {
      // Optimistic update
      setVotes((prev) => ({ ...prev, [matchupId]: entrantId }))

      startTransition(async () => {
        const result = await castVote({
          matchupId,
          participantId,
          entrantId,
        })
        if (result && 'error' in result) {
          // Revert on error
          setVotes((prev) => ({ ...prev, [matchupId]: initialVotes[matchupId] ?? null }))
        }
      })
    },
    [participantId, initialVotes]
  )

  // Trigger winner reveal when bracket completes
  useEffect(() => {
    if (bracketCompleted && !hasShownRevealRef.current) {
      const gf = currentMatchups.filter((m) => m.bracketRegion === 'grand_finals')
      const maxGfRound = gf.length > 0 ? Math.max(...gf.map((m) => m.round)) : 0
      const finalGf = gf.find((m) => m.round === maxGfRound && m.winner)
      if (finalGf?.winner) {
        hasShownRevealRef.current = true
        setRevealState({
          winnerName: finalGf.winner.name,
          entrant1Name: finalGf.entrant1?.name ?? 'TBD',
          entrant2Name: finalGf.entrant2?.name ?? 'TBD',
        })
      }
    }
  }, [bracketCompleted, currentMatchups])

  // Show celebration after reveal
  useEffect(() => {
    if (bracketCompleted) {
      const timer = setTimeout(() => setShowCelebration(true), 4000)
      return () => clearTimeout(timer)
    }
  }, [bracketCompleted])

  // Champion name for celebration
  const championName = (() => {
    const gf = currentMatchups.filter((m) => m.bracketRegion === 'grand_finals')
    if (gf.length === 0) return 'Champion'
    const maxRound = Math.max(...gf.map((m) => m.round))
    const finalGf = gf.find((m) => m.round === maxRound)
    return finalGf?.winner?.name ?? 'Champion'
  })()

  // Count votable matchups and voted matchups
  const votableMatchups = currentMatchups.filter((m) => m.status === 'voting')
  const votedCount = votableMatchups.filter((m) => votes[m.id] != null).length

  return (
    <div className="px-4 py-6">
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

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{bracket.name}</h1>
        {votableMatchups.length > 0 && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Tap to vote
          </span>
        )}
        {votableMatchups.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {votedCount}/{votableMatchups.length} voted
          </span>
        )}
        {transport === 'polling' && (
          <span className="text-xs text-muted-foreground">(polling)</span>
        )}
        {isPending && (
          <span className="text-xs text-muted-foreground">Saving...</span>
        )}
      </div>
      <DoubleElimDiagram
        bracket={bracket}
        entrants={bracket.entrants}
        matchups={currentMatchups}
        isTeacher={false}
        onEntrantClick={handleEntrantClick}
        votedEntrantIds={votes}
      />
    </div>
  )
}

/**
 * RRLiveView: Round-robin bracket with real-time subscription and student voting.
 */
function RRLiveView({
  bracket,
  participantId,
}: {
  bracket: BracketWithDetails
  participantId: string
}) {
  const [votedMatchups, setVotedMatchups] = useState<Record<string, string>>({})

  // Real-time bracket updates
  const { matchups: realtimeMatchups, transport } = useRealtimeBracket(bracket.id)
  const currentMatchups = (realtimeMatchups as MatchupData[] | null) ?? bracket.matchups

  const currentRound = currentMatchups.find((m) => m.status !== 'decided')?.roundRobinRound ?? 1

  const handleStudentVote = useCallback(
    (matchupId: string, entrantId: string) => {
      setVotedMatchups((prev) => ({ ...prev, [matchupId]: entrantId }))
      castVote({ matchupId, participantId, entrantId }).catch(() => {
        // Revert on error
        setVotedMatchups((prev) => {
          const next = { ...prev }
          delete next[matchupId]
          return next
        })
      })
    },
    [participantId]
  )

  return (
    <div className="px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{bracket.name}</h1>
        {transport === 'polling' && (
          <span className="text-xs text-muted-foreground">(polling)</span>
        )}
      </div>
      <div className="space-y-4">
        <RoundRobinStandings
          standings={[]}
          isLive={bracket.roundRobinStandingsMode === 'live'}
        />
        <RoundRobinMatchups
          matchups={currentMatchups}
          entrants={bracket.entrants}
          currentRound={currentRound}
          pacing={(bracket.roundRobinPacing ?? 'round_by_round') as 'round_by_round' | 'all_at_once'}
          isTeacher={false}
          onStudentVote={handleStudentVote}
          votedMatchups={votedMatchups}
        />
      </div>
    </div>
  )
}

/**
 * PredictiveLiveView: Predictive bracket live view with real-time subscription.
 * Shows AdvancedVotingView with real-time matchup updates + prediction leaderboard.
 */
function PredictiveLiveView({
  bracket,
  participantId,
  initialVotes,
}: {
  bracket: BracketWithDetails
  participantId: string
  initialVotes: Record<string, string | null>
}) {
  // Real-time bracket updates
  const { matchups: realtimeMatchups } = useRealtimeBracket(bracket.id)

  // Merge real-time matchups into bracket for AdvancedVotingView
  const liveBracket = realtimeMatchups
    ? { ...bracket, matchups: realtimeMatchups as MatchupData[] }
    : bracket

  const totalRounds = Math.ceil(Math.log2(bracket.maxEntrants ?? bracket.size))

  return (
    <div className="space-y-6">
      <AdvancedVotingView
        bracket={liveBracket}
        participantId={participantId}
        initialVotes={initialVotes}
      />
      <PredictionLeaderboard
        bracketId={bracket.id}
        initialScores={[]}
        totalRounds={totalRounds}
        isTeacher={false}
        participantId={participantId}
      />
    </div>
  )
}

/**
 * Convert bracket state API response to BracketWithDetails type.
 * Maps enriched API fields to the internal type, with safe fallbacks.
 */
function toBracketWithDetails(
  data: BracketStateResponse,
  bracketId: string
): BracketWithDetails {
  const matchups: MatchupData[] = data.matchups.map((m) => ({
    id: m.id,
    round: m.round,
    position: m.position,
    status: m.status,
    bracketId,
    entrant1Id: m.entrant1Id,
    entrant2Id: m.entrant2Id,
    winnerId: m.winnerId,
    nextMatchupId: m.nextMatchupId ?? null,
    bracketRegion: m.bracketRegion ?? null,
    isBye: m.isBye ?? false,
    roundRobinRound: m.roundRobinRound ?? null,
    entrant1: m.entrant1
      ? { ...m.entrant1, bracketId }
      : null,
    entrant2: m.entrant2
      ? { ...m.entrant2, bracketId }
      : null,
    winner: m.winner
      ? { ...m.winner, bracketId }
      : null,
  }))

  const entrants: BracketEntrantData[] = data.entrants.map((e) => ({
    ...e,
    bracketId,
  }))

  // Calculate bracket size from entrants count (round to nearest power of 2)
  const size = Math.pow(2, Math.ceil(Math.log2(data.entrants.length || 4)))

  return {
    id: data.id,
    name: data.name,
    description: null,
    bracketType: data.bracketType ?? 'single_elimination',
    size,
    status: data.status as 'draft' | 'active' | 'completed',
    viewingMode: data.viewingMode,
    showVoteCounts: data.showVoteCounts,
    votingTimerSeconds: data.votingTimerSeconds,
    teacherId: '', // Not available from public API (and not needed for student view)
    sessionId: null,
    predictionStatus: data.predictionStatus ?? null,
    roundRobinPacing: data.roundRobinPacing ?? null,
    roundRobinVotingStyle: data.roundRobinVotingStyle ?? null,
    roundRobinStandingsMode: data.roundRobinStandingsMode ?? null,
    predictiveMode: data.predictiveMode ?? null,
    predictiveResolutionMode: null, // Not in API (teacher-only field)
    playInEnabled: data.playInEnabled ?? false,
    maxEntrants: data.maxEntrants ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entrants,
    matchups,
  }
}
