'use client'

import type { PollOptionData } from '@/lib/poll/types'
import type { BordaLeaderboardEntry } from '@/lib/poll/borda'

interface PresentationResultsProps {
  options: PollOptionData[]
  bordaScores: BordaLeaderboardEntry[]
  totalVoters: number
}

/**
 * Medal color scheme for top 3 positions.
 * High-contrast colors readable on projector at 30+ feet on dark bg (#0a0a0f).
 * WCAG AAA contrast ratios with bright backgrounds and dark text.
 */
const MEDAL_STYLES: Record<number, string> = {
  0: 'bg-amber-400 text-amber-950 border-amber-300',   // Gold
  1: 'bg-gray-300 text-gray-900 border-gray-200',      // Silver
  2: 'bg-orange-400 text-orange-950 border-orange-300', // Bronze
}

/** Default styling for non-medal positions (4th+) */
const DEFAULT_STYLE = 'bg-white/10 text-white/90 border-white/20'

/**
 * Presentation-optimized ranked poll results for projector display.
 *
 * Renders Borda count leaderboard with large text, high-contrast medal cards,
 * and spacing optimized for readability at 30+ feet on a dark background.
 * No animations -- simplicity for reliable projector rendering.
 */
export function PresentationResults({
  options,
  bordaScores,
  totalVoters,
}: PresentationResultsProps) {
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

  if (totalVoters === 0) {
    return (
      <p className="py-10 text-center text-xl text-white/60">
        No votes yet
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => {
        const barPct = (entry.totalPoints / maxPoints) * 100
        const isMedal = index < 3
        const medalClass = MEDAL_STYLES[index] ?? DEFAULT_STYLE
        const isFirst = index === 0

        return (
          <div
            key={entry.optionId}
            className={`flex items-center gap-4 ${
              isMedal
                ? `${medalClass} rounded-xl border-2 p-5`
                : `${DEFAULT_STYLE} rounded-lg border p-4`
            }`}
          >
            {/* Position number */}
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-3xl font-bold ${
                isMedal ? 'border-current' : 'border-white/30'
              }`}
            >
              {index + 1}
            </span>

            {/* Option info + bar */}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={`truncate font-bold ${
                    isFirst ? 'text-3xl' : 'text-2xl'
                  }`}
                >
                  {entry.label}
                </span>
                <span className="shrink-0 text-xl font-bold tabular-nums">
                  {entry.totalPoints} pts
                </span>
              </div>

              {/* Points bar */}
              <div
                className={`relative h-3 w-full overflow-hidden rounded-full ${
                  isMedal ? 'bg-black/20' : 'bg-white/10'
                }`}
              >
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                    isMedal ? 'bg-black/30' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${barPct}%` }}
                />
              </div>

              {/* Meta info */}
              <div
                className={`flex gap-4 text-sm ${
                  isMedal ? 'opacity-70' : 'text-white/60'
                }`}
              >
                <span>
                  {entry.totalPoints} of {entry.maxPossiblePoints} possible
                </span>
                <span>
                  {entry.voterCount} voter{entry.voterCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
