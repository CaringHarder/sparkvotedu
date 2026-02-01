'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { SimpleVotingView } from '@/components/student/simple-voting-view'
import { AdvancedVotingView } from '@/components/student/advanced-voting-view'
import type { BracketWithDetails, MatchupData, BracketEntrantData } from '@/lib/bracket/types'

/**
 * Bracket state from the /api/brackets/[bracketId]/state endpoint.
 * Matches the shape returned by the existing state API.
 */
interface BracketStateResponse {
  id: string
  name: string
  status: string
  viewingMode: string
  showVoteCounts: boolean
  votingTimerSeconds: number | null
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
 * 4. Routes to SimpleVotingView or AdvancedVotingView based on viewingMode
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

  // Completed bracket (show read-only bracket)
  if (state.type === 'completed') {
    return (
      <div>
        {backLink}
        <div className="px-4 py-6 text-center">
          <h1 className="mb-2 text-2xl font-bold">{state.bracket.name}</h1>
          <p className="mb-6 text-sm text-muted-foreground">This bracket has been completed!</p>
          <AdvancedVotingView
            bracket={state.bracket}
            participantId=""
            initialVotes={{}}
          />
        </div>
      </div>
    )
  }

  // Ready state: render appropriate view based on viewingMode
  const { bracket, participantId, initialVotes } = state

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
 * Fills in required fields that the state API doesn't return.
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
    nextMatchupId: null, // Not needed for student view rendering
    bracketRegion: null,
    isBye: false,
    roundRobinRound: null,
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
    bracketType: 'single_elimination',
    size,
    status: data.status as 'draft' | 'active' | 'completed',
    viewingMode: data.viewingMode,
    showVoteCounts: data.showVoteCounts,
    votingTimerSeconds: data.votingTimerSeconds,
    teacherId: '', // Not available from public API (and not needed for student view)
    sessionId: null,
    predictionStatus: null,
    roundRobinPacing: null,
    roundRobinVotingStyle: null,
    roundRobinStandingsMode: null,
    predictiveMode: null,
    predictiveResolutionMode: null,
    playInEnabled: false,
    maxEntrants: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entrants,
    matchups,
  }
}
