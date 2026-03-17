'use client'

import type { MatchupData, BracketData } from '@/lib/bracket/types'

/**
 * Check if a bracket is a sports bracket.
 */
export function isSportsBracket(bracket: BracketData): boolean {
  return bracket.bracketType === 'sports'
}

/**
 * Format a game start time for display.
 */
export function formatGameTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// --- Sports status badge (SVG) ---

interface SportsStatusBadgeProps {
  matchup: MatchupData
  x: number
  y: number
  width: number
}

/**
 * Renders a game status indicator within the SVG bracket diagram.
 * Shows LIVE (pulsing), FINAL, scheduled time, or POSTPONED.
 */
export function SportsStatusBadge({ matchup, x, y, width }: SportsStatusBadgeProps) {
  if (!matchup.gameStatus) return null

  if (matchup.gameStatus === 'in_progress') {
    return (
      <g>
        {/* Pulsing red dot */}
        <circle
          cx={x + 6}
          cy={y}
          r={3}
          style={{ fill: 'rgba(239, 68, 68, 0.9)' }}
        >
          <animate
            attributeName="opacity"
            values="1;0.4;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        <text
          x={x + 12}
          y={y + 3}
          style={{
            fill: 'rgba(239, 68, 68, 0.9)',
            fontSize: 8,
            fontWeight: 700,
            fontFamily: 'inherit',
            letterSpacing: '0.05em',
          }}
        >
          LIVE
        </text>
      </g>
    )
  }

  if (matchup.gameStatus === 'final') {
    return (
      <text
        x={x + width - 6}
        y={y + 3}
        textAnchor="end"
        style={{
          fill: 'var(--muted-foreground)',
          fontSize: 8,
          fontWeight: 600,
          fontFamily: 'inherit',
        }}
      >
        FINAL
      </text>
    )
  }

  if (matchup.gameStatus === 'scheduled' && matchup.gameStartTime) {
    return (
      <text
        x={x + width - 6}
        y={y + 3}
        textAnchor="end"
        style={{
          fill: 'var(--muted-foreground)',
          fontSize: 7,
          fontFamily: 'inherit',
        }}
      >
        {formatGameTime(matchup.gameStartTime)}
      </text>
    )
  }

  if (matchup.gameStatus === 'postponed') {
    return (
      <text
        x={x + width - 6}
        y={y + 3}
        textAnchor="end"
        style={{
          fill: 'rgba(234, 179, 8, 0.9)',
          fontSize: 8,
          fontWeight: 600,
          fontFamily: 'inherit',
        }}
      >
        POSTPONED
      </text>
    )
  }

  return null
}

