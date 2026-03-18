'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface VoteCounts {
  /** Mapping of matchupId -> { [entrantId]: count, total: number } */
  [matchupId: string]: { [entrantId: string]: number; total: number }
}

interface MatchupState {
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
  voterIds?: string[]
  bracketRegion?: string | null
  isBye?: boolean
  roundRobinRound?: number | null
  nextMatchupId?: string | null
}

interface BracketStateResponse {
  id: string
  name: string
  status: string
  viewingMode: string
  showVoteCounts: boolean
  showSeedNumbers: boolean
  votingTimerSeconds: number | null
  predictionStatus?: string | null
  matchups: MatchupState[]
  entrants: { id: string; name: string; seedPosition: number }[]
}

/**
 * Real-time bracket subscription hook with integrated transport fallback.
 *
 * Subscribes to the `bracket:{bracketId}` Supabase Broadcast channel.
 * - vote_update events are accumulated in a ref and flushed to state
 *   every `batchIntervalMs` (default 2 seconds) to avoid React re-render storms.
 * - bracket_update events (structural changes) trigger an immediate refetch.
 *
 * Transport fallback: If WebSocket does not reach SUBSCRIBED status within
 * 5 seconds, automatically switches to HTTP polling every 3 seconds.
 * This ensures the app works on school networks that block WebSocket.
 *
 * @param bracketId - The bracket ID to subscribe to
 * @param batchIntervalMs - How often to flush accumulated vote updates (default 2000ms)
 */
export function useRealtimeBracket(bracketId: string, batchIntervalMs = 2000) {
  const supabase = useMemo(() => createClient(), [])
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({})
  const [voterIds, setVoterIds] = useState<Record<string, string[]>>({})
  const [matchups, setMatchups] = useState<MatchupState[] | null>(null)
  const [bracketCompleted, setBracketCompleted] = useState(false)
  const [bracketStatus, setBracketStatus] = useState<string>('active')
  const [predictionStatus, setPredictionStatus] = useState<string | null>(null)
  const [viewingMode, setViewingMode] = useState<string | undefined>(undefined)
  const [showVoteCounts, setShowVoteCounts] = useState<boolean>(true)
  const [showSeedNumbers, setShowSeedNumbers] = useState<boolean>(true)
  const [transport, setTransport] = useState<'websocket' | 'polling'>('websocket')

  // Ref for batching vote updates -- accumulates between flushes
  const pendingUpdates = useRef<VoteCounts>({})
  const pendingVoterUpdates = useRef<Record<string, Set<string>>>({})

  // Sequence counter to discard stale out-of-order fetch responses.
  // When multiple bracket_update events fire rapidly (e.g. winner_selected +
  // voting_opened in quick succession), overlapping fetches may resolve out of
  // order. The guard ensures only the most recent response is applied.
  const fetchSeqRef = useRef(0)

  // Fetch full bracket state from polling API
  const fetchBracketState = useCallback(async () => {
    const seq = ++fetchSeqRef.current
    try {
      const res = await fetch(`/api/brackets/${bracketId}/state?t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      // Discard stale response if a newer fetch has already been initiated
      if (seq !== fetchSeqRef.current) return
      const data: BracketStateResponse = await res.json()
      // Double-check after async json parse -- another fetch may have started
      if (seq !== fetchSeqRef.current) return
      setMatchups(data.matchups)

      // Also update vote counts from the fetched state
      const counts: VoteCounts = {}
      for (const matchup of data.matchups) {
        if (matchup.voteCounts) {
          const total = Object.values(matchup.voteCounts).reduce(
            (sum, c) => sum + c,
            0
          )
          counts[matchup.id] = { ...matchup.voteCounts, total }
        }
      }
      setVoteCounts(counts)

      // Extract voterIds per matchup from fetched state
      const fetchedVoterIds: Record<string, string[]> = {}
      for (const matchup of data.matchups) {
        if (matchup.voterIds) {
          fetchedVoterIds[matchup.id] = matchup.voterIds
        }
      }
      // Preserve the 'predictions' key -- fetchBracketState only returns
      // per-matchup vote data, not prediction submitter data
      setVoterIds(prev => ({
        ...fetchedVoterIds,
        ...(prev['predictions'] ? { predictions: prev['predictions'] } : {}),
      }))

      // Track bracket-level status (used for paused overlay on student pages)
      setBracketStatus(data.status)

      // Track viewing mode changes (for student bracket view)
      if (data.viewingMode) {
        setViewingMode(data.viewingMode)
      }

      // Track display settings changes
      if (data.showVoteCounts !== undefined) {
        setShowVoteCounts(data.showVoteCounts)
      }
      if (data.showSeedNumbers !== undefined) {
        setShowSeedNumbers(data.showSeedNumbers)
      }

      // Track prediction status changes
      if (data.predictionStatus != null) {
        setPredictionStatus(data.predictionStatus)
      }

      // Check if bracket is complete -- reset when reopened
      if (data.status === 'completed') {
        setBracketCompleted(true)
      } else {
        setBracketCompleted(false)
      }
    } catch {
      // Fetch failure is non-fatal -- will retry on next event or interval
    }
  }, [bracketId])

  useEffect(() => {
    let wsConnected = false
    let pollInterval: ReturnType<typeof setInterval> | null = null

    // Set up batch flush interval for vote count updates
    const flushInterval = setInterval(() => {
      const pending = pendingUpdates.current
      const keys = Object.keys(pending)
      if (keys.length === 0) return

      // Flush pending updates into state
      setVoteCounts((prev) => ({ ...prev, ...pending }))
      pendingUpdates.current = {}

      // Flush pending voter ID updates into state
      const voterUpdates = pendingVoterUpdates.current
      if (Object.keys(voterUpdates).length > 0) {
        setVoterIds(prev => {
          const next = { ...prev }
          for (const [mid, pids] of Object.entries(voterUpdates)) {
            const existing = new Set(prev[mid] ?? [])
            for (const pid of pids) existing.add(pid)
            next[mid] = [...existing]
          }
          return next
        })
        pendingVoterUpdates.current = {}
      }
    }, batchIntervalMs)

    // Subscribe to bracket channel
    const channel = supabase
      .channel(`bracket:${bracketId}`)
      .on('broadcast', { event: 'vote_update' }, (message) => {
        const { matchupId, voteCounts: counts, totalVotes, participantId } = message.payload as {
          matchupId: string
          voteCounts: Record<string, number>
          totalVotes: number
          participantId?: string
        }

        // Accumulate into pending (NOT direct setState) for batching
        pendingUpdates.current[matchupId] = {
          ...counts,
          total: totalVotes,
        }

        // Accumulate voter ID for per-student tracking
        if (participantId) {
          if (!pendingVoterUpdates.current[matchupId]) {
            pendingVoterUpdates.current[matchupId] = new Set()
          }
          pendingVoterUpdates.current[matchupId].add(participantId)
        }
      })
      .on('broadcast', { event: 'bracket_update' }, (message) => {
        const { type } = message.payload as { type: string }

        // Clear pending voter updates on structural events that invalidate votes
        if (type === 'round_advanced' || type === 'round_undone' || type === 'bracket_reopened') {
          pendingVoterUpdates.current = {}
          // voterIds will be reset by the fetchBracketState call that follows
        }

        // Accumulate prediction submitter voter ID
        if (type === 'prediction_status_changed') {
          const predPayload = message.payload as { type: string; participantId?: string }
          if (predPayload.participantId) {
            if (!pendingVoterUpdates.current['predictions']) {
              pendingVoterUpdates.current['predictions'] = new Set()
            }
            pendingVoterUpdates.current['predictions'].add(predPayload.participantId)
          }
        }

        // Structural changes need immediate refetch
        if (
          type === 'winner_selected' ||
          type === 'round_advanced' ||
          type === 'voting_opened' ||
          type === 'bracket_completed' ||
          type === 'scores_synced' ||
          type === 'prediction_status_changed' ||
          type === 'reveal_round' ||
          type === 'reveal_complete' ||
          type === 'bracket_paused' ||
          type === 'bracket_resumed' ||
          type === 'round_undone' ||
          type === 'bracket_reopened' ||
          type === 'settings_changed'
        ) {
          fetchBracketState()
        }

        if (type === 'bracket_completed' || type === 'reveal_complete') {
          setBracketCompleted(true)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          wsConnected = true
          // Do an initial fetch to ensure we have latest state
          fetchBracketState()
        }
      })

    // Transport fallback: if WebSocket doesn't connect within 5 seconds,
    // switch to HTTP polling every 3 seconds
    const wsTimeout = setTimeout(() => {
      if (!wsConnected) {
        setTransport('polling')
        // Immediately fetch once
        fetchBracketState()
        // Start polling interval
        pollInterval = setInterval(fetchBracketState, 3000)
      }
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(flushInterval)
      clearTimeout(wsTimeout)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [bracketId, supabase, batchIntervalMs, fetchBracketState])

  return { voteCounts, voterIds, matchups, bracketCompleted, bracketStatus, predictionStatus, viewingMode, showVoteCounts, showSeedNumbers, transport, refetch: fetchBracketState }
}
