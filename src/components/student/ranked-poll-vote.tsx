'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePollVote } from '@/hooks/use-poll-vote'
import type { PollWithOptions } from '@/lib/poll/types'

interface RankedPollVoteProps {
  poll: PollWithOptions
  participantId: string
  existingVotes?: { optionId: string; rank: number }[]
}

/** Badge color by rank: gold, silver, bronze, then muted */
function rankBadgeClass(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-amber-400 text-amber-950'
    case 2:
      return 'bg-gray-300 text-gray-800'
    case 3:
      return 'bg-amber-600 text-white'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

/**
 * Tap-to-rank voting component for ranked polls.
 *
 * Students tap options in order of preference. Each tap assigns the next
 * rank number (1, 2, 3...) with a numbered badge overlay. Undo Last removes
 * the most recent ranking, Reset All clears everything.
 *
 * Cards are displayed in a single column on mobile (easier to read rank order)
 * and 2 columns on tablet+.
 *
 * Submit is enabled only when the required number of rankings is complete
 * (rankingDepth or all options).
 */
export function RankedPollVote({
  poll,
  participantId,
  existingVotes,
}: RankedPollVoteProps) {
  const maxRankings = poll.rankingDepth ?? poll.options.length

  const {
    rankings,
    addRanking,
    undoLastRanking,
    resetRankings,
    submitting,
    submitted,
    error,
    submitVote,
    canChangeVote,
    enableChangeVote,
  } = usePollVote({
    pollId: poll.id,
    participantId,
    pollType: 'ranked',
    allowVoteChange: poll.allowVoteChange,
    existingVotes,
  })

  /** Get the rank assigned to an option, or null if unranked */
  function getRank(optionId: string): number | null {
    const entry = rankings.find((r) => r.optionId === optionId)
    return entry ? entry.rank : null
  }

  const isComplete = rankings.length === maxRankings
  const isDisabled = submitted && !canChangeVote

  return (
    <div className="w-full space-y-6">
      {/* Poll question */}
      <div className="text-center">
        <h2 className="text-xl font-bold sm:text-2xl">{poll.question}</h2>
        {poll.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {poll.description}
          </p>
        )}
      </div>

      {/* Success state */}
      {submitted && (
        <div className="flex flex-col items-center gap-2 rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-600 dark:text-green-400"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Rankings submitted!
          </p>
          {poll.showLiveResults && (
            <p className="text-xs text-green-600/70 dark:text-green-400/70">
              Results will be shown when the poll closes
            </p>
          )}
        </div>
      )}

      {/* Ranking counter */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-medium">
          Ranked {rankings.length} of {maxRankings}
        </span>
        {!isComplete && !submitted && (
          <p className="mt-1 text-xs text-muted-foreground">
            Tap options in order of preference
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Submit button */}
        {!submitted && (
          <Button
            size="lg"
            onClick={submitVote}
            disabled={!isComplete || submitting}
            className={`min-w-[240px] text-xl font-bold py-7 ${
              !isComplete
                ? ''
                : submitting
                  ? 'bg-green-400 hover:bg-green-400 text-white border-0'
                  : 'bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg shadow-green-500/30 ring-4 ring-green-300/50 animate-[pulse_2s_ease-in-out_infinite]'
            }`}
          >
            {submitting
              ? 'Voting...'
              : isComplete
                ? 'VOTE'
                : `Rank ${maxRankings - rankings.length} more`}
          </Button>
        )}

        {/* Change rankings button */}
        {submitted && canChangeVote && (
          <Button variant="outline" size="lg" onClick={enableChangeVote}>
            Change Rankings
          </Button>
        )}

        {/* Undo / Reset buttons */}
        {rankings.length > 0 && !submitted && (
          <>
            <Button variant="outline" size="sm" onClick={undoLastRanking}>
              Undo Last
            </Button>
            <Button variant="outline" size="sm" onClick={resetRankings}>
              Reset All
            </Button>
          </>
        )}
      </div>

      {/* Options list */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {poll.options
          .sort((a, b) => a.position - b.position)
          .map((option) => {
            const rank = getRank(option.id)
            const isRanked = rank !== null

            return (
              <Card
                key={option.id}
                className={`relative cursor-pointer transition-all ${
                  isRanked
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : isComplete || isDisabled
                      ? 'opacity-50 pointer-events-none'
                      : 'hover:border-primary/30 hover:shadow-sm'
                } ${isDisabled ? 'pointer-events-none' : ''}`}
                onClick={() => {
                  if (!isRanked && !isComplete && !isDisabled) {
                    addRanking(option.id)
                  }
                }}
              >
                {/* Rank badge overlay */}
                {isRanked && (
                  <div
                    className={`absolute -left-1.5 -top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm ${rankBadgeClass(rank)}`}
                  >
                    {rank}
                  </div>
                )}

                <CardContent className="flex min-h-[80px] items-center gap-3 px-4 py-4">
                  {/* Image thumbnail if present */}
                  {option.imageUrl && (
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
                      <img
                        src={option.imageUrl}
                        alt={option.text}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Option text */}
                  <span className="text-sm font-medium leading-tight sm:text-base">
                    {option.text}
                  </span>
                </CardContent>
              </Card>
            )
          })}
      </div>
    </div>
  )
}
