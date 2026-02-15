'use client'

import { useMemo } from 'react'
import type { MatchupData, BracketEntrantData } from '@/lib/bracket/types'
import { BracketZoomWrapper } from '@/components/bracket/bracket-zoom-wrapper'

// --- Layout constants ---
const MATCH_WIDTH = 160
const MATCH_HEIGHT = 56
const ROUND_GAP = 36
const MATCH_V_GAP = 12
const PADDING = 12
const LABEL_HEIGHT = 24 // space for round labels above the bracket

// --- Exported constants for interactive overlays ---
export { MATCH_WIDTH, MATCH_HEIGHT, ROUND_GAP, MATCH_V_GAP, PADDING, LABEL_HEIGHT }
export { getMatchPosition }

// --- Props ---
interface BracketDiagramProps {
  matchups: MatchupData[]
  totalRounds: number
  className?: string
  /** Actual entrant count (used to determine if zoom wrapper is needed for 32+ brackets) */
  bracketSize?: number
  /** When provided, entrant halves in "voting" matchups become clickable */
  onEntrantClick?: (matchupId: string, entrantId: string) => void
  /** Set of matchup IDs the student has already voted in */
  votedMatchupIds?: Set<string>
  /** Map of matchupId -> voted entrantId for showing which entrant was picked */
  votedEntrantIds?: Record<string, string | null>
  /** Teacher view: inline vote counts per matchup { e1: number, e2: number } */
  voteLabels?: Record<string, { e1: number; e2: number }>
  /** Teacher view: click handler when teacher clicks a matchup box */
  onMatchupClick?: (matchupId: string) => void
  /** Teacher view: currently selected matchup ID for highlight */
  selectedMatchupId?: string | null
  /**
   * Use data-driven vertical positioning instead of recursive SE centering.
   * Prevents phantom position expansion for bracket structures where
   * consecutive rounds have the same matchup count (e.g. LB minor→major).
   */
  compactVertical?: boolean
  /** Allow entrant clicks on pending matchups (used by prediction mode) */
  allowPendingClick?: boolean
  /** Mirror X axis so rounds progress right-to-left (used by right quadrants in 64-entrant layout) */
  mirrorX?: boolean
  /** Skip the built-in BracketZoomWrapper (used when parent manages zoom) */
  skipZoom?: boolean
  /** Prediction accuracy data: matchupId -> 'correct' | 'incorrect' | null. Renders inline SVG badges. */
  accuracyMap?: Record<string, 'correct' | 'incorrect' | null>
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
  dst: { x: number; y: number },
  mirrored?: boolean
): string {
  if (mirrored) {
    // Mirrored: source is to the RIGHT, destination is to the LEFT
    // Connect from source LEFT edge to destination RIGHT edge
    const srcLeft = src.x
    const srcMidY = src.y + MATCH_HEIGHT / 2
    const dstRight = dst.x + MATCH_WIDTH
    const dstMidY = dst.y + MATCH_HEIGHT / 2
    const midX = (srcLeft + dstRight) / 2
    return `M ${srcLeft} ${srcMidY} H ${midX} V ${dstMidY} H ${dstRight}`
  }
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
  onEntrantClick,
  votedEntrantId,
  voteLabel,
  onMatchupClick,
  isSelected,
  allowPendingClick,
}: {
  matchup: MatchupData
  x: number
  y: number
  onEntrantClick?: (matchupId: string, entrantId: string) => void
  votedEntrantId?: string | null
  voteLabel?: { e1: number; e2: number }
  onMatchupClick?: (matchupId: string) => void
  isSelected?: boolean
  allowPendingClick?: boolean
}) {
  const isByeMatchup = matchup.isBye === true
  // For bye matchups: show "BYE" for the null slot, real entrant name for the other
  const isBye1 = isByeMatchup && matchup.entrant1 == null
  const isBye2 = isByeMatchup && matchup.entrant2 == null
  const entrant1Name = isBye1 ? 'BYE' : getEntrantName(matchup.entrant1)
  const entrant2Name = isBye2 ? 'BYE' : getEntrantName(matchup.entrant2)
  const isEntrant1Winner = matchup.winnerId != null && matchup.winnerId === matchup.entrant1Id
  const isEntrant2Winner = matchup.winnerId != null && matchup.winnerId === matchup.entrant2Id
  const isTBD1 = !isBye1 && matchup.entrant1 == null
  const isTBD2 = !isBye2 && matchup.entrant2 == null

  const isVoting = matchup.status === 'voting'
  const isClickable = (isVoting || (allowPendingClick && matchup.status === 'pending')) && onEntrantClick && !isByeMatchup
  const voted1 = votedEntrantId === matchup.entrant1Id
  const voted2 = votedEntrantId === matchup.entrant2Id

  return (
    <g>
      {/* BYE slot background for top half */}
      {isBye1 && (
        <rect
          x={x + 1}
          y={y + 1}
          width={MATCH_WIDTH - 2}
          height={MATCH_HEIGHT / 2 - 1}
          rx={6}
          ry={6}
          style={{ fill: 'var(--muted)' }}
        />
      )}
      {/* BYE slot background for bottom half */}
      {isBye2 && (
        <rect
          x={x + 1}
          y={y + MATCH_HEIGHT / 2}
          width={MATCH_WIDTH - 2}
          height={MATCH_HEIGHT / 2 - 1}
          rx={6}
          ry={6}
          style={{ fill: 'var(--muted)' }}
        />
      )}

      {/* Winner highlight background for top half */}
      {isEntrant1Winner && !isBye1 && (
        <rect
          x={x + 1}
          y={y + 1}
          width={MATCH_WIDTH - 2}
          height={MATCH_HEIGHT / 2 - 1}
          rx={6}
          ry={6}
          style={{ fill: 'color-mix(in oklch, var(--primary) 8%, transparent)' }}
        />
      )}
      {/* Winner highlight background for bottom half */}
      {isEntrant2Winner && !isBye2 && (
        <rect
          x={x + 1}
          y={y + MATCH_HEIGHT / 2}
          width={MATCH_WIDTH - 2}
          height={MATCH_HEIGHT / 2 - 1}
          rx={6}
          ry={6}
          style={{ fill: 'color-mix(in oklch, var(--primary) 8%, transparent)' }}
        />
      )}

      {/* Voted highlight for top half */}
      {voted1 && (
        <rect
          x={x + 1}
          y={y + 1}
          width={MATCH_WIDTH - 2}
          height={MATCH_HEIGHT / 2 - 1}
          rx={6}
          ry={6}
          style={{ fill: 'color-mix(in oklch, var(--primary) 15%, transparent)' }}
        />
      )}
      {/* Voted highlight for bottom half */}
      {voted2 && (
        <rect
          x={x + 1}
          y={y + MATCH_HEIGHT / 2}
          width={MATCH_WIDTH - 2}
          height={MATCH_HEIGHT / 2 - 1}
          rx={6}
          ry={6}
          style={{ fill: 'color-mix(in oklch, var(--primary) 15%, transparent)' }}
        />
      )}

      {/* Selected matchup highlight (teacher view) */}
      {isSelected && (
        <rect
          x={x - 3}
          y={y - 3}
          width={MATCH_WIDTH + 6}
          height={MATCH_HEIGHT + 6}
          rx={9}
          ry={9}
          style={{
            fill: 'none',
            stroke: 'var(--primary)',
            strokeWidth: 2.5,
            strokeDasharray: '6 3',
          }}
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
          fill: 'var(--card)',
          stroke: isSelected ? 'var(--primary)' : isVoting ? 'var(--primary)' : 'var(--border)',
          strokeWidth: isSelected ? 2 : isVoting ? 2 : 1.5,
          cursor: onMatchupClick ? 'pointer' : undefined,
        }}
        onPointerDown={onMatchupClick ? (e) => e.stopPropagation() : undefined}
        onClick={onMatchupClick ? () => onMatchupClick(matchup.id) : undefined}
      />

      {/* Voting indicator glow */}
      {isVoting && !isSelected && (
        <rect
          x={x}
          y={y}
          width={MATCH_WIDTH}
          height={MATCH_HEIGHT}
          rx={6}
          ry={6}
          style={{
            fill: 'none',
            stroke: 'var(--primary)',
            strokeWidth: 1,
            opacity: 0.3,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Clickable top entrant area */}
      {isClickable && matchup.entrant1Id && (
        <rect
          x={x}
          y={y}
          width={MATCH_WIDTH}
          height={MATCH_HEIGHT / 2}
          style={{ fill: 'transparent', cursor: 'pointer' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onEntrantClick(matchup.id, matchup.entrant1Id!)}
        >
          <title>Vote for {entrant1Name}</title>
        </rect>
      )}

      {/* Top entrant name */}
      <text
        x={x + 8}
        y={y + 19}
        style={{
          fill: isBye1
            ? 'var(--muted-foreground)'
            : isTBD1
              ? 'var(--muted-foreground)'
              : voted1
                ? 'var(--primary)'
                : 'var(--foreground)',
          fontSize: 11,
          fontFamily: 'inherit',
          fontWeight: isEntrant1Winner || voted1 ? 700 : isBye1 ? 400 : 400,
          fontStyle: isTBD1 || isBye1 ? 'italic' : 'normal',
          pointerEvents: 'none',
        }}
      >
        {entrant1Name}{voted1 ? ' ✓' : ''}
      </text>

      {/* Top entrant vote count (teacher view) */}
      {voteLabel && (
        <text
          x={x + MATCH_WIDTH - 8}
          y={y + 19}
          textAnchor="end"
          style={{
            fill: 'var(--muted-foreground)',
            fontSize: 10,
            fontFamily: 'inherit',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          {voteLabel.e1}
        </text>
      )}

      {/* Divider line */}
      <line
        x1={x}
        y1={y + MATCH_HEIGHT / 2}
        x2={x + MATCH_WIDTH}
        y2={y + MATCH_HEIGHT / 2}
        style={{
          stroke: isVoting ? 'var(--primary)' : 'var(--border)',
          strokeWidth: 1,
          opacity: isVoting ? 0.3 : 1,
        }}
      />

      {/* Clickable bottom entrant area */}
      {isClickable && matchup.entrant2Id && (
        <rect
          x={x}
          y={y + MATCH_HEIGHT / 2}
          width={MATCH_WIDTH}
          height={MATCH_HEIGHT / 2}
          style={{ fill: 'transparent', cursor: 'pointer' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onEntrantClick(matchup.id, matchup.entrant2Id!)}
        >
          <title>Vote for {entrant2Name}</title>
        </rect>
      )}

      {/* Bottom entrant name */}
      <text
        x={x + 8}
        y={y + 44}
        style={{
          fill: isBye2
            ? 'var(--muted-foreground)'
            : isTBD2
              ? 'var(--muted-foreground)'
              : voted2
                ? 'var(--primary)'
                : 'var(--foreground)',
          fontSize: 11,
          fontFamily: 'inherit',
          fontWeight: isEntrant2Winner || voted2 ? 700 : isBye2 ? 400 : 400,
          fontStyle: isTBD2 || isBye2 ? 'italic' : 'normal',
          pointerEvents: 'none',
        }}
      >
        {entrant2Name}{voted2 ? ' ✓' : ''}
      </text>

      {/* Bottom entrant vote count (teacher view) */}
      {voteLabel && (
        <text
          x={x + MATCH_WIDTH - 8}
          y={y + 44}
          textAnchor="end"
          style={{
            fill: 'var(--muted-foreground)',
            fontSize: 10,
            fontFamily: 'inherit',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          {voteLabel.e2}
        </text>
      )}
    </g>
  )
}

// --- Compact vertical positioning ---
// For non-SE structures (e.g. losers bracket) where consecutive rounds can
// have the same number of matchups. Positions each round's matchups centered
// vertically within the total height (determined by the densest round).
function getCompactPositions(
  matchups: MatchupData[],
  totalRounds: number
): { positions: Map<string, { x: number; y: number }>; totalHeight: number } {
  // Group matchups by round
  const byRound: Record<number, MatchupData[]> = {}
  for (const m of matchups) {
    (byRound[m.round] ??= []).push(m)
  }
  // Sort each round by position
  for (const r of Object.keys(byRound)) {
    byRound[Number(r)].sort((a, b) => a.position - b.position)
  }

  // Find the round with the most matchups to determine total height
  const maxCount = Math.max(...Object.values(byRound).map((ms) => ms.length), 1)
  const contentHeight = maxCount * (MATCH_HEIGHT + MATCH_V_GAP) - MATCH_V_GAP

  const positions = new Map<string, { x: number; y: number }>()

  for (let r = 1; r <= totalRounds; r++) {
    const roundMatchups = byRound[r] ?? []
    const count = roundMatchups.length
    const roundHeight = count * (MATCH_HEIGHT + MATCH_V_GAP) - MATCH_V_GAP
    const startY = PADDING + LABEL_HEIGHT + (contentHeight - roundHeight) / 2
    const x = PADDING + (r - 1) * (MATCH_WIDTH + ROUND_GAP)

    for (let i = 0; i < roundMatchups.length; i++) {
      positions.set(roundMatchups[i].id, {
        x,
        y: startY + i * (MATCH_HEIGHT + MATCH_V_GAP),
      })
    }
  }

  return { positions, totalHeight: PADDING * 2 + LABEL_HEIGHT + contentHeight }
}

// --- Main BracketDiagram component ---
export function BracketDiagram({ matchups, totalRounds, className, bracketSize, onEntrantClick, votedEntrantIds, voteLabels, onMatchupClick, selectedMatchupId, compactVertical, allowPendingClick, mirrorX, skipZoom, accuracyMap }: BracketDiagramProps) {
  const roundLabels = useMemo(() => getRoundLabels(totalRounds), [totalRounds])

  // Compact positioning for non-SE structures (e.g. losers bracket)
  const compactData = useMemo(
    () => (compactVertical ? getCompactPositions(matchups, totalRounds) : null),
    [compactVertical, matchups, totalRounds]
  )

  // Compute SVG dimensions (needed before positioning for mirrorX)
  const svgWidth = PADDING * 2 + totalRounds * MATCH_WIDTH + (totalRounds - 1) * ROUND_GAP

  // Pre-compute positions for all matchups
  const positionedMatchups = useMemo(() => {
    let items: Array<{ matchup: MatchupData; pos: { x: number; y: number } }>
    if (compactData) {
      items = matchups.map((m) => ({
        matchup: m,
        pos: compactData.positions.get(m.id) ?? { x: 0, y: 0 },
      }))
    } else {
      items = matchups.map((m) => ({
        matchup: m,
        pos: getMatchPosition(m.round, m.position, totalRounds),
      }))
    }
    // If mirrorX, flip X coordinates so rounds progress right-to-left
    if (mirrorX) {
      return items.map(({ matchup, pos }) => ({
        matchup,
        pos: { x: svgWidth - pos.x - MATCH_WIDTH, y: pos.y },
      }))
    }
    return items
  }, [matchups, totalRounds, compactData, mirrorX, svgWidth])

  // Build a lookup by matchup ID for connector rendering
  const matchupById = useMemo(() => {
    const map = new Map<string, { matchup: MatchupData; pos: { x: number; y: number } }>()
    for (const pm of positionedMatchups) {
      map.set(pm.matchup.id, pm)
    }
    return map
  }, [positionedMatchups])

  // Compute SVG height
  const svgHeight = compactData
    ? compactData.totalHeight
    : (() => {
        const round1Matches = Math.pow(2, totalRounds - 1)
        return (
          PADDING * 2 +
          LABEL_HEIGHT +
          round1Matches * MATCH_HEIGHT +
          (round1Matches - 1) * MATCH_V_GAP
        )
      })()

  // Determine effective size for zoom wrapper (use maxEntrants bracket size if available)
  const effectiveSize = bracketSize ?? Math.pow(2, totalRounds)
  const needsZoom = !skipZoom && effectiveSize >= 32

  const svgContent = (
    <div className={className ?? ''} style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMinYMin meet"
        style={{ fontFamily: 'inherit', width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Round labels */}
        {roundLabels.map((label, i) => {
          const normalX = PADDING + i * (MATCH_WIDTH + ROUND_GAP) + MATCH_WIDTH / 2
          const x = mirrorX ? svgWidth - (PADDING + i * (MATCH_WIDTH + ROUND_GAP)) - MATCH_WIDTH / 2 : normalX
          return (
            <text
              key={`label-${i}`}
              x={x}
              y={PADDING + LABEL_HEIGHT / 2 + 3}
              textAnchor="middle"
              style={{
                fill: 'var(--muted-foreground)',
                fontSize: 10,
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

          const isByeConnector = matchup.isBye === true
          const path = getConnectorPath(pos, next.pos, mirrorX)
          return (
            <path
              key={`connector-${matchup.id}`}
              d={path}
              style={{
                stroke: 'var(--border)',
                strokeWidth: 1.5,
                fill: 'none',
                opacity: isByeConnector ? 0.4 : 1,
                strokeDasharray: isByeConnector ? '4 3' : undefined,
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
            onEntrantClick={onEntrantClick}
            votedEntrantId={votedEntrantIds?.[matchup.id]}
            voteLabel={voteLabels?.[matchup.id]}
            onMatchupClick={onMatchupClick}
            isSelected={selectedMatchupId === matchup.id}
            allowPendingClick={allowPendingClick}
          />
        ))}

        {/* Accuracy overlay badges (prediction reveal) */}
        {accuracyMap && positionedMatchups.map(({ matchup, pos }) => {
          const accuracy = accuracyMap[matchup.id]
          if (accuracy == null) return null

          const isCorrect = accuracy === 'correct'
          return (
            <g key={`accuracy-${matchup.id}`}>
              {/* Green/red border overlay */}
              <rect
                x={pos.x}
                y={pos.y}
                width={MATCH_WIDTH}
                height={MATCH_HEIGHT}
                rx={6}
                ry={6}
                style={{
                  fill: isCorrect
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                  stroke: isCorrect
                    ? 'rgba(34, 197, 94, 0.5)'
                    : 'rgba(239, 68, 68, 0.5)',
                  strokeWidth: 1.5,
                  pointerEvents: 'none',
                }}
              />
              {/* Badge circle + glyph */}
              <circle
                cx={pos.x + MATCH_WIDTH - 8}
                cy={pos.y + 8}
                r={6}
                style={{
                  fill: isCorrect
                    ? 'rgba(34, 197, 94, 0.9)'
                    : 'rgba(239, 68, 68, 0.9)',
                }}
              />
              <text
                x={pos.x + MATCH_WIDTH - 8}
                y={pos.y + 11.5}
                textAnchor="middle"
                style={{
                  fill: 'white',
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {isCorrect ? '\u2713' : '\u2717'}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )

  if (needsZoom) {
    return (
      <BracketZoomWrapper
        options={effectiveSize >= 64 ? { initialScale: 0.75 } : undefined}
        bracketSize={effectiveSize}
      >
        {svgContent}
      </BracketZoomWrapper>
    )
  }

  return svgContent
}
