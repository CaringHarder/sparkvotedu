'use client'

import type { RoundRobinStanding } from '@/lib/bracket/types'

interface RoundRobinStandingsProps {
  standings: RoundRobinStanding[]
  isLive?: boolean
  className?: string
}

const RANK_COLORS: Record<number, string> = {
  1: 'bg-amber-50 text-amber-800 border-amber-200',
  2: 'bg-gray-50 text-gray-700 border-gray-200',
  3: 'bg-orange-50 text-orange-800 border-orange-200',
}

const RANK_BADGE_COLORS: Record<number, string> = {
  1: 'bg-amber-400 text-white',
  2: 'bg-gray-300 text-gray-700',
  3: 'bg-amber-600 text-white',
}

/**
 * League table component displaying round-robin W-L-T records.
 *
 * Shows entrant standings with rank, wins, losses, ties, and points.
 * Top 3 ranks get gold/silver/bronze styling.
 * When isLive is false and standings are incomplete, shows a placeholder.
 */
export function RoundRobinStandings({
  standings,
  isLive = true,
  className = '',
}: RoundRobinStandingsProps) {
  if (!isLive && standings.length === 0) {
    return (
      <div className={`rounded-lg border p-6 text-center ${className}`}>
        <p className="text-sm text-muted-foreground">
          Standings will be revealed after the round closes.
        </p>
      </div>
    )
  }

  if (standings.length === 0) {
    return (
      <div className={`rounded-lg border p-6 text-center ${className}`}>
        <p className="text-sm text-muted-foreground">
          No results yet. Standings will appear as matchups are decided.
        </p>
      </div>
    )
  }

  return (
    <div className={`overflow-hidden rounded-lg border ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2 text-center w-12">#</th>
            <th className="px-3 py-2">Entrant</th>
            <th className="px-3 py-2 text-center w-12">W</th>
            <th className="px-3 py-2 text-center w-12">L</th>
            <th className="px-3 py-2 text-center w-12">T</th>
            <th className="px-3 py-2 text-center w-16">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing) => {
            const rowColor = RANK_COLORS[standing.rank] ?? ''
            const badgeColor = RANK_BADGE_COLORS[standing.rank]

            return (
              <tr
                key={standing.entrantId}
                className={`border-b last:border-b-0 transition-colors ${rowColor}`}
              >
                <td className="px-3 py-2 text-center">
                  {badgeColor ? (
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${badgeColor}`}
                    >
                      {standing.rank}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {standing.rank}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-medium">{standing.entrantName}</td>
                <td className="px-3 py-2 text-center font-mono text-green-600">
                  {standing.wins}
                </td>
                <td className="px-3 py-2 text-center font-mono text-red-500">
                  {standing.losses}
                </td>
                <td className="px-3 py-2 text-center font-mono text-muted-foreground">
                  {standing.ties}
                </td>
                <td className="px-3 py-2 text-center font-bold">
                  {standing.points}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
