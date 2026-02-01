'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { SimpleVotingView } from '@/components/student/simple-voting-view'
import { AdvancedVotingView } from '@/components/student/advanced-voting-view'
import { DoubleElimDiagram } from '@/components/bracket/double-elim-diagram'
import { RoundRobinStandings } from '@/components/bracket/round-robin-standings'
import { RoundRobinMatchups } from '@/components/bracket/round-robin-matchups'
import { PredictiveBracket } from '@/components/bracket/predictive-bracket'
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
    // Predictions closed, bracket is active -- show live resolving view
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

  // Round-robin brackets: standings table + matchup grid
  if (bracket.bracketType === 'round_robin') {
    const currentRound = bracket.matchups.find((m) => m.status !== 'decided')?.roundRobinRound ?? 1
    return (
      <div>
        {backLink}
        <div className="px-4 py-6">
          <h1 className="mb-4 text-2xl font-bold">{bracket.name}</h1>
          <div className="space-y-4">
            <RoundRobinStandings
              standings={[]}
              isLive={bracket.roundRobinStandingsMode === 'live'}
            />
            <RoundRobinMatchups
              matchups={bracket.matchups}
              entrants={bracket.entrants}
              currentRound={currentRound}
              pacing={(bracket.roundRobinPacing ?? 'round_by_round') as 'round_by_round' | 'all_at_once'}
              isTeacher={false}
            />
          </div>
        </div>
      </div>
    )
  }

  // Double-elimination brackets: tabbed Winners/Losers/Grand Finals diagram
  if (bracket.bracketType === 'double_elimination') {
    return (
      <div>
        {backLink}
        <div className="px-4 py-6">
          <h1 className="mb-4 text-2xl font-bold">{bracket.name}</h1>
          <DoubleElimDiagram
            bracket={bracket}
            entrants={bracket.entrants}
            matchups={bracket.matchups}
            isTeacher={false}
          />
        </div>
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
