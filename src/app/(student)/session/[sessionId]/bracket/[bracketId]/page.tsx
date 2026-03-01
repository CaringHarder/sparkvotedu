'use client'

import { useEffect, useState, useCallback, useTransition, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { SimpleVotingView } from '@/components/student/simple-voting-view'
import { AdvancedVotingView } from '@/components/student/advanced-voting-view'
import { MatchupVoteCard } from '@/components/bracket/matchup-vote-card'
import { DoubleElimDiagram } from '@/components/bracket/double-elim-diagram'
import { RoundRobinStandings } from '@/components/bracket/round-robin-standings'
import { RoundRobinMatchups } from '@/components/bracket/round-robin-matchups'
import { PredictiveBracket } from '@/components/bracket/predictive-bracket'
import { PredictionLeaderboard } from '@/components/bracket/prediction-leaderboard'
import { PredictionReveal } from '@/components/bracket/prediction-reveal'
import { getSessionParticipant } from '@/lib/student/session-store'
import { createClient } from '@/lib/supabase/client'
import { getMyPredictions, getLeaderboard } from '@/actions/prediction'
import { WinnerReveal } from '@/components/bracket/winner-reveal'
import { CelebrationScreen } from '@/components/bracket/celebration-screen'
import { PausedOverlay } from '@/components/student/paused-overlay'
import { useRealtimeBracket } from '@/hooks/use-realtime-bracket'
import { castVote } from '@/actions/vote'
import { calculateRoundRobinStandings } from '@/lib/bracket/round-robin'
import type { RoundRobinResult } from '@/lib/bracket/round-robin'
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
  showSeedNumbers: boolean
  votingTimerSeconds: number | null
  bracketType: string
  predictionStatus: string | null
  predictiveMode: string | null
  predictiveResolutionMode: string | null
  roundRobinPacing: string | null
  roundRobinVotingStyle: string | null
  roundRobinStandingsMode: string | null
  maxEntrants: number | null
  playInEnabled: boolean
  revealedUpToRound?: number | null
  matchups: Array<{
    id: string
    round: number
    position: number
    status: string
    entrant1Id: string | null
    entrant2Id: string | null
    winnerId: string | null
    entrant1: { id: string; name: string; seedPosition: number; externalTeamId?: number | null; logoUrl?: string | null; abbreviation?: string | null } | null
    entrant2: { id: string; name: string; seedPosition: number; externalTeamId?: number | null; logoUrl?: string | null; abbreviation?: string | null } | null
    winner: { id: string; name: string; seedPosition: number; externalTeamId?: number | null; logoUrl?: string | null; abbreviation?: string | null } | null
    voteCounts?: Record<string, number>
    bracketRegion: string | null
    isBye: boolean
    roundRobinRound: number | null
    nextMatchupId: string | null
    externalGameId?: number | null
    homeScore?: number | null
    awayScore?: number | null
    gameStatus?: string | null
    gameStartTime?: string | null
  }>
  entrants: { id: string; name: string; seedPosition: number; externalTeamId?: number | null; logoUrl?: string | null; abbreviation?: string | null }[]
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
 * 1. Reads participant identity from sessionStorage (per-tab, via session-store helper)
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
  const [showDeletionToast, setShowDeletionToast] = useState(false)
  const router = useRouter()

  // Redirect to session dashboard when bracket is not found or wrong session
  useEffect(() => {
    if (state.type === 'not-found' || state.type === 'wrong-session') {
      router.push(`/session/${sessionId}`)
    }
  }, [state.type, sessionId, router])

  // Deletion detection: listen for activity_update broadcasts and check if bracket still exists
  useEffect(() => {
    if (state.type === 'loading' || state.type === 'no-identity') return

    const supabase = createClient()
    const channel = supabase
      .channel(`activities:${sessionId}`)
      .on('broadcast', { event: 'activity_update' }, async () => {
        try {
          const res = await fetch(`/api/brackets/${bracketId}/state`)
          if (!res.ok) {
            setShowDeletionToast(true)
            setTimeout(() => {
              router.push(`/session/${sessionId}`)
            }, 2000)
          }
        } catch {
          // Network error -- ignore, don't redirect on connectivity issues
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, bracketId, state.type, router])

  useEffect(() => {
    async function loadBracket() {
      // Read participant identity from sessionStorage (per-tab)
      const stored = getSessionParticipant(sessionId)
      const participantId = stored?.participantId ?? null

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
          // Auto-mode predictive brackets: route through PredictiveStudentView for PredictionReveal (podium celebration)
          if (bracketData.bracketType === 'predictive' && bracketData.predictiveResolutionMode === 'auto') {
            setState({
              type: 'ready',
              bracket,
              participantId: participantId!,
              initialVotes: {},
            })
            return
          }
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

  // Deletion toast overlay (renders on top of any page state)
  const deletionToast = showDeletionToast ? (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg animate-in fade-in slide-in-from-bottom-4">
      Your teacher ended this activity &mdash; heading back!
    </div>
  ) : null

  // Loading state
  if (state.type === 'loading') {
    return (
      <>
        {deletionToast}
        <div className="flex items-center justify-center py-16">
          <div className="space-y-3 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading bracket...</p>
          </div>
        </div>
      </>
    )
  }

  // No participant identity
  if (state.type === 'no-identity') {
    return (
      <>
        {deletionToast}
        <div className="flex items-center justify-center py-16">
          <div className="max-w-sm text-center">
            <p className="text-lg font-semibold">Session not found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              It looks like you haven&apos;t joined this session yet.
              Ask your teacher for the class code.
            </p>
          </div>
        </div>
      </>
    )
  }

  // Bracket not found or wrong session -- redirect to session dashboard (Phase 26 decision)
  if (state.type === 'not-found' || state.type === 'wrong-session') {
    return null // Redirecting via useEffect
  }

  // Draft bracket
  if (state.type === 'draft') {
    return (
      <>
        {deletionToast}
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
      </>
    )
  }

  // Completed bracket (show read-only bracket based on type)
  if (state.type === 'completed') {
    const { bracket } = state
    return (
      <>
        {deletionToast}
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
      </>
    )
  }

  // Ready state: render appropriate view based on bracketType
  const { bracket, participantId, initialVotes } = state

  // Predictive brackets: unified component handles prediction → live transition in real-time
  if (bracket.bracketType === 'predictive') {
    return (
      <>
        {deletionToast}

        <div>
          {backLink}
          <PredictiveStudentView
            bracket={bracket}
            participantId={participantId}
            initialVotes={initialVotes}
          />
        </div>
      </>
    )
  }

  // Round-robin brackets: standings table + matchup grid with real-time + voting
  if (bracket.bracketType === 'round_robin') {
    return (
      <>
        {deletionToast}

        <div>
          {backLink}
          <RRLiveView
            bracket={bracket}
            participantId={participantId}
          />
        </div>
      </>
    )
  }

  // Double-elimination brackets: tabbed Winners/Losers/Grand Finals diagram with voting
  if (bracket.bracketType === 'double_elimination') {
    return (
      <>
        {deletionToast}

        <div>
          {backLink}
          <DEVotingView
            bracket={bracket}
            participantId={participantId}
            initialVotes={initialVotes}
          />
        </div>
      </>
    )
  }

  // Single-elimination (default): viewingMode routing
  if (bracket.viewingMode === 'simple') {
    return (
      <>
        {deletionToast}

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
      </>
    )
  }

  // Default to advanced view
  return (
    <>
      {deletionToast}
      <div>
        {backLink}
        <AdvancedVotingView
          bracket={bracket}
          participantId={participantId}
          initialVotes={initialVotes}
        />
      </div>
    </>
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
  const { matchups: realtimeMatchups, transport, bracketCompleted, bracketStatus } = useRealtimeBracket(bracket.id)
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

  // Chain celebration to reveal completion — CelebrationScreen IS the reveal
  const handleRevealComplete = useCallback(() => {
    setRevealState(null)
    setShowCelebration(true)
  }, [])

  // Fallback: if bracket completed but reveal never triggered, go straight to celebration
  useEffect(() => {
    if (bracketCompleted && !revealState && !hasShownRevealRef.current) {
      const timer = setTimeout(() => setShowCelebration(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [bracketCompleted, revealState])

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
      <PausedOverlay visible={bracketStatus === 'paused'} />
      {/* Winner Reveal overlay */}
      {revealState && (
        <WinnerReveal
          entrant1Name={revealState.entrant1Name}
          entrant2Name={revealState.entrant2Name}
          onComplete={handleRevealComplete}
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
 * Compute RR champion info using calculateRoundRobinStandings.
 * Returns champion name, tie state, tied names, and runner-up name.
 * Multiple entrants sharing rank === 1 indicates a tie (co-champions).
 */
function computeRRChampionInfo(matchups: MatchupData[], entrants: { id: string; name: string }[]) {
  const decidedMatchups = matchups.filter((m) => m.status === 'decided')
  if (decidedMatchups.length === 0) return { championName: 'Champion', isTie: false, tiedNames: [] as string[], runnerUpName: '' }

  const results: RoundRobinResult[] = decidedMatchups
    .filter((m) => m.entrant1Id && m.entrant2Id)
    .map((m) => ({
      entrant1Id: m.entrant1Id!,
      entrant2Id: m.entrant2Id!,
      winnerId: m.winnerId,
    }))

  const standings = calculateRoundRobinStandings(results)

  // Enrich with names from entrants array
  const enriched = standings.map((s) => ({
    ...s,
    name: entrants.find((e) => e.id === s.entrantId)?.name ?? s.entrantId,
  }))

  // Check for tie at rank 1
  const rank1 = enriched.filter((s) => s.rank === 1)
  if (rank1.length > 1) {
    return {
      championName: rank1.map((s) => s.name).join(' & '),
      isTie: true,
      tiedNames: rank1.map((s) => s.name),
      runnerUpName: '',
    }
  }

  // Clear winner
  const champion = rank1[0]?.name ?? 'Champion'
  const runnerUp = enriched.find((s) => s.rank === 2)?.name ?? ''
  return { championName: champion, isTie: false, tiedNames: [], runnerUpName: runnerUp }
}

/**
 * RRLiveView: Round-robin bracket with real-time subscription, student voting,
 * tabbed Voting/Results UI, client-side standings, and CelebrationScreen on completion.
 */
function RRLiveView({
  bracket,
  participantId,
}: {
  bracket: BracketWithDetails
  participantId: string
}) {
  const [votedMatchups, setVotedMatchups] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'voting' | 'results'>('voting')
  const [showCelebration, setShowCelebration] = useState(false)
  const [showFinalStandings, setShowFinalStandings] = useState(false)
  const [revealState, setRevealState] = useState<{
    entrant1Name: string
    entrant2Name: string
  } | null>(null)
  const hasShownRevealRef = useRef(false)

  // Derive simple mode flag
  const isSimpleMode = bracket.roundRobinVotingStyle === 'simple'

  // Real-time bracket updates
  const { matchups: realtimeMatchups, transport, bracketCompleted, bracketStatus } = useRealtimeBracket(bracket.id)
  const currentMatchups = (realtimeMatchups as MatchupData[] | null) ?? bracket.matchups

  // Votable matchups for simple mode: currently voting, sorted by round then position
  const votableMatchups = useMemo(() => {
    return currentMatchups
      .filter((m) => m.status === 'voting')
      .sort((a, b) => {
        const roundA = a.roundRobinRound ?? a.round
        const roundB = b.roundRobinRound ?? b.round
        if (roundA !== roundB) return roundA - roundB
        return a.position - b.position
      })
  }, [currentMatchups])

  // Fix currentRound: highest round with non-pending matchups (matches teacher LiveDashboard logic)
  const currentRound = useMemo(() => {
    const activeRounds = currentMatchups
      .filter((m) => m.roundRobinRound != null && m.status !== 'pending')
      .map((m) => m.roundRobinRound!)
    if (activeRounds.length === 0) return 1
    return Math.max(...activeRounds)
  }, [currentMatchups])

  // Show WinnerReveal countdown when bracket completes, then chain to CelebrationScreen
  useEffect(() => {
    if (bracketCompleted && !revealState && !showCelebration && !hasShownRevealRef.current) {
      // Use calculateRoundRobinStandings for correct tie handling
      const entrants = bracket.entrants.map((e) => ({ id: e.id, name: e.name }))
      const info = computeRRChampionInfo(currentMatchups, entrants)
      const top1 = info.isTie ? (info.tiedNames[0] ?? 'Finalist') : info.championName
      const top2 = info.isTie ? (info.tiedNames[1] ?? 'Finalist') : (info.runnerUpName || 'Finalist')

      const timer = setTimeout(() => {
        hasShownRevealRef.current = true
        setRevealState({ entrant1Name: top1, entrant2Name: top2 })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [bracketCompleted, revealState, showCelebration, currentMatchups, bracket.entrants])

  // Chain WinnerReveal -> CelebrationScreen
  const handleRevealComplete = useCallback(() => {
    setRevealState(null)
    setShowCelebration(true)
  }, [])

  // Compute champion name using calculateRoundRobinStandings for CelebrationScreen
  const championName = useMemo(() => {
    const entrants = bracket.entrants.map((e) => ({ id: e.id, name: e.name }))
    return computeRRChampionInfo(currentMatchups, entrants).championName
  }, [currentMatchups, bracket.entrants])

  // RR tie info for CelebrationScreen
  const championTieInfo = useMemo(() => {
    const entrants = bracket.entrants.map((e) => ({ id: e.id, name: e.name }))
    return computeRRChampionInfo(currentMatchups, entrants)
  }, [currentMatchups, bracket.entrants])

  // Compute standings client-side from current matchups
  const standings = useMemo(() => {
    const decidedMatchups = currentMatchups.filter((m) => m.status === 'decided')
    if (decidedMatchups.length === 0) return []
    const results: RoundRobinResult[] = decidedMatchups
      .filter((m) => m.entrant1Id && m.entrant2Id)
      .map((m) => ({
        entrant1Id: m.entrant1Id!,
        entrant2Id: m.entrant2Id!,
        winnerId: m.winnerId,
      }))
    const rawStandings = calculateRoundRobinStandings(results)
    // Enrich with entrant names from bracket data
    return rawStandings.map((s) => ({
      ...s,
      entrantName: bracket.entrants.find((e) => e.id === s.entrantId)?.name ?? s.entrantId,
    }))
  }, [currentMatchups, bracket.entrants])

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

  // Track vote in parent state without calling server (MatchupVoteCard handles server call via useVote)
  const handleVoteTracked = useCallback((matchupId: string, entrantId: string) => {
    setVotedMatchups((prev) => ({ ...prev, [matchupId]: entrantId }))
  }, [])

  return (
    <div className="px-4 py-6">
      <PausedOverlay visible={bracketStatus === 'paused'} />
      {/* Winner Reveal countdown overlay */}
      {revealState && (
        <WinnerReveal
          entrant1Name={revealState.entrant1Name}
          entrant2Name={revealState.entrant2Name}
          onComplete={handleRevealComplete}
        />
      )}

      {/* Celebration overlay */}
      {showCelebration && (
        <CelebrationScreen
          championName={championName}
          bracketName={bracket.name}
          onDismiss={() => {
            setShowCelebration(false)
            setShowFinalStandings(true)
          }}
          isTie={championTieInfo.isTie}
          tiedNames={championTieInfo.tiedNames}
        />
      )}

      {/* Post-celebration final standings overlay */}
      {showFinalStandings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg space-y-4 rounded-xl border bg-card p-6 shadow-xl">
            <h2 className="text-center text-2xl font-bold">Final Standings</h2>
            <RoundRobinStandings standings={standings} isLive={true} />
            <button
              type="button"
              onClick={() => setShowFinalStandings(false)}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{bracket.name}</h1>
        {transport === 'polling' && (
          <span className="text-xs text-muted-foreground">(polling)</span>
        )}
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-lg border bg-muted/50 p-1">
        <button
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'voting'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('voting')}
        >
          Voting
        </button>
        <button
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'results'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('results')}
        >
          Results
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'voting' ? (
        isSimpleMode ? (
          <RRSimpleVoting
            matchups={votableMatchups}
            allMatchups={currentMatchups}
            participantId={participantId}
            bracketId={bracket.id}
            votedMatchups={votedMatchups}
            onVoteTracked={handleVoteTracked}
            celebrationActive={!!revealState || showCelebration}
          />
        ) : (
          <RoundRobinMatchups
            matchups={currentMatchups}
            entrants={bracket.entrants}
            currentRound={currentRound}
            pacing={(bracket.roundRobinPacing ?? 'round_by_round') as 'round_by_round' | 'all_at_once'}
            isTeacher={false}
            onStudentVote={handleStudentVote}
            votedMatchups={votedMatchups}
            votingStyle="advanced"
          />
        )
      ) : (
        <RoundRobinStandings
          standings={standings}
          isLive={bracket.roundRobinStandingsMode === 'live'}
        />
      )}
    </div>
  )
}

/**
 * RRSimpleVoting: Round-robin simple mode voting with full-sized MatchupVoteCard presentation.
 *
 * Shows one matchup at a time with animated slide transitions, identical UX to
 * single elimination SimpleVotingView. After voting, shows a "Vote Submitted!"
 * confirmation card before auto-advancing to the next unvoted matchup.
 *
 * MatchupVoteCard handles server-side vote submission via its internal useVote hook.
 * onVoteTracked syncs parent state for tracking without double-submitting.
 */
function RRSimpleVoting({
  matchups,
  allMatchups: _allMatchups,
  participantId,
  bracketId: _bracketId,
  votedMatchups,
  onVoteTracked,
  celebrationActive,
}: {
  matchups: MatchupData[]
  allMatchups: MatchupData[]
  participantId: string
  bracketId: string
  votedMatchups: Record<string, string>
  onVoteTracked: (matchupId: string, entrantId: string) => void
  celebrationActive: boolean
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Filter to unvoted matchups (skip already-voted ones)
  const unvotedMatchups = matchups.filter((m) => !votedMatchups[m.id])

  // Clamp index
  const safeIndex = Math.max(0, Math.min(currentIndex, unvotedMatchups.length - 1))
  const currentMatchup = unvotedMatchups[safeIndex]

  // Hide voting content during celebration overlays
  if (celebrationActive) return null

  // All voted: show waiting state
  if (unvotedMatchups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-8 w-8 text-green-600 dark:text-green-400">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-foreground">All votes in!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Waiting for your teacher to advance the round...
        </p>
        <div className="mt-4 h-1.5 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full animate-pulse rounded-full bg-primary/40" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress indicator */}
      {!showConfirmation && (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Matchup {safeIndex + 1} of {unvotedMatchups.length}
        </p>
      )}

      {/* Animated card area */}
      <div className="flex justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {showConfirmation ? (
            <motion.div
              key={`confirm-${safeIndex}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full"
            >
              <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border bg-card p-8 shadow-sm">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-primary">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-foreground">Vote Submitted!</p>
              </div>
            </motion.div>
          ) : currentMatchup ? (
            <motion.div
              key={`matchup-${currentMatchup.id}`}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full"
            >
              <MatchupVoteCard
                key={currentMatchup.id}
                matchup={currentMatchup}
                participantId={participantId}
                initialVote={votedMatchups[currentMatchup.id] ?? null}
                onVoteSubmitted={() => {
                  // MatchupVoteCard's useVote hook already submitted to server
                  // Just sync parent state for tracking
                  onVoteTracked(currentMatchup.id, 'tracked')
                  setShowConfirmation(true)
                  setTimeout(() => {
                    setShowConfirmation(false)
                    setCurrentIndex((i) => i + 1)
                  }, 1200)
                }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

/**
 * PredictiveStudentView: Handles the full predictive bracket lifecycle.
 *
 * - predictions_open/draft: shows PredictiveBracket for submitting predictions
 * - Auto-mode + tabulating/previewing: waiting state ("Your teacher is preparing results...")
 * - Auto-mode + revealing/completed: PredictionReveal (the full reveal experience)
 * - Manual/vote_based + active: tabbed Bracket + Results view
 * - Automatically transitions when teacher changes status via real-time broadcast
 */
function PredictiveStudentView({
  bracket,
  participantId,
  initialVotes,
}: {
  bracket: BracketWithDetails
  participantId: string
  initialVotes: Record<string, string | null>
}) {
  const [activeTab, setActiveTab] = useState<'bracket' | 'results'>('bracket')
  const [fetchedPredictions, setFetchedPredictions] = useState<import('@/lib/bracket/types').PredictionData[]>([])
  const [fetchedScores, setFetchedScores] = useState<import('@/lib/bracket/types').PredictionScore[]>([])
  const [dataFetched, setDataFetched] = useState(false)

  // Lift vote state so it survives tab-switch unmount/remount
  const [liveVotes, setLiveVotes] = useState<Record<string, string | null>>(initialVotes)
  const handleVoteUpdate = useCallback((matchupId: string, entrantId: string) => {
    setLiveVotes((prev) => ({ ...prev, [matchupId]: entrantId }))
  }, [])

  // Real-time bracket updates (includes predictionStatus tracking)
  const { matchups: realtimeMatchups, predictionStatus: realtimePredictionStatus, bracketStatus } =
    useRealtimeBracket(bracket.id)

  // Use real-time prediction status if available, otherwise initial
  const effectiveStatus = realtimePredictionStatus ?? bracket.predictionStatus ?? 'draft'

  // Merge real-time matchups into bracket
  const liveBracket = realtimeMatchups
    ? { ...bracket, matchups: realtimeMatchups as MatchupData[] }
    : bracket

  const totalRounds = Math.ceil(Math.log2(bracket.maxEntrants ?? bracket.size))
  const isAutoMode = bracket.predictiveResolutionMode === 'auto'
  const isManualMode = bracket.predictiveResolutionMode === 'manual'

  // Fetch predictions + scores for auto-mode reveal (server-side data for PredictionReveal)
  useEffect(() => {
    if (!isAutoMode) return
    if (effectiveStatus !== 'revealing' && effectiveStatus !== 'completed') return
    if (dataFetched) return

    async function fetchRevealData() {
      try {
        const [predResult, scoreResult] = await Promise.all([
          getMyPredictions(bracket.id, participantId),
          getLeaderboard(bracket.id),
        ])
        if ('predictions' in predResult && predResult.predictions) {
          setFetchedPredictions(predResult.predictions)
        }
        if ('scores' in scoreResult && scoreResult.scores) {
          setFetchedScores(scoreResult.scores)
        }
        setDataFetched(true)
      } catch {
        // Non-fatal
        setDataFetched(true)
      }
    }

    fetchRevealData()
  }, [isAutoMode, effectiveStatus, dataFetched, bracket.id, participantId])

  // Predictions still open: show prediction submission UI
  if (effectiveStatus === 'predictions_open' || effectiveStatus === 'draft') {
    return (
      <PredictiveBracket
        bracket={bracket}
        participantId={participantId}
        isTeacher={false}
        effectivePredictionStatus={effectiveStatus}
      />
    )
  }

  // Auto-mode: tabulating or previewing = waiting state
  if (isAutoMode && (effectiveStatus === 'tabulating' || effectiveStatus === 'previewing')) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="max-w-sm space-y-3 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-lg font-semibold">Almost there!</p>
          <p className="text-sm text-muted-foreground">
            Your teacher is preparing results...
          </p>
        </div>
      </div>
    )
  }

  // Auto-mode: revealing or completed = full reveal experience
  if (isAutoMode && (effectiveStatus === 'revealing' || effectiveStatus === 'completed')) {
    if (!dataFetched) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="space-y-3 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading results...</p>
          </div>
        </div>
      )
    }

    return (
      <PredictionReveal
        bracket={liveBracket}
        participantId={participantId}
        myPredictions={fetchedPredictions}
        initialScores={fetchedScores}
      />
    )
  }

  // Manual/vote_based mode: tabbed view with Bracket + Results
  return (
    <div className="space-y-3">
      <PausedOverlay visible={bracketStatus === 'paused'} />
      {/* Manual mode notice */}
      {isManualMode && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-center text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
          Your teacher is revealing results. Watch the bracket update live!
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setActiveTab('bracket')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'bracket'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Bracket
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('results')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'results'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Predictions
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'bracket' ? (
        <AdvancedVotingView
          bracket={liveBracket}
          participantId={participantId}
          initialVotes={liveVotes}
          onVoteUpdate={handleVoteUpdate}
        />
      ) : (
        <PredictionLeaderboard
          bracketId={bracket.id}
          initialScores={[]}
          totalRounds={totalRounds}
          isTeacher={false}
          participantId={participantId}
        />
      )}
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
    externalGameId: m.externalGameId ?? null,
    homeScore: m.homeScore ?? null,
    awayScore: m.awayScore ?? null,
    gameStatus: m.gameStatus ?? null,
    gameStartTime: m.gameStartTime ?? null,
    entrant1: m.entrant1
      ? { ...m.entrant1, bracketId, externalTeamId: m.entrant1.externalTeamId ?? null, logoUrl: m.entrant1.logoUrl ?? null, abbreviation: m.entrant1.abbreviation ?? null }
      : null,
    entrant2: m.entrant2
      ? { ...m.entrant2, bracketId, externalTeamId: m.entrant2.externalTeamId ?? null, logoUrl: m.entrant2.logoUrl ?? null, abbreviation: m.entrant2.abbreviation ?? null }
      : null,
    winner: m.winner
      ? { ...m.winner, bracketId, externalTeamId: m.winner.externalTeamId ?? null, logoUrl: m.winner.logoUrl ?? null, abbreviation: m.winner.abbreviation ?? null }
      : null,
  }))

  const entrants: BracketEntrantData[] = data.entrants.map((e) => ({
    ...e,
    bracketId,
    externalTeamId: e.externalTeamId ?? null,
    logoUrl: e.logoUrl ?? null,
    abbreviation: e.abbreviation ?? null,
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
    showSeedNumbers: data.showSeedNumbers ?? true,
    votingTimerSeconds: data.votingTimerSeconds,
    teacherId: '', // Not available from public API (and not needed for student view)
    sessionId: null,
    predictionStatus: data.predictionStatus ?? null,
    roundRobinPacing: data.roundRobinPacing ?? null,
    roundRobinVotingStyle: data.roundRobinVotingStyle ?? null,
    roundRobinStandingsMode: data.roundRobinStandingsMode ?? null,
    predictiveMode: data.predictiveMode ?? null,
    predictiveResolutionMode: data.predictiveResolutionMode ?? null,
    playInEnabled: data.playInEnabled ?? false,
    maxEntrants: data.maxEntrants ?? null,
    revealedUpToRound: data.revealedUpToRound ?? null,
    externalTournamentId: null,
    dataSource: null,
    lastSyncAt: null,
    sportGender: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entrants,
    matchups,
  }
}
