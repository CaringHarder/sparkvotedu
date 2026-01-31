'use client'

import { motion, AnimatePresence } from 'motion/react'
import type { PollOptionData } from '@/lib/poll/types'
import type { BordaLeaderboardEntry } from '@/lib/poll/borda'

interface RankedLeaderboardProps {
  options: PollOptionData[]
  bordaScores: BordaLeaderboardEntry[]
  totalVoters: number
}

/** Medal styling for top 3 positions */
const MEDAL_STYLES: Record<number, string> = {
  0: 'bg-amber-100 text-amber-800 border-amber-300', // Gold
  1: 'bg-gray-100 text-gray-700 border-gray-300',    // Silver
  2: 'bg-orange-100 text-orange-800 border-orange-300', // Bronze
}

/**
 * Borda count scored leaderboard with animated position transitions.
 *
 * Displays options ranked by total Borda points with proportional bars,
 * medal styling for top 3, and layout animations for smooth reordering.
 */
export function RankedLeaderboard({
  options,
  bordaScores,
  totalVoters,
}: RankedLeaderboardProps) {
  // Build option label lookup
  const optionLabels = new Map(options.map((o) => [o.id, o.text]))

  // Merge scores with option data, sorted by totalPoints descending
  const entries = bordaScores.map((s) => ({
    ...s,
    label: optionLabels.get(s.optionId) ?? 'Unknown',
  }))

  // Include options with no scores at the bottom
  const scoredIds = new Set(entries.map((e) => e.optionId))
  for (const opt of options) {
    if (!scoredIds.has(opt.id)) {
      entries.push({
        optionId: opt.id,
        totalPoints: 0,
        maxPossiblePoints: 0,
        voterCount: 0,
        label: opt.text,
      })
    }
  }

  const maxPoints = Math.max(...entries.map((e) => e.maxPossiblePoints), 1)

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {entries.map((entry, index) => {
          const barPct = (entry.totalPoints / maxPoints) * 100
          const medalClass = MEDAL_STYLES[index] ?? 'bg-muted text-muted-foreground border-border'

          return (
            <motion.div
              key={entry.optionId}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{
                layout: { type: 'spring', stiffness: 300, damping: 25 },
                opacity: { duration: 0.2 },
              }}
              className={`flex items-center gap-3 rounded-lg border p-3 ${index < 3 ? medalClass : 'bg-card border-border'}`}
            >
              {/* Position number */}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
                {index + 1}
              </span>

              {/* Option info + bar */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{entry.label}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums">
                    {entry.totalPoints} pts
                  </span>
                </div>

                {/* Points bar */}
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-indigo-500"
                    initial={{ width: '0%' }}
                    animate={{ width: `${barPct}%` }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 20,
                    }}
                  />
                </div>

                {/* Meta info */}
                <div className="flex gap-3 text-[11px] text-muted-foreground">
                  <span>
                    {entry.totalPoints} of {entry.maxPossiblePoints} possible
                  </span>
                  <span>
                    {entry.voterCount} voter{entry.voterCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {totalVoters === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No votes yet. Waiting for students to submit rankings...
        </p>
      )}
    </div>
  )
}
