'use client'

import { useState, useOptimistic, startTransition } from 'react'
import { castVote } from '@/actions/vote'

/**
 * Optimistic vote hook using React 19 useOptimistic.
 *
 * Provides instant feedback when a student casts a vote. The optimistic
 * state is shown immediately while the server action runs. If the server
 * action fails, useOptimistic automatically reverts to the confirmed state
 * when the transition ends.
 *
 * @param matchupId - The matchup being voted on
 * @param participantId - The student participant casting the vote
 * @param initialVote - The entrant ID already voted for (null if no vote yet)
 */
export function useVote(
  matchupId: string,
  participantId: string,
  initialVote: string | null
) {
  const [confirmedVote, setConfirmedVote] = useState<string | null>(initialVote)
  const [optimisticVote, setOptimisticVote] = useOptimistic(confirmedVote)
  const [error, setError] = useState<string | null>(null)

  /**
   * Submit a vote for an entrant.
   *
   * Sets optimistic state immediately, calls server action, and either
   * confirms the vote or lets useOptimistic revert on failure.
   */
  function submitVote(entrantId: string) {
    setError(null)

    startTransition(async () => {
      // Set optimistic vote immediately for instant UI feedback
      setOptimisticVote(entrantId)

      const result = await castVote({ matchupId, participantId, entrantId })

      if (result.error) {
        // Server returned an error -- useOptimistic reverts when transition ends
        setError(result.error)
      } else {
        // Vote confirmed -- update the confirmed state
        setConfirmedVote(entrantId)
      }
    })
  }

  return {
    /** The currently displayed vote (optimistic or confirmed) */
    votedEntrantId: optimisticVote,
    /** True while the optimistic vote differs from confirmed (transition pending) */
    isPending: optimisticVote !== confirmedVote,
    /** Error message from the last failed vote attempt, or null */
    error,
    /** Submit a vote for the given entrant ID */
    submitVote,
  }
}
