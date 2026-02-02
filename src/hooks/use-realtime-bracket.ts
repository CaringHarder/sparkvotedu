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
  const [matchups, setMatchups] = useState<MatchupState[] | null>(null)
  const [bracketCompleted, setBracketCompleted] = useState(false)
  const [predictionStatus, setPredictionStatus] = useState<string | null>(null)
  const [transport, setTransport] = useState<'websocket' | 'polling'>('websocket')

  // Ref for batching vote updates -- accumulates between flushes
  const pendingUpdates = useRef<VoteCounts>({})

  // Fetch full bracket state from polling API
  const fetchBracketState = useCallback(async () => {
    try {
      const res = await fetch(`/api/brackets/${bracketId}/state`)
      if (!res.ok) return
      const data: BracketStateResponse = await res.json()
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

      // Track prediction status changes
      if (data.predictionStatus != null) {
        setPredictionStatus(data.predictionStatus)
      }

      // Check if bracket is complete
      if (data.status === 'completed') {
        setBracketCompleted(true)
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
    }, batchIntervalMs)

    // Subscribe to bracket channel
    const channel = supabase
      .channel(`bracket:${bracketId}`)
      .on('broadcast', { event: 'vote_update' }, (message) => {
        const { matchupId, voteCounts: counts, totalVotes } = message.payload as {
          matchupId: string
          voteCounts: Record<string, number>
          totalVotes: number
        }

        // Accumulate into pending (NOT direct setState) for batching
        pendingUpdates.current[matchupId] = {
          ...counts,
          total: totalVotes,
        }
      })
      .on('broadcast', { event: 'bracket_update' }, (message) => {
        const { type } = message.payload as { type: string }

        // Structural changes need immediate refetch
        if (
          type === 'winner_selected' ||
          type === 'round_advanced' ||
          type === 'voting_opened' ||
          type === 'bracket_completed' ||
          type === 'prediction_status_changed'
        ) {
          fetchBracketState()
        }

        if (type === 'bracket_completed') {
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

  return { voteCounts, matchups, bracketCompleted, predictionStatus, transport, refetch: fetchBracketState }
}
