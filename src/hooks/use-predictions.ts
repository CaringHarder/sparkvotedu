'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMyPredictions, getLeaderboard } from '@/actions/prediction'
import type { PredictionData, PredictionScore } from '@/lib/bracket/types'

/**
 * Real-time prediction hook for predictive brackets.
 *
 * Fetches initial predictions and leaderboard, then subscribes to
 * Supabase Realtime for prediction_status_changed events.
 *
 * Follows the same pattern as useRealtimeBracket:
 * - Initial fetch via server action
 * - useMemo for Supabase client (prevents duplicate subscriptions)
 * - Refetch on broadcast events
 *
 * @param bracketId - The bracket ID to track predictions for
 * @param participantId - Optional participant ID for fetching own predictions
 */
export function usePredictions(bracketId: string, participantId?: string) {
  const supabase = useMemo(() => createClient(), [])
  const [myPredictions, setMyPredictions] = useState<PredictionData[]>([])
  const [leaderboard, setLeaderboard] = useState<PredictionScore[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
        const { type } = message.payload as { type: string }

        // Refetch on prediction-related events
        if (
          type === 'prediction_status_changed' ||
          type === 'prediction_submitted' ||
          type === 'winner_selected' ||
          type === 'bracket_completed'
        ) {
          fetchData()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bracketId, supabase, fetchData])

  return { myPredictions, leaderboard, isLoading, refetch: fetchData }
}
