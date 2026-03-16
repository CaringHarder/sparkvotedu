'use client'

import type { MatchupData, BracketData, BracketEntrantData } from '@/lib/bracket/types'

/**
 * Check if a bracket is a sports bracket.
 */
export function isSportsBracket(bracket: BracketData): boolean {
  return bracket.bracketType === 'sports'
}

/**
 * Format a game start time for display.
 */
function formatGameTime(dateStr: string): string {
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

// --- Sports entrant row (SVG) ---

interface SportsEntrantRowProps {
  entrant: BracketEntrantData | null
  score: number | null
  isWinner: boolean
  x: number
  y: number
  width: number
}

/**
 * Renders a single entrant row with logo, seed, name, and score within SVG.
 * Used as an overlay on top of the standard matchup box.
 */
export function SportsEntrantRow({ entrant, score, isWinner, x, y, width }: SportsEntrantRowProps) {
  if (!entrant) return null

  // Display tournament seed (1-16) as prefix when available
  const seedPrefix = entrant.tournamentSeed != null ? `${entrant.tournamentSeed} ` : ''
  const nameText = seedPrefix + entrant.name

  // Truncate long names to fit in matchup box (reduced by 2 chars to accommodate seed prefix)
  const maxChars = score != null ? 12 : 16
  const displayName = nameText.length > maxChars
    ? nameText.substring(0, maxChars - 1) + '\u2026'
    : nameText

  return (
    <g>
      {/* Team logo or abbreviation fallback */}
      {entrant.logoUrl ? (
        <image
          href={entrant.logoUrl}
          x={x + 4}
          y={y - 7}
          width={14}
          height={14}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : entrant.abbreviation ? (
        <text
          x={x + 11}
          y={y + 3}
          textAnchor="middle"
          style={{
            fill: 'var(--muted-foreground)',
            fontSize: 7,
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          {entrant.abbreviation.substring(0, 3)}
        </text>
      ) : null}

      {/* Team name with seed */}
      <text
        x={x + 22}
        y={y + 3}
        style={{
          fill: isWinner ? 'var(--foreground)' : 'var(--foreground)',
          fontSize: 10,
          fontWeight: isWinner ? 700 : 400,
          fontFamily: 'inherit',
          pointerEvents: 'none',
        }}
      >
        {displayName}
      </text>

      {/* Score */}
      {score != null && (
        <text
          x={x + width - 6}
          y={y + 3}
          textAnchor="end"
          style={{
            fill: isWinner ? 'var(--foreground)' : 'var(--muted-foreground)',
            fontSize: 11,
            fontWeight: isWinner ? 700 : 500,
            fontFamily: 'inherit',
            pointerEvents: 'none',
          }}
        >
          {score}
        </text>
      )}
    </g>
  )
}

// --- Sports overlay for a single matchup (combines entrant rows + status badge) ---

interface SportsMatchupOverlayProps {
  matchup: MatchupData
  x: number
  y: number
  width: number
  height: number
}

/**
 * Full sports overlay for a matchup box in the SVG diagram.
 * Renders team logos, seeds, names, scores, and status badge
 * as transparent overlay elements on top of the standard matchup box.
 */
export function SportsMatchupOverlay({ matchup, x, y, width, height }: SportsMatchupOverlayProps) {
  const halfHeight = height / 2

  // Determine winner
  const is1Winner = matchup.winnerId != null && matchup.winnerId === matchup.entrant1Id
  const is2Winner = matchup.winnerId != null && matchup.winnerId === matchup.entrant2Id

  // Winner highlight backgrounds
  return (
    <g>
      {/* Winner highlight for entrant 1 */}
      {is1Winner && (
        <rect
          x={x + 1}
          y={y + 1}
          width={width - 2}
          height={halfHeight - 1}
          rx={6}
          ry={6}
          style={{ fill: 'rgba(34, 197, 94, 0.1)', pointerEvents: 'none' }}
        />
      )}
      {/* Winner highlight for entrant 2 */}
      {is2Winner && (
        <rect
          x={x + 1}
          y={y + halfHeight}
          width={width - 2}
          height={halfHeight - 1}
          rx={6}
          ry={6}
          style={{ fill: 'rgba(34, 197, 94, 0.1)', pointerEvents: 'none' }}
        />
      )}

      {/* Entrant 1 row */}
      <SportsEntrantRow
        entrant={matchup.entrant1}
        score={matchup.homeScore}
        isWinner={is1Winner}
        x={x}
        y={y + 16}
        width={width}
      />

      {/* Entrant 2 row */}
      <SportsEntrantRow
        entrant={matchup.entrant2}
        score={matchup.awayScore}
        isWinner={is2Winner}
        x={x}
        y={y + halfHeight + 16}
        width={width}
      />

      {/* Status badge (between the two halves, right-aligned) */}
      <SportsStatusBadge
        matchup={matchup}
        x={x}
        y={y + halfHeight - 3}
        width={width}
      />
    </g>
  )
}
