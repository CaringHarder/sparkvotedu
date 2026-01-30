'use client'

import { useMemo } from 'react'
import type { MatchupData, BracketEntrantData } from '@/lib/bracket/types'

// --- Layout constants ---
const MATCH_WIDTH = 200
const MATCH_HEIGHT = 80
const ROUND_GAP = 60
const MATCH_V_GAP = 20
const PADDING = 20
const LABEL_HEIGHT = 30 // space for round labels above the bracket

// --- Props ---
interface BracketDiagramProps {
  matchups: MatchupData[]
  totalRounds: number
  className?: string
}

// --- Round label mapping ---
function getRoundLabels(totalRounds: number): string[] {
  if (totalRounds === 2) return ['Semifinals', 'Final']
  if (totalRounds === 3) return ['Quarterfinals', 'Semifinals', 'Final']
  if (totalRounds === 4) return ['Round 1', 'Quarterfinals', 'Semifinals', 'Final']
  // Fallback for other sizes
  const labels: string[] = []
  for (let i = 1; i <= totalRounds; i++) {
    if (i === totalRounds) labels.push('Final')
    else if (i === totalRounds - 1) labels.push('Semifinals')
    else if (i === totalRounds - 2) labels.push('Quarterfinals')
    else labels.push(`Round ${i}`)
  }
  return labels
}

// --- Position calculation ---
// Computes the (x, y) for a matchup box given its round and position.
// Round and position are 1-based as stored in the data model.
function getMatchPosition(
  round: number,
  position: number,
  totalRounds: number
): { x: number; y: number } {
  const x = PADDING + (round - 1) * (MATCH_WIDTH + ROUND_GAP)

  // Round 1: evenly spaced vertically
  if (round === 1) {
    const y = PADDING + LABEL_HEIGHT + (position - 1) * (MATCH_HEIGHT + MATCH_V_GAP)
    return { x, y }
  }

  // Later rounds: center between the two feeder matchups from the previous round.
  // The two feeder positions for position P in round R are:
  //   feeder1: round R-1, position 2*P - 1
  //   feeder2: round R-1, position 2*P
  const feeder1 = getMatchPosition(round - 1, 2 * position - 1, totalRounds)
  const feeder2 = getMatchPosition(round - 1, 2 * position, totalRounds)

  const y = (feeder1.y + feeder2.y) / 2
  return { x, y }
}

// --- Connector path between a source matchup and its next matchup ---
function getConnectorPath(
  src: { x: number; y: number },
  dst: { x: number; y: number }
): string {
  const srcRight = src.x + MATCH_WIDTH
  const srcMidY = src.y + MATCH_HEIGHT / 2
  const dstLeft = dst.x
  const dstMidY = dst.y + MATCH_HEIGHT / 2
  const midX = (srcRight + dstLeft) / 2

  // Bracket-style connector: horizontal right, vertical, horizontal right
  return `M ${srcRight} ${srcMidY} H ${midX} V ${dstMidY} H ${dstLeft}`
}

// --- Entrant name helper ---
function getEntrantName(entrant: BracketEntrantData | null): string {
  return entrant?.name ?? 'TBD'
}

// --- Single matchup box ---
function MatchupBox({
  matchup,
  x,
  y,
}: {
  matchup: MatchupData
  x: number
  y: number
}) {
  const entrant1Name = getEntrantName(matchup.entrant1)
  const entrant2Name = getEntrantName(matchup.entrant2)
  const isEntrant1Winner = matchup.winnerId != null && matchup.winnerId === matchup.entrant1Id
  const isEntrant2Winner = matchup.winnerId != null && matchup.winnerId === matchup.entrant2Id
  const isTBD1 = matchup.entrant1 == null
  const isTBD2 = matchup.entrant2 == null

  return (
    <g>
      {/* Winner highlight background for top half */}
      {isEntrant1Winner && (
        <rect
          x={x + 1}
          y={y + 1}
          width={MATCH_WIDTH - 2}
          height={MATCH_HEIGHT / 2 - 1}
          rx={6}
          ry={6}
          style={{ fill: 'hsl(var(--primary) / 0.08)' }}
        />
      )}
      {/* Winner highlight background for bottom half */}
      {isEntrant2Winner && (
        <rect
          x={x + 1}
          y={y + MATCH_HEIGHT / 2}
          width={MATCH_WIDTH - 2}
          height={MATCH_HEIGHT / 2 - 1}
          rx={6}
          ry={6}
          style={{ fill: 'hsl(var(--primary) / 0.08)' }}
        />
      )}

      {/* Matchup box */}
      <rect
        x={x}
        y={y}
        width={MATCH_WIDTH}
        height={MATCH_HEIGHT}
        rx={6}
        ry={6}
        style={{
          fill: 'hsl(var(--card))',
          stroke: 'hsl(var(--border))',
          strokeWidth: 1.5,
        }}
      />

      {/* Top entrant name */}
      <text
        x={x + 10}
        y={y + 28}
        style={{
          fill: isTBD1
            ? 'hsl(var(--muted-foreground))'
            : 'hsl(var(--foreground))',
          fontSize: 13,
          fontFamily: 'inherit',
          fontWeight: isEntrant1Winner ? 700 : 400,
          fontStyle: isTBD1 ? 'italic' : 'normal',
        }}
      >
        {entrant1Name}
      </text>

      {/* Divider line */}
      <line
        x1={x}
        y1={y + MATCH_HEIGHT / 2}
        x2={x + MATCH_WIDTH}
        y2={y + MATCH_HEIGHT / 2}
        style={{
          stroke: 'hsl(var(--border))',
          strokeWidth: 1,
        }}
      />

      {/* Bottom entrant name */}
      <text
        x={x + 10}
        y={y + 60}
        style={{
          fill: isTBD2
            ? 'hsl(var(--muted-foreground))'
            : 'hsl(var(--foreground))',
          fontSize: 13,
          fontFamily: 'inherit',
          fontWeight: isEntrant2Winner ? 700 : 400,
          fontStyle: isTBD2 ? 'italic' : 'normal',
        }}
      >
        {entrant2Name}
      </text>
    </g>
  )
}

// --- Main BracketDiagram component ---
export function BracketDiagram({ matchups, totalRounds, className }: BracketDiagramProps) {
  const roundLabels = useMemo(() => getRoundLabels(totalRounds), [totalRounds])

  // Pre-compute positions for all matchups
  const positionedMatchups = useMemo(() => {
    return matchups.map((m) => ({
      matchup: m,
      pos: getMatchPosition(m.round, m.position, totalRounds),
    }))
  }, [matchups, totalRounds])

  // Build a lookup by matchup ID for connector rendering
  const matchupById = useMemo(() => {
    const map = new Map<string, { matchup: MatchupData; pos: { x: number; y: number } }>()
    for (const pm of positionedMatchups) {
      map.set(pm.matchup.id, pm)
    }
    return map
  }, [positionedMatchups])

  // Compute SVG dimensions
  const svgWidth = PADDING * 2 + totalRounds * MATCH_WIDTH + (totalRounds - 1) * ROUND_GAP
  const round1Matches = Math.pow(2, totalRounds - 1) // e.g. 8 entrants = 4 matches in round 1
  const svgHeight =
    PADDING * 2 +
    LABEL_HEIGHT +
    round1Matches * MATCH_HEIGHT +
    (round1Matches - 1) * MATCH_V_GAP

  return (
    <div className={`overflow-x-auto ${className ?? ''}`}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ fontFamily: 'inherit' }}
      >
        {/* Round labels */}
        {roundLabels.map((label, i) => {
          const x = PADDING + i * (MATCH_WIDTH + ROUND_GAP) + MATCH_WIDTH / 2
          return (
            <text
              key={`label-${i}`}
              x={x}
              y={PADDING + LABEL_HEIGHT / 2 + 4}
              textAnchor="middle"
              style={{
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {label}
            </text>
          )
        })}

        {/* Connector lines (render before boxes so lines appear behind) */}
        {positionedMatchups.map(({ matchup, pos }) => {
          if (!matchup.nextMatchupId) return null
          const next = matchupById.get(matchup.nextMatchupId)
          if (!next) return null

          const path = getConnectorPath(pos, next.pos)
          return (
            <path
              key={`connector-${matchup.id}`}
              d={path}
              style={{
                stroke: 'hsl(var(--border))',
                strokeWidth: 1.5,
                fill: 'none',
              }}
            />
          )
        })}

        {/* Matchup boxes */}
        {positionedMatchups.map(({ matchup, pos }) => (
          <MatchupBox
            key={matchup.id}
            matchup={matchup}
            x={pos.x}
            y={pos.y}
          />
        ))}
      </svg>
    </div>
  )
}
