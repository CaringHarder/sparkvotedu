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
  // Cap region depth at 4 rounds (16 entrants), reserve at least 1 connecting round
  const regionRounds = Math.min(4, totalRounds - 1)
  const r1PerRegion = Math.pow(2, regionRounds - 1)
  const totalR1 = Math.pow(2, totalRounds - 1)
  const numRegions = Math.round(totalR1 / r1PerRegion)

  // Bucket matchups into regions by tracing to R1 ancestor
  const regionBuckets: MatchupData[][] = Array.from({ length: numRegions }, () => [])
  const connectingBucket: MatchupData[] = []

  for (const m of matchups) {
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

  // Matchup count per tab (voting status or pending predictions)
  const votingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tab of allTabs) {
      counts[tab.key] = pendingPredictionIds
        ? tab.matchups.filter((m) => pendingPredictionIds.has(m.id)).length
        : tab.matchups.filter((m) => m.status === 'voting').length
    }
    return counts
  }, [allTabs, pendingPredictionIds])

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
          />
        </div>
      )}
    </div>
  )
}
