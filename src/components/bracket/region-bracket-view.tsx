'use client'

import { useState, useEffect, useMemo } from 'react'
import { BracketDiagram } from './bracket-diagram'
import { BracketMiniMap } from './bracket-mini-map'
import type { MatchupData } from '@/lib/bracket/types'

// --- Exported types ---

export interface RegionDef {
  key: string
  label: string
  matchups: MatchupData[]
  rounds: number
  r1Start: number
  r1End: number
}

// --- Region computation ---

/**
 * Split bracket matchups into navigable regions.
 *
 * - 32 entrants (5 rounds): 2 regions (Top Half / Bottom Half) + Championship
 * - 64 entrants (6 rounds): 4 regions (Region 1-4) + Final Four
 *
 * Each region contains at most 16 entrants (4 rounds) for readable rendering.
 */
export function computeRegions(
  matchups: MatchupData[],
  totalRounds: number
): {
  regions: RegionDef[]
  connectingRegion: RegionDef | null
  regionRounds: number
} {
  // Check if matchups have bracketRegion set (sports brackets from ESPN/SportsDataIO)
  // If so, group by actual region names instead of position-based math
  const hasBracketRegions = matchups.some(
    (m) => m.bracketRegion && m.round > 0 && !['Final Four', 'finals'].includes(m.bracketRegion)
  )

  if (hasBracketRegions) {
    return computeRegionsFromBracketField(matchups, totalRounds)
  }

  return computeRegionsFromPositions(matchups, totalRounds)
}

/**
 * Group matchups into regions using the bracketRegion field (sports brackets).
 * Each unique bracketRegion becomes a region. Final Four / Championship is the connecting region.
 */
function computeRegionsFromBracketField(
  matchups: MatchupData[],
  totalRounds: number
): {
  regions: RegionDef[]
  connectingRegion: RegionDef | null
  regionRounds: number
} {
  const regionMap = new Map<string, MatchupData[]>()
  const connectingBucket: MatchupData[] = []

  for (const m of matchups) {
    if (m.round <= 0) continue // Skip First Four / play-in games

    const region = m.bracketRegion
    if (!region || region === 'Final Four') {
      connectingBucket.push(m)
      continue
    }

    if (!regionMap.has(region)) {
      regionMap.set(region, [])
    }
    regionMap.get(region)!.push(m)
  }

  // Determine regionRounds from the max round in any region
  let regionRounds = 0
  for (const ms of regionMap.values()) {
    for (const m of ms) {
      if (m.round > regionRounds) regionRounds = m.round
    }
  }

  const regions: RegionDef[] = []
  let regionIdx = 0

  for (const [label, ms] of regionMap) {
    // Sort by round then position
    ms.sort((a, b) => a.round - b.round || a.position - b.position)

    // Reassign positions within each region to be 1-based per round
    const posCounters = new Map<number, number>()
    const normalized = ms.map((m) => {
      const pos = (posCounters.get(m.round) ?? 0) + 1
      posCounters.set(m.round, pos)
      return { ...m, position: pos }
    })

    const r1Count = normalized.filter((m) => m.round === 1).length
    regions.push({
      key: `region-${regionIdx}`,
      label,
      matchups: normalized,
      rounds: regionRounds,
      r1Start: regionIdx * r1Count + 1,
      r1End: (regionIdx + 1) * r1Count,
    })
    regionIdx++
  }

  // Connecting region (Final Four / Championship)
  let connectingRegion: RegionDef | null = null
  if (connectingBucket.length > 0) {
    const connectingRounds = totalRounds - regionRounds
    const posCounters = new Map<number, number>()
    const normalized = connectingBucket
      .sort((a, b) => a.round - b.round || a.position - b.position)
      .map((m) => {
        const adjustedRound = m.round - regionRounds
        const pos = (posCounters.get(adjustedRound) ?? 0) + 1
        posCounters.set(adjustedRound, pos)
        return { ...m, round: adjustedRound, position: pos }
      })

    connectingRegion = {
      key: 'finals',
      label: connectingRounds >= 2 ? 'Final Four' : 'Championship',
      matchups: normalized,
      rounds: connectingRounds,
      r1Start: 1,
      r1End: Math.pow(2, connectingRounds - 1),
    }
  }

  return { regions, connectingRegion, regionRounds }
}

/**
 * Group matchups into regions using position-based math (standard brackets).
 * This is the original algorithm for non-sports brackets.
 */
function computeRegionsFromPositions(
  matchups: MatchupData[],
  totalRounds: number
): {
  regions: RegionDef[]
  connectingRegion: RegionDef | null
  regionRounds: number
} {
  // Cap region depth at 4 rounds (16 entrants), reserve at least 1 connecting round
  const regionRounds = Math.min(4, totalRounds - 1)
  const r1PerRegion = Math.pow(2, regionRounds - 1)
  const totalR1 = Math.pow(2, totalRounds - 1)
  const numRegions = Math.round(totalR1 / r1PerRegion)

  // Bucket matchups into regions by tracing to R1 ancestor
  const regionBuckets: MatchupData[][] = Array.from({ length: numRegions }, () => [])
  const connectingBucket: MatchupData[] = []

  for (const m of matchups) {
    if (m.round <= 0) continue // Skip First Four / play-in games
    if (m.round > regionRounds) {
      connectingBucket.push(m)
      continue
    }

    // Trace back to round-1 position
    let r1Pos = m.position
    for (let r = m.round; r > 1; r--) {
      r1Pos = (r1Pos - 1) * 2 + 1
    }

    const regionIndex = Math.min(
      Math.floor((r1Pos - 1) / r1PerRegion),
      numRegions - 1
    )
    regionBuckets[regionIndex].push(m)
  }

  // Region labels
  const labels =
    numRegions === 2
      ? ['Top Half', 'Bottom Half']
      : Array.from({ length: numRegions }, (_, i) => `Region ${i + 1}`)

  const regions: RegionDef[] = regionBuckets.map((ms, i) => {
    const r1Start = i * r1PerRegion + 1
    const r1End = (i + 1) * r1PerRegion
    const r1Offset = i * r1PerRegion

    // Normalize positions within the region sub-bracket (1-based)
    const normalized = ms.map((m) => ({
      ...m,
      position: m.position - r1Offset / Math.pow(2, m.round - 1),
    }))

    return {
      key: `region-${i}`,
      label: labels[i],
      matchups: normalized,
      rounds: regionRounds,
      r1Start,
      r1End,
    }
  })

  // Connecting region (Championship or Final Four)
  let connectingRegion: RegionDef | null = null
  if (connectingBucket.length > 0) {
    const connectingRounds = totalRounds - regionRounds
    const normalized = connectingBucket.map((m) => ({
      ...m,
      round: m.round - regionRounds,
    }))

    connectingRegion = {
      key: 'finals',
      label: connectingRounds >= 2 ? 'Final Four' : 'Championship',
      matchups: normalized,
      rounds: connectingRounds,
      r1Start: 1,
      r1End: Math.pow(2, connectingRounds - 1),
    }
  }

  return { regions, connectingRegion, regionRounds }
}

// --- Helper: filter voteLabels to a set of matchup IDs ---

function filterVoteLabels(
  voteLabels: Record<string, { e1: number; e2: number }> | undefined,
  matchups: MatchupData[]
): Record<string, { e1: number; e2: number }> | undefined {
  if (!voteLabels) return undefined
  const ids = new Set(matchups.map((m) => m.id))
  const filtered: Record<string, { e1: number; e2: number }> = {}
  let hasAny = false
  for (const [id, label] of Object.entries(voteLabels)) {
    if (ids.has(id)) {
      filtered[id] = label
      hasAny = true
    }
  }
  return hasAny ? filtered : undefined
}

// --- Props ---

interface RegionBracketViewProps {
  matchups: MatchupData[]
  totalRounds: number
  bracketSize: number
  className?: string
  // Student voting
  onEntrantClick?: (matchupId: string, entrantId: string) => void
  votedEntrantIds?: Record<string, string | null>
  allowPendingClick?: boolean
  // Teacher dashboard
  voteLabels?: Record<string, { e1: number; e2: number }>
  onMatchupClick?: (matchupId: string) => void
  selectedMatchupId?: string | null
  /** Prediction accuracy data forwarded to child BracketDiagrams */
  accuracyMap?: Record<string, 'correct' | 'incorrect' | null>
  /** Matchup IDs pending prediction — used for region counts in prediction mode */
  pendingPredictionIds?: Set<string>
  /** Whether to show seed position numbers next to entrant names */
  showSeedNumbers?: boolean
  /** Sports bracket: forward to BracketDiagram for sports overlay rendering */
  isSports?: boolean
}

// --- Component ---

export function RegionBracketView({
  matchups,
  totalRounds,
  className,
  onEntrantClick,
  votedEntrantIds,
  allowPendingClick,
  voteLabels,
  onMatchupClick,
  selectedMatchupId,
  accuracyMap,
  pendingPredictionIds,
  showSeedNumbers,
  isSports,
}: RegionBracketViewProps) {
  const { regions, connectingRegion, regionRounds } = useMemo(
    () => computeRegions(matchups, totalRounds),
    [matchups, totalRounds]
  )

  const allTabs = useMemo(() => {
    const tabs = [...regions]
    if (connectingRegion) tabs.push(connectingRegion)
    return tabs
  }, [regions, connectingRegion])

  const [activeRegion, setActiveRegion] = useState(allTabs[0]?.key ?? '')

  // --- Consolidation detection ---
  // When all early region rounds (R1-R2) are decided, the bracket has narrowed
  // enough to show a unified mirrored view (Sweet 16 for 64-team, Elite 8 for 32-team).
  const consolidation = useMemo(() => {
    if (regionRounds < 4) return null // Only for brackets with 4+ region rounds

    // Check if rounds 1-2 across the whole bracket are decided
    const earlyRoundMatchups = matchups.filter((m) => m.round <= 2)
    if (earlyRoundMatchups.length === 0) return null
    const allEarlyDecided = earlyRoundMatchups.every((m) => m.status === 'decided')
    if (!allEarlyDecided) return null

    // Build remaining matchups per region (R3-R4 → display rounds 1-2)
    const firstRemainingRound = 3
    const displayRounds = regionRounds - firstRemainingRound + 1 // = 2

    const consolidatedRegions = regions.map((region, i) => {
      const remaining = region.matchups
        .filter((m) => m.round >= firstRemainingRound)
        .map((m) => ({
          ...m,
          round: m.round - firstRemainingRound + 1,
        }))
      // Right-side regions mirror for classic bracket look
      const mirror = i % 2 === 1
      const regionVL = filterVoteLabels(voteLabels, remaining)
      return { region, matchups: remaining, mirror, voteLabels: regionVL }
    })

    const connectingVL = connectingRegion
      ? filterVoteLabels(voteLabels, connectingRegion.matchups)
      : undefined

    return { consolidatedRegions, displayRounds, connectingVoteLabels: connectingVL }
  }, [matchups, regions, regionRounds, voteLabels, connectingRegion])

  const isConsolidated = consolidation !== null

  // Auto-navigate to region with voting matchups when round changes
  useEffect(() => {
    if (isConsolidated) return // Don't auto-navigate in consolidated mode
    const activeTab = allTabs.find((t) => t.key === activeRegion)
    const activeHasVoting = activeTab?.matchups.some((m) => m.status === 'voting')

    if (!activeHasVoting) {
      const votingTab = allTabs.find((t) =>
        t.matchups.some((m) => m.status === 'voting')
      )
      if (votingTab) {
        setActiveRegion(votingTab.key)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchups, isConsolidated])

  // Auto-switch to region containing teacher-selected matchup
  useEffect(() => {
    if (!selectedMatchupId || isConsolidated) return
    for (const tab of allTabs) {
      if (tab.matchups.some((m) => m.id === selectedMatchupId)) {
        if (tab.key !== activeRegion) {
          setActiveRegion(tab.key)
        }
        break
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatchupId, isConsolidated])

  const activeTab = allTabs.find((t) => t.key === activeRegion) ?? allTabs[0]

  // Filter voteLabels to active region's matchups (tab mode only)
  const activeVoteLabels = useMemo(() => {
    if (isConsolidated) return undefined
    return filterVoteLabels(voteLabels, activeTab?.matchups ?? [])
  }, [voteLabels, activeTab, isConsolidated])

  // Matchup count per tab (pending predictions, remaining votes, or total voting)
  const votingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tab of allTabs) {
      if (pendingPredictionIds) {
        counts[tab.key] = tab.matchups.filter((m) => pendingPredictionIds.has(m.id)).length
      } else if (votedEntrantIds) {
        // Student voting: count voting matchups not yet voted on
        counts[tab.key] = tab.matchups.filter(
          (m) => m.status === 'voting' && !votedEntrantIds[m.id]
        ).length
      } else {
        counts[tab.key] = tab.matchups.filter((m) => m.status === 'voting').length
      }
    }
    return counts
  }, [allTabs, pendingPredictionIds, votedEntrantIds])

  // --- Consolidated view: all remaining regions in a mirrored 2x2 grid ---
  if (isConsolidated && consolidation) {
    return (
      <div className={className ?? ''}>
        {/* Consolidated mirrored bracket view */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}
        >
          {consolidation.consolidatedRegions.map(({ region, matchups: rm, mirror, voteLabels: rvl }) => (
            <div key={region.key} style={{ minWidth: 0 }}>
              <div
                className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {region.label}
              </div>
              <BracketDiagram
                matchups={rm}
                totalRounds={consolidation.displayRounds}
                mirrorX={mirror}
                skipZoom
                onEntrantClick={onEntrantClick}
                votedEntrantIds={votedEntrantIds}
                allowPendingClick={allowPendingClick}
                voteLabels={rvl}
                onMatchupClick={onMatchupClick}
                selectedMatchupId={selectedMatchupId}
                accuracyMap={accuracyMap}
                showSeedNumbers={showSeedNumbers}
                isSports={isSports}
              />
            </div>
          ))}
        </div>

        {/* Connecting rounds (Final Four / Championship) below */}
        {connectingRegion && (
          <div style={{ maxWidth: 500, margin: '16px auto 0' }}>
            <div
              className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {connectingRegion.label}
            </div>
            <BracketDiagram
              matchups={connectingRegion.matchups}
              totalRounds={connectingRegion.rounds}
              skipZoom
              onEntrantClick={onEntrantClick}
              votedEntrantIds={votedEntrantIds}
              allowPendingClick={allowPendingClick}
              voteLabels={consolidation.connectingVoteLabels}
              onMatchupClick={onMatchupClick}
              selectedMatchupId={selectedMatchupId}
              accuracyMap={accuracyMap}
              isSports={isSports}
            />
          </div>
        )}
      </div>
    )
  }

  // --- Tab-based view: region card nav + single region diagram ---
  return (
    <div className={className ?? ''}>
      {/* Region card navigator (replaces old mini-map + tab bar) */}
      <BracketMiniMap
        regions={regions}
        connectingRegion={connectingRegion}
        activeRegion={activeRegion}
        onRegionClick={setActiveRegion}
        votingCounts={votingCounts}
      />

      {/* Active region: full-size bracket diagram */}
      {activeTab && (
        <div className="mt-3">
          <BracketDiagram
            matchups={activeTab.matchups}
            totalRounds={activeTab.rounds}
            onEntrantClick={onEntrantClick}
            votedEntrantIds={votedEntrantIds}
            allowPendingClick={allowPendingClick}
            voteLabels={activeVoteLabels}
            onMatchupClick={onMatchupClick}
            selectedMatchupId={selectedMatchupId}
            skipZoom
            accuracyMap={accuracyMap}
            showSeedNumbers={showSeedNumbers}
            isSports={isSports}
          />
        </div>
      )}
    </div>
  )
}
