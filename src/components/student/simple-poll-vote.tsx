'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePollVote } from '@/hooks/use-poll-vote'
import type { PollWithOptions } from '@/lib/poll/types'

interface SimplePollVoteProps {
  poll: PollWithOptions
  participantId: string
  existingVotes?: { optionId: string; rank: number }[]
}

/**
 * Tappable card grid for simple poll voting.
 *
 * Displays poll question and options as a responsive card grid.
 * Selection feedback with brand color fill, border highlight, and check icon.
 * Single submit tap with "Vote submitted!" confirmation.
 * Supports vote change when poll allows it.
 */
export function SimplePollVote({
  poll,
  participantId,
  existingVotes,
}: SimplePollVoteProps) {
  const {
    selectedOptionId,
    selectOption,
    submitting,
    submitted,
    error,
    submitVote,
    canChangeVote,
    enableChangeVote,
  } = usePollVote({
    pollId: poll.id,
    participantId,
    pollType: 'simple',
    allowVoteChange: poll.allowVoteChange,
    existingVotes,
  })

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
            Vote submitted!
          </p>
          {poll.showLiveResults && (
            <p className="text-xs text-green-600/70 dark:text-green-400/70">
              Results will be shown when the poll closes
            </p>
          )}
        </div>
      )}

      {/* Options grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {poll.options
          .sort((a, b) => a.position - b.position)
          .map((option) => {
            const isSelected = selectedOptionId === option.id
            const isDisabled = submitted && !canChangeVote

            return (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'hover:border-primary/30 hover:shadow-sm'
                } ${isDisabled ? 'pointer-events-none opacity-60' : ''}`}
                onClick={() => {
                  if (!isDisabled) selectOption(option.id)
                }}
              >
                <CardContent className="flex min-h-[80px] flex-col items-center justify-center gap-2 px-3 py-4">
                  {/* Image thumbnail if present */}
                  {option.imageUrl && (
                    <div className="h-12 w-12 overflow-hidden rounded-md">
                      <img
                        src={option.imageUrl}
                        alt={option.text}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Option text */}
                  <span className="text-center text-sm font-medium leading-tight sm:text-base">
                    {option.text}
                  </span>

                  {/* Selection check */}
                  {isSelected && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary-foreground"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        {!submitted && (
          <Button
            size="lg"
            onClick={submitVote}
            disabled={!selectedOptionId || submitting}
            className="min-w-[160px]"
          >
            {submitting ? 'Submitting...' : 'Submit Vote'}
          </Button>
        )}

        {submitted && canChangeVote && (
          <Button variant="outline" size="lg" onClick={enableChangeVote}>
            Change Vote
          </Button>
        )}
      </div>
    </div>
  )
}
