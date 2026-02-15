'use client'

import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { ChevronDown, ChevronRight, Check, BarChart3 } from 'lucide-react'

interface MatchupDistribution {
  matchupLabel: string
  round: number
  position: number
  entrant1: { id: string; name: string; votes: number }
  entrant2: { id: string | null; name: string | null; votes: number }
  winnerId: string | null
  totalVotes: number
}

interface VoteDistributionProps {
  distribution: Record<string, MatchupDistribution>
}

/** Color palette for the two sides of a matchup bar */
const ENTRANT_COLORS = ['#6366f1', '#f59e0b'] as const // indigo-500, amber-500

/**
 * Vote distribution visualization for bracket matchups.
 *
 * Groups matchups by round with collapsible sections. Each matchup
 * shows a horizontal split bar with vote counts and percentages.
 * The latest round is expanded by default; earlier rounds are collapsed.
 */
export function VoteDistribution({ distribution }: VoteDistributionProps) {
  const matchups = useMemo(() => Object.values(distribution), [distribution])

  // Group by round
  const roundGroups = useMemo(() => {
    const groups = new Map<number, MatchupDistribution[]>()
    for (const m of matchups) {
      if (!groups.has(m.round)) {
        groups.set(m.round, [])
      }
      groups.get(m.round)!.push(m)
    }
    // Sort rounds ascending
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0])
  }, [matchups])

  const latestRound = roundGroups.length > 0
    ? roundGroups[roundGroups.length - 1][0]
    : 0

  if (matchups.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <BarChart3 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No votes recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" />
        Vote Distribution
      </h2>
      {roundGroups.map(([round, roundMatchups]) => (
        <RoundSection
          key={round}
          round={round}
          matchups={roundMatchups}
          defaultExpanded={round === latestRound}
        />
      ))}
    </div>
  )
}

function RoundSection({
  round,
  matchups,
  defaultExpanded,
}: {
  round: number
  matchups: MatchupDistribution[]
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/50"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold">Round {round}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {matchups.length} matchup{matchups.length !== 1 ? 's' : ''}
        </span>
      </button>

      {expanded && (
        <div className="divide-y border-t px-4 py-2">
          {matchups
            .sort((a, b) => a.position - b.position)
            .map((m, i) => (
              <MatchupCard key={`${m.round}-${m.position}`} matchup={m} index={i} />
            ))}
        </div>
      )}
    </div>
  )
}

function MatchupCard({
  matchup,
  index,
}: {
  matchup: MatchupDistribution
  index: number
}) {
  // Skip if entrant2 is null (bye data leaked)
  if (matchup.entrant2.id === null) return null

  const total = matchup.totalVotes
  const e1Pct = total > 0 ? Math.round((matchup.entrant1.votes / total) * 100) : 0
  const e2Pct = total > 0 ? 100 - e1Pct : 0

  const e1IsWinner = matchup.winnerId === matchup.entrant1.id
  const e2IsWinner = matchup.winnerId === matchup.entrant2.id

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="py-3"
    >
      {/* Entrant names row */}
      <div className="mb-2 flex items-center justify-between text-sm">
        <span
          className={
            e1IsWinner
              ? 'flex items-center gap-1 font-semibold text-green-700 dark:text-green-400'
              : ''
          }
        >
          {e1IsWinner && <Check className="h-3.5 w-3.5" />}
          {matchup.entrant1.name}
        </span>
        <span className="text-xs text-muted-foreground">vs</span>
        <span
          className={
            e2IsWinner
              ? 'flex items-center gap-1 font-semibold text-green-700 dark:text-green-400'
              : ''
          }
        >
          {matchup.entrant2.name}
          {e2IsWinner && <Check className="h-3.5 w-3.5" />}
        </span>
      </div>

      {/* Split bar */}
      <div className="mb-1.5 flex h-6 overflow-hidden rounded-md">
        <motion.div
          className="flex items-center justify-end rounded-l-md px-1.5"
          style={{ backgroundColor: ENTRANT_COLORS[0] }}
          initial={{ width: '0%' }}
          animate={{ width: total > 0 ? `${e1Pct}%` : '50%' }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, mass: 0.8 }}
        >
          {e1Pct > 15 && (
            <span className="text-xs font-bold text-white">{matchup.entrant1.votes}</span>
          )}
        </motion.div>
        <motion.div
          className="flex items-center justify-start rounded-r-md px-1.5"
          style={{ backgroundColor: ENTRANT_COLORS[1] }}
          initial={{ width: '0%' }}
          animate={{ width: total > 0 ? `${e2Pct}%` : '50%' }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, mass: 0.8 }}
        >
          {e2Pct > 15 && (
            <span className="text-xs font-bold text-white">{matchup.entrant2.votes}</span>
          )}
        </motion.div>
      </div>

      {/* Stats row */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {matchup.entrant1.votes} vote{matchup.entrant1.votes !== 1 ? 's' : ''} ({e1Pct}%)
        </span>
        <span>{total} total</span>
        <span>
          {matchup.entrant2.votes} vote{matchup.entrant2.votes !== 1 ? 's' : ''} ({e2Pct}%)
        </span>
      </div>
    </motion.div>
  )
}
