'use client'

import { useMemo } from 'react'
import { BracketDiagram } from './bracket-diagram'
import type { MatchupData } from '@/lib/bracket/types'

// --- Types ---

type Quadrant = 'TL' | 'TR' | 'BL' | 'BR'

interface QuadrantBracketLayoutProps {
  matchups: MatchupData[]
  totalRounds: number
  className?: string
  /** When provided, entrant halves in "voting" matchups become clickable */
  onEntrantClick?: (matchupId: string, entrantId: string) => void
  /** Map of matchupId -> voted entrantId for showing which entrant was picked */
  votedEntrantIds?: Record<string, string | null>
  /** Allow entrant clicks on pending matchups (used by prediction mode) */
  allowPendingClick?: boolean
  /** Teacher view: inline vote counts per matchup */
  voteLabels?: Record<string, { e1: number; e2: number }>
  /** Teacher view: click handler when teacher clicks a matchup box */
  onMatchupClick?: (matchupId: string) => void
  /** Teacher view: currently selected matchup ID for highlight */
  selectedMatchupId?: string | null
  /** Actual entrant count for display */
  bracketSize?: number
}

// --- Quadrant assignment ---
// For a 64-entrant SE bracket (6 rounds), rounds 1-4 are quadrant rounds
// and rounds 5-6 are connecting rounds (semifinals + finals).
//
// Position-to-quadrant mapping (validated against bracket engine):
//   TL: R1 positions 1-8, R2 1-4, R3 1-2, R4 1
//   TR: R1 positions 9-16, R2 5-8, R3 3-4, R4 2
//   BL: R1 positions 17-24, R2 9-12, R3 5-6, R4 3
//   BR: R1 positions 25-32, R2 13-16, R3 7-8, R4 4
//
// The algorithm traces any round/position back to its round-1 ancestor
// to determine which quadrant the matchup belongs to.

const QUADRANT_ROUNDS = 4

function getQuadrant(round: number, position: number, totalRounds: number): Quadrant | 'connecting' {
  if (round > QUADRANT_ROUNDS) return 'connecting'
  // Trace back to round 1 position by expanding through feeder positions
  let r1Position = position
  for (let r = round; r > 1; r--) {
    r1Position = (r1Position - 1) * 2 + 1 // take the first (upper) feeder
  }
  // r1Position is now the first round-1 position in this subtree
  if (r1Position <= 8) return 'TL'
  if (r1Position <= 16) return 'TR'
  if (r1Position <= 24) return 'BL'
  return 'BR'
}

// --- Position normalization ---
// Each quadrant's matchups need their positions renormalized to 1-based
// within a 16-entrant sub-bracket (4 rounds).
//
// Quadrant offset in round 1:
//   TL: 0, TR: 8, BL: 16, BR: 24
// For higher rounds, offset = quadrantR1Offset / 2^(round-1)

const QUADRANT_R1_OFFSETS: Record<Quadrant, number> = {
  TL: 0,
  TR: 8,
  BL: 16,
  BR: 24,
}

function normalizePosition(round: number, position: number, quadrant: Quadrant): number {
  const r1Offset = QUADRANT_R1_OFFSETS[quadrant]
  const roundOffset = r1Offset / Math.pow(2, round - 1)
  return position - roundOffset
}

// --- Quadrant labels ---
const QUADRANT_LABELS: Record<Quadrant, string> = {
  TL: 'Region 1',
  TR: 'Region 2',
  BL: 'Region 3',
  BR: 'Region 4',
}

// --- Component ---

export function QuadrantBracketLayout({
  matchups,
  totalRounds,
  className,
  onEntrantClick,
  votedEntrantIds,
  allowPendingClick,
  voteLabels,
  onMatchupClick,
  selectedMatchupId,
}: QuadrantBracketLayoutProps) {
  // Split matchups into quadrants and connecting rounds
  const { quadrantMatchups, connectingMatchups } = useMemo(() => {
    const quadrants: Record<Quadrant, MatchupData[]> = { TL: [], TR: [], BL: [], BR: [] }
    const connecting: MatchupData[] = []

    for (const m of matchups) {
      const q = getQuadrant(m.round, m.position, totalRounds)
      if (q === 'connecting') {
        connecting.push(m)
      } else {
        // Normalize round and position within the quadrant sub-bracket
        const normalizedPosition = normalizePosition(m.round, m.position, q)
        quadrants[q].push({
          ...m,
          round: m.round, // Keep round as-is (1-4)
          position: normalizedPosition,
        })
      }
    }

    return { quadrantMatchups: quadrants, connectingMatchups: connecting }
  }, [matchups, totalRounds])

  // Normalize connecting matchup rounds (5-6 -> 1-2 for a 2-round sub-bracket)
  const normalizedConnecting = useMemo(() => {
    return connectingMatchups.map((m) => ({
      ...m,
      round: m.round - QUADRANT_ROUNDS,
    }))
  }, [connectingMatchups])

  // Filter voteLabels per quadrant
  const quadrantVoteLabels = useMemo(() => {
    if (!voteLabels) return { TL: undefined, TR: undefined, BL: undefined, BR: undefined, connecting: undefined }
    const result: Record<Quadrant | 'connecting', Record<string, { e1: number; e2: number }> | undefined> = {
      TL: undefined, TR: undefined, BL: undefined, BR: undefined, connecting: undefined,
    }
    for (const q of ['TL', 'TR', 'BL', 'BR'] as Quadrant[]) {
      const ids = new Set(quadrantMatchups[q].map((m) => m.id))
      const filtered: Record<string, { e1: number; e2: number }> = {}
      let hasAny = false
      for (const [id, label] of Object.entries(voteLabels)) {
        if (ids.has(id)) {
          filtered[id] = label
          hasAny = true
        }
      }
      if (hasAny) result[q] = filtered
    }
    // Connecting matchup labels
    const connectingIds = new Set(connectingMatchups.map((m) => m.id))
    const connectingFiltered: Record<string, { e1: number; e2: number }> = {}
    let hasConnecting = false
    for (const [id, label] of Object.entries(voteLabels)) {
      if (connectingIds.has(id)) {
        connectingFiltered[id] = label
        hasConnecting = true
      }
    }
    if (hasConnecting) result.connecting = connectingFiltered
    return result
  }, [voteLabels, quadrantMatchups, connectingMatchups])

  const quadrantEntries: Array<{ key: Quadrant; mirror: boolean }> = [
    { key: 'TL', mirror: false },
    { key: 'TR', mirror: true },
    { key: 'BL', mirror: false },
    { key: 'BR', mirror: true },
  ]

  return (
    <div className={className ?? ''}>
      {/* 2x2 Quadrant Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
        }}
      >
        {quadrantEntries.map(({ key, mirror }) => (
          <div key={key} style={{ minWidth: 0 }}>
            <div
              style={{
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 4,
              }}
            >
              {QUADRANT_LABELS[key]}
            </div>
            <BracketDiagram
              matchups={quadrantMatchups[key]}
              totalRounds={QUADRANT_ROUNDS}
              mirrorX={mirror}
              skipZoom
              onEntrantClick={onEntrantClick}
              votedEntrantIds={votedEntrantIds}
              allowPendingClick={allowPendingClick}
              voteLabels={quadrantVoteLabels[key]}
              onMatchupClick={onMatchupClick}
              selectedMatchupId={selectedMatchupId}
            />
          </div>
        ))}
      </div>

      {/* Connecting Rounds: Semifinals + Finals */}
      {normalizedConnecting.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--muted-foreground)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 4,
            }}
          >
            Final Four
          </div>
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <BracketDiagram
              matchups={normalizedConnecting}
              totalRounds={2}
              skipZoom
              onEntrantClick={onEntrantClick}
              votedEntrantIds={votedEntrantIds}
              allowPendingClick={allowPendingClick}
              voteLabels={quadrantVoteLabels.connecting}
              onMatchupClick={onMatchupClick}
              selectedMatchupId={selectedMatchupId}
            />
          </div>
        </div>
      )}
    </div>
  )
}
