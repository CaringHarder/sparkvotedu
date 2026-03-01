'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PollStatus } from '@/lib/poll/types'
import type { BordaScore } from '@/lib/poll/borda'

interface PollStateResponse {
  id: string
  question: string
  status: PollStatus
  pollType: string
  allowVoteChange: boolean
  showLiveResults: boolean
  rankingDepth: number | null
  options: { id: string; text: string; imageUrl: string | null; position: number }[]
  voteCounts: Record<string, number>
  totalVotes: number
  participantCount?: number
  bordaScores?: BordaScore[]
}

/**
 * Real-time poll subscription hook with batched updates and transport fallback.
 *
 * Subscribes to the `poll:{pollId}` Supabase Broadcast channel.
 * - poll_vote_update events are accumulated in a ref and flushed to state
 *   every `batchIntervalMs` (default 2 seconds) to avoid React re-render storms.
 * - poll_update events (lifecycle changes) trigger an immediate full refetch.
 *
 * Transport fallback: If WebSocket does not reach SUBSCRIBED status within
 * 5 seconds, automatically switches to HTTP polling every 3 seconds.
 * This ensures the app works on school networks that block WebSocket.
 *
 * @param pollId - The poll ID to subscribe to
 * @param batchIntervalMs - How often to flush accumulated vote updates (default 2000ms)
 */
export function useRealtimePoll(pollId: string, sessionId?: string | null, batchIntervalMs = 2000) {
  const supabase = useMemo(() => createClient(), [])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [totalVotes, setTotalVotes] = useState(0)
  const [pollStatus, setPollStatus] = useState<PollStatus>('draft')
  const [bordaScores, setBordaScores] = useState<BordaScore[] | null>(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [transport, setTransport] = useState<'websocket' | 'polling'>('websocket')

  // Ref for batching vote updates -- accumulates between flushes
  const pendingVoteCounts = useRef<Record<string, number>>({})
  const pendingTotalVotes = useRef<number | null>(null)

  // Fetch full poll state from polling API
  const fetchPollState = useCallback(async () => {
    try {
      const res = await fetch(`/api/polls/${pollId}/state`)
      if (!res.ok) return
      const data: PollStateResponse = await res.json()

      setVoteCounts(data.voteCounts)
      setTotalVotes(data.totalVotes)
      setPollStatus(data.status)

      if (data.participantCount !== undefined) {
        setParticipantCount(data.participantCount)
      }

      if (data.bordaScores) {
        setBordaScores(data.bordaScores)
      }
    } catch {
      // Fetch failure is non-fatal -- will retry on next event or interval
    }
  }, [pollId])

  useEffect(() => {
    let wsConnected = false
    let pollInterval: ReturnType<typeof setInterval> | null = null

    // Set up batch flush interval for vote count updates
    const flushInterval = setInterval(() => {
      const pending = pendingVoteCounts.current
      const keys = Object.keys(pending)
      if (keys.length === 0 && pendingTotalVotes.current === null) return

      // Flush pending updates into state
      if (keys.length > 0) {
        setVoteCounts(pending)
        pendingVoteCounts.current = {}
      }
      if (pendingTotalVotes.current !== null) {
        setTotalVotes(pendingTotalVotes.current)
        pendingTotalVotes.current = null
      }
    }, batchIntervalMs)

    // Subscribe to poll channel
    const channel = supabase
      .channel(`poll:${pollId}`)
      .on('broadcast', { event: 'poll_vote_update' }, (message) => {
        const { voteCounts: counts, totalVotes: total } = message.payload as {
          voteCounts: Record<string, number>
          totalVotes: number
        }

        // Accumulate into pending (NOT direct setState) for batching
        pendingVoteCounts.current = { ...pendingVoteCounts.current, ...counts }
        pendingTotalVotes.current = total
      })
      .on('broadcast', { event: 'poll_update' }, (message) => {
        const { type } = message.payload as { type: string }

        // Lifecycle changes need immediate refetch
        if (
          type === 'poll_closed' ||
          type === 'poll_activated' ||
          type === 'poll_archived' ||
          type === 'poll_paused' ||
          type === 'poll_resumed' ||
          type === 'poll_reopened'
        ) {
          fetchPollState()
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          wsConnected = true
          // Do an initial fetch to ensure we have latest state
          fetchPollState()
        }
      })

    // Subscribe to activities channel for participant_joined events
    // so teacher dashboard updates participantCount when new students join
    let activitiesChannel: ReturnType<typeof supabase.channel> | null = null
    if (sessionId) {
      activitiesChannel = supabase
        .channel(`activities:${sessionId}`)
        .on('broadcast', { event: 'participant_joined' }, () => {
          fetchPollState()
        })
        .subscribe()
    }

    // Transport fallback: if WebSocket doesn't connect within 5 seconds,
    // switch to HTTP polling every 3 seconds
    const wsTimeout = setTimeout(() => {
      if (!wsConnected) {
        setTransport('polling')
        // Immediately fetch once
        fetchPollState()
        // Start polling interval
        pollInterval = setInterval(fetchPollState, 3000)
      }
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      if (activitiesChannel) supabase.removeChannel(activitiesChannel)
      clearInterval(flushInterval)
      clearTimeout(wsTimeout)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [pollId, sessionId, supabase, batchIntervalMs, fetchPollState])

  return { voteCounts, totalVotes, pollStatus, bordaScores, transport, participantCount, refetch: fetchPollState }
}
