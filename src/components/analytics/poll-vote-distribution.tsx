'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BarChart3 } from 'lucide-react'

/** Color palette for poll options -- 8 distinct Tailwind-compatible colors */
const COLORS = [
  '#6366f1', // indigo-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#0ea5e9', // sky-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
]

interface PollVoteDistributionProps {
  options: Array<{
    optionId: string
    optionText: string
    votes: number
    percentage: number
  }>
  totalVotes: number
  pollType: string
}

/**
 * Vote distribution bars for poll options.
 *
 * Renders each option as a horizontal bar with animated width proportional
 * to the max count (widest bar fills container). Sorted by votes descending.
 * For ranked polls, labels say "Borda score" instead of "votes".
 */
export function PollVoteDistribution({
  options,
  totalVotes,
  pollType,
}: PollVoteDistributionProps) {
  const isRanked = pollType === 'ranked'
  const voteLabel = isRanked ? 'Borda score' : 'votes'
  const singularLabel = isRanked ? 'Borda score' : 'vote'

  // Sort by votes descending (winner at top)
  const sorted = useMemo(
    () => [...options].sort((a, b) => b.votes - a.votes),
    [options]
  )

  const maxCount = useMemo(
    () => Math.max(...sorted.map((o) => o.votes), 1),
    [sorted]
  )

  if (sorted.length === 0 || totalVotes === 0) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <BarChart3 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No votes recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" />
        Vote Distribution
      </h2>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sorted.map((option, i) => {
            const widthPct = (option.votes / maxCount) * 100
            const color = COLORS[i % COLORS.length]

            return (
              <motion.div
                key={option.optionId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="space-y-1"
              >
                {/* Label row */}
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {option.optionText}
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {option.votes}{' '}
                    {option.votes === 1 ? singularLabel : voteLabel} (
                    {option.percentage}%)
                  </span>
                </div>

                {/* Bar */}
                <div className="relative h-8 w-full overflow-hidden rounded-md bg-muted">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-md"
                    style={{ backgroundColor: color }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 15,
                      mass: 0.8,
                    }}
                  >
                    {/* Count inside bar when wide enough */}
                    {widthPct > 15 && (
                      <span className="absolute inset-y-0 right-2 flex items-center text-xs font-bold text-white">
                        {option.votes}
                      </span>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
