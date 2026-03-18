'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMyPredictions, getLeaderboard } from '@/actions/prediction'
import type { PredictionData, PredictionScore } from '@/lib/bracket/types'

/**
 * Real-time prediction hook for predictive brackets.
 *
 * Fetches initial predictions and leaderboard, then subscribes to
 * Supabase Realtime for prediction_status_changed events.
 *
 * Handles auto-resolution reveal events:
 * - 'reveal_round': trigger refetch + update revealedUpToRound
 * - 'reveal_complete': trigger refetch + set revealComplete flag
 * - 'results_prepared': trigger refetch
 *
 * Follows the same pattern as useRealtimeBracket:
 * - Initial fetch via server action
 * - useMemo for Supabase client (prevents duplicate subscriptions)
 * - Refetch on broadcast events
 *
 * @param bracketId - The bracket ID to track predictions for
 * @param participantId - Optional participant ID for fetching own predictions
 */
export function usePredictions(bracketId: string, participantId?: string, initialPredictionStatus?: string) {
  const supabase = useMemo(() => createClient(), [])
  const [myPredictions, setMyPredictions] = useState<PredictionData[]>([])
  const [leaderboard, setLeaderboard] = useState<PredictionScore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [revealedUpToRound, setRevealedUpToRound] = useState<number | null>(null)
  const [revealComplete, setRevealComplete] = useState(initialPredictionStatus === 'completed')

  // Track the last revealed round for change detection by consumers
  const prevRevealedRoundRef = useRef<number | null>(null)

  const fetchData = useCallback(async () => {
    try {
      // Fetch leaderboard (always)
      const leaderboardResult = await getLeaderboard(bracketId)
      if ('scores' in leaderboardResult && leaderboardResult.scores) {
        setLeaderboard(leaderboardResult.scores)
      }

      // Fetch own predictions (if participant)
      if (participantId) {
        const predictionsResult = await getMyPredictions(bracketId, participantId)
        if ('predictions' in predictionsResult && predictionsResult.predictions) {
          setMyPredictions(predictionsResult.predictions)
        }
      }
    } catch {
      // Fetch failure is non-fatal
    } finally {
      setIsLoading(false)
    }
  }, [bracketId, participantId])

  useEffect(() => {
    // Initial fetch
    fetchData()

    // Subscribe to bracket channel for prediction updates
    const channel = supabase
      .channel(`bracket:${bracketId}`)
      .on('broadcast', { event: 'bracket_update' }, (message) => {
        const { type, ...payload } = message.payload as { type: string; round?: number; [key: string]: unknown }

        // Refetch on prediction-related events
        if (
          type === 'prediction_status_changed' ||
          type === 'prediction_submitted' ||
          type === 'winner_selected' ||
          type === 'bracket_completed' ||
          type === 'scores_synced'
        ) {
          fetchData()
        }

        // Auto-resolution reveal events
        if (type === 'reveal_round') {
          const round = payload.round as number | undefined
          if (round != null) {
            prevRevealedRoundRef.current = revealedUpToRound
            setRevealedUpToRound(round)
          }
          fetchData()
        }

        if (type === 'reveal_complete') {
          setRevealComplete(true)
          fetchData()
        }

        if (type === 'results_prepared') {
          fetchData()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracketId, supabase, fetchData])

  return {
    myPredictions,
    leaderboard,
    isLoading,
    refetch: fetchData,
    revealedUpToRound,
    revealComplete,
  }
}
