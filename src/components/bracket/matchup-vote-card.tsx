'use client'

import React, { useEffect, useState } from 'react'
import { useVote } from '@/hooks/use-vote'
import type { MatchupData } from '@/lib/bracket/types'

interface MatchupVoteCardProps {
  matchup: MatchupData
  participantId: string
  initialVote: string | null
  disabled?: boolean
  showResult?: boolean
}

/** Status badge text and color */
function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'voting':
      return { label: 'Open', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' }
    case 'pending':
      return { label: 'Waiting', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' }
    case 'decided':
      return { label: 'Decided', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' }
    default:
      return { label: status, className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }
  }
}

/**
 * Single matchup voting card with two entrant buttons.
 *
 * Shows two large, tappable entrant buttons with a "VS" divider.
 * Uses the useVote hook for optimistic feedback -- voting feels instant.
 * Vote counts are NEVER shown to students.
 */
const MatchupVoteCardInner = React.memo(function MatchupVoteCardInner({
  matchup,
  participantId,
  initialVote,
  disabled = false,
  showResult = false,
}: MatchupVoteCardProps) {
  const { votedEntrantId, isPending, error, submitVote } = useVote(
    matchup.id,
    participantId,
    initialVote
  )

  // Auto-dismiss error after 3 seconds
  const [visibleError, setVisibleError] = useState<string | null>(null)
  useEffect(() => {
    if (error) {
      setVisibleError(error)
      const timeout = setTimeout(() => setVisibleError(null), 3000)
      return () => clearTimeout(timeout)
    }
    setVisibleError(null)
  }, [error])

  const isInteractive = matchup.status === 'voting' && !disabled
  const statusBadge = getStatusBadge(matchup.status)

  function handleVote(entrantId: string) {
    if (!isInteractive) return
    submitVote(entrantId)
  }

  function renderEntrantButton(
    entrant: MatchupData['entrant1'],
    entrantId: string | null
  ) {
    if (!entrant || !entrantId) {
      return (
        <div className="flex min-h-16 flex-1 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/50 px-4 py-3">
          <span className="text-lg font-medium text-muted-foreground italic">TBD</span>
        </div>
      )
    }

    const isVoted = votedEntrantId === entrantId
    const isWinner = showResult && matchup.winnerId === entrantId

    return (
      <button
        type="button"
        onClick={() => handleVote(entrantId)}
        disabled={!isInteractive}
        className={`
          relative flex min-h-16 flex-1 items-center justify-center rounded-xl border-2 px-4 py-3
          transition-all duration-200
          ${isInteractive ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
          ${isVoted
            ? 'border-primary bg-primary/10 shadow-md'
            : 'border-border bg-card hover:border-primary/50'
          }
          ${isWinner ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
          disabled:opacity-70
        `}
      >
        <span className="text-center text-lg font-semibold">{entrant.name}</span>

        {/* Checkmark for voted entrant */}
        {isVoted && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">
            {isPending ? (
              <span className="block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </span>
        )}

        {/* Trophy for winner */}
        {isWinner && (
          <span className="absolute left-2 top-2 text-sm" role="img" aria-label="Winner">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-yellow-500">
              <path
                fillRule="evenodd"
                d="M10 1a.75.75 0 01.75.75V3h2.5A2.75 2.75 0 0116 5.75v.586l1.127-.282A1.5 1.5 0 0119 7.5v2.25a1.5 1.5 0 01-1.19 1.467l-2.073.518A5.003 5.003 0 0112.5 14.77V16h1.75a.75.75 0 010 1.5h-8.5a.75.75 0 010-1.5H7.5v-1.23a5.003 5.003 0 01-3.237-3.035L2.19 11.217A1.5 1.5 0 011 9.75V7.5a1.5 1.5 0 011.873-1.453L4 6.329V5.75A2.75 2.75 0 016.75 3h2.5V1.75A.75.75 0 0110 1z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="w-full max-w-md rounded-xl border bg-card p-4 shadow-sm">
      {/* Status badge */}
      <div className="mb-3 flex items-center justify-center">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Entrant buttons with VS divider */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {renderEntrantButton(matchup.entrant1, matchup.entrant1Id)}

        <span className="flex-shrink-0 text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
          VS
        </span>

        {renderEntrantButton(matchup.entrant2, matchup.entrant2Id)}
      </div>

      {/* Error toast */}
      {visibleError && (
        <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {visibleError}
        </div>
      )}
    </div>
  )
})

export { MatchupVoteCardInner as MatchupVoteCard }
