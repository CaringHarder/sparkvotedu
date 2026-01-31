'use client'

import { useState, useCallback } from 'react'
import { castPollVote } from '@/actions/poll'

interface Ranking {
  optionId: string
  rank: number
}

interface UsePollVoteOptions {
  pollId: string
  participantId: string
  pollType: 'simple' | 'ranked'
  allowVoteChange: boolean
  existingVotes?: { optionId: string; rank: number }[]
}

/**
 * Optimistic poll vote hook with submission state management.
 *
 * Handles both simple (single-select) and ranked (ordered preferences) polls.
 * Initializes from existing votes for vote restoration when students return.
 *
 * @param options - Poll configuration and participant identity
 */
export function usePollVote({
  pollId,
  participantId,
  pollType,
  allowVoteChange,
  existingVotes,
}: UsePollVoteOptions) {
  // Derive initial state from existing votes
  const hasExisting = existingVotes && existingVotes.length > 0
  const initialSelectedId =
    hasExisting && pollType === 'simple' ? existingVotes[0].optionId : null
  const initialRankings: Ranking[] =
    hasExisting && pollType === 'ranked'
      ? existingVotes.map((v) => ({ optionId: v.optionId, rank: v.rank }))
      : []

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    initialSelectedId
  )
  const [rankings, setRankings] = useState<Ranking[]>(initialRankings)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!hasExisting)
  const [error, setError] = useState<string | null>(null)

  /**
   * Whether the user can modify their vote.
   * True if allowVoteChange is enabled (regardless of submission status).
   */
  const canChangeVote = allowVoteChange

  /**
   * Select a single option for simple polls.
   * Ignored if already submitted and vote changes are not allowed.
   */
  const selectOption = useCallback(
    (optionId: string) => {
      if (submitted && !canChangeVote) return
      setError(null)
      setSelectedOptionId(optionId)
    },
    [submitted, canChangeVote]
  )

  /**
   * Add an option to the ranked list (tap-to-rank).
   * Appends at the next available rank position.
   */
  const addRanking = useCallback(
    (optionId: string) => {
      if (submitted && !canChangeVote) return
      setError(null)
      setRankings((prev) => {
        // Don't add if already ranked
        if (prev.some((r) => r.optionId === optionId)) return prev
        return [...prev, { optionId, rank: prev.length + 1 }]
      })
    },
    [submitted, canChangeVote]
  )

  /**
   * Remove the last-added ranking (undo).
   */
  const undoLastRanking = useCallback(() => {
    setError(null)
    setRankings((prev) => prev.slice(0, -1))
  }, [])

  /**
   * Clear all rankings (reset).
   */
  const resetRankings = useCallback(() => {
    setError(null)
    setRankings([])
  }, [])

  /**
   * Enable vote change mode (re-enables selection after submission).
   */
  const enableChangeVote = useCallback(() => {
    if (!canChangeVote) return
    setSubmitted(false)
    setError(null)
  }, [canChangeVote])

  /**
   * Submit the vote via castPollVote server action.
   * For simple polls: sends { pollId, participantId, optionId }.
   * For ranked polls: sends { pollId, participantId, rankings }.
   */
  const submitVote = useCallback(async () => {
    setError(null)
    setSubmitting(true)

    try {
      let result: { success?: boolean; error?: string }

      if (pollType === 'simple' && selectedOptionId) {
        result = await castPollVote({
          pollId,
          participantId,
          optionId: selectedOptionId,
        })
      } else if (pollType === 'ranked' && rankings.length > 0) {
        result = await castPollVote({
          pollId,
          participantId,
          rankings: rankings.map((r) => ({
            optionId: r.optionId,
            rank: r.rank,
          })),
        })
      } else {
        setError('No selection made')
        setSubmitting(false)
        return
      }

      if (result.error) {
        setError(result.error)
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('Failed to submit vote')
    } finally {
      setSubmitting(false)
    }
  }, [pollId, participantId, pollType, selectedOptionId, rankings])

  return {
    // Simple poll state
    selectedOptionId,
    selectOption,

    // Ranked poll state
    rankings,
    addRanking,
    undoLastRanking,
    resetRankings,

    // Submission state
    submitting,
    submitted,
    error,
    submitVote,
    canChangeVote,
    enableChangeVote,
  }
}
