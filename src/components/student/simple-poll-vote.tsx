'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePollVote } from '@/hooks/use-poll-vote'
import type { PollWithOptions } from '@/lib/poll/types'

/** Color palette for poll option result bars -- matches bar-chart.tsx */
const OPTION_COLORS = [
  '#6366f1', // indigo-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#0ea5e9', // sky-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
]

interface SimplePollVoteProps {
  poll: PollWithOptions
  participantId: string
  existingVotes?: { optionId: string; rank: number }[]
  voteCounts?: Record<string, number>
  totalVotes?: number
  showLiveResults?: boolean
}

/**
 * Tappable card grid for simple poll voting.
 *
 * Displays poll question and options as a responsive card grid.
 * Selection feedback with brand color fill, border highlight, and check icon.
 * Single submit tap with "Vote submitted!" confirmation.
 * Supports vote change when poll allows it.
 *
 * FIX-02: Polls with exactly 2 options display as large centered side-by-side cards.
 * FIX-05: When showLiveResults is ON, renders real-time vote count bars below voting cards.
 */
export function SimplePollVote({
  poll,
  participantId,
  existingVotes,
  voteCounts,
  totalVotes,
  showLiveResults,
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

  // FIX-02: Detect 2-option polls for special centered layout
  const is2Options = poll.options.length === 2

  // FIX-05: Compute result data for live results display
  const sortedOptions = poll.options.slice().sort((a, b) => a.position - b.position)
  const total = totalVotes ?? 0
  const maxCount = sortedOptions.reduce(
    (max, opt) => Math.max(max, voteCounts?.[opt.id] ?? 0),
    1
  )

  return (
    <div className="w-full space-y-6">
      {/* Poll question */}
      <div className="text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">{poll.question}</h2>
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
        </div>
      )}

      {/* Options grid -- FIX-02: 2-option uses flex centered layout, 3+ uses grid */}
      <div
        className={
          is2Options
            ? 'flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8'
            : 'grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5'
        }
      >
        {sortedOptions.map((option) => {
          const isSelected = selectedOptionId === option.id
          const isDisabled = submitted && !canChangeVote

          return (
            <Card
              key={option.id}
              className={`cursor-pointer transition-all ${
                is2Options ? 'w-full sm:w-72 md:w-80' : ''
              } ${
                isSelected
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'hover:border-primary/30 hover:shadow-sm'
              } ${isDisabled ? 'pointer-events-none opacity-60' : ''}`}
              onClick={() => {
                if (!isDisabled) selectOption(option.id)
              }}
            >
              <CardContent
                className={`flex flex-col items-center justify-center gap-2 ${
                  is2Options
                    ? 'min-h-[160px] px-3 py-4 sm:min-h-[200px]'
                    : 'min-h-[120px] px-4 py-6 sm:min-h-[140px]'
                }`}
              >
                {/* Image thumbnail if present */}
                {option.imageUrl && (
                  <div
                    className={
                      is2Options
                        ? 'h-20 w-20 overflow-hidden rounded-md sm:h-24 sm:w-24'
                        : 'h-16 w-16 overflow-hidden rounded-md sm:h-20 sm:w-20'
                    }
                  >
                    <img
                      src={option.imageUrl}
                      alt={option.text}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* Option text */}
                <span
                  className={`text-center font-medium leading-tight ${
                    is2Options
                      ? 'text-lg sm:text-xl'
                      : 'text-base sm:text-lg'
                  }`}
                >
                  {option.text}
                </span>

                {/* Selection check */}
                {isSelected && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
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
            className="min-w-[200px] text-lg py-6"
          >
            {submitting ? 'Submitting...' : 'Submit Vote'}
          </Button>
        )}

        {submitted && canChangeVote && (
          <Button variant="outline" size="lg" className="text-lg py-6" onClick={enableChangeVote}>
            Change Vote
          </Button>
        )}
      </div>

      {/* FIX-05: Live results display when showLiveResults is ON */}
      {showLiveResults && voteCounts && total > 0 && (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <h3 className="text-center text-sm font-semibold text-muted-foreground">
            Live Results
          </h3>
          {sortedOptions.map((option, i) => {
            const count = voteCounts[option.id] ?? 0
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            const widthPct = (count / maxCount) * 100
            const color = OPTION_COLORS[i % OPTION_COLORS.length]

            return (
              <div key={option.id} className="space-y-1">
                {/* Label row */}
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {option.text}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {count} vote{count !== 1 ? 's' : ''} ({pct}%)
                  </span>
                </div>

                {/* Bar */}
                <div className="relative h-6 w-full overflow-hidden rounded-md bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md transition-all duration-500 ease-out"
                    style={{
                      backgroundColor: color,
                      width: `${widthPct}%`,
                    }}
                  />
                </div>
              </div>
            )
          })}
          <p className="text-center text-xs text-muted-foreground">
            {total} total vote{total !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
