'use client'

import { useState, useMemo } from 'react'
import type { BracketWithDetails, BracketEntrantData, MatchupData } from '@/lib/bracket/types'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'
import { BracketZoomWrapper } from '@/components/bracket/bracket-zoom-wrapper'

// --- Types ---
interface DoubleElimDiagramProps {
  bracket: BracketWithDetails
  entrants: BracketEntrantData[]
  matchups: MatchupData[]
  isTeacher?: boolean
}

type DETab = 'winners' | 'losers' | 'grand_finals' | 'overview'

// --- Helpers ---

/**
 * Re-normalize rounds for a set of region-filtered matchups so BracketDiagram
 * receives rounds starting at 1. The DB stores LB and GF matchups with
 * round offsets to avoid unique constraint collisions.
 */
function normalizeRounds(matchups: MatchupData[]): MatchupData[] {
  if (matchups.length === 0) return []
  const minRound = Math.min(...matchups.map((m) => m.round))
  const offset = minRound - 1
  if (offset === 0) return matchups
  return matchups.map((m) => ({ ...m, round: m.round - offset }))
}

/**
 * Compute totalRounds for a set of normalized matchups.
 */
function computeTotalRounds(matchups: MatchupData[]): number {
  if (matchups.length === 0) return 0
  return Math.max(...matchups.map((m) => m.round))
}

/**
 * Collect all unique entrant IDs referenced by matchups.
 */
function referencedEntrantIds(matchups: MatchupData[]): Set<string> {
  const ids = new Set<string>()
  for (const m of matchups) {
    if (m.entrant1Id) ids.add(m.entrant1Id)
    if (m.entrant2Id) ids.add(m.entrant2Id)
  }
  return ids
}

// --- Tab badge ---
function TabBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
      {count}
    </span>
  )
}

// --- Grand Finals card ---
function GrandFinalsCard({ matchup }: { matchup: MatchupData }) {
  const e1Name = matchup.entrant1?.name ?? 'TBD'
  const e2Name = matchup.entrant2?.name ?? 'TBD'
  const isDecided = matchup.winnerId != null
  const isVoting = matchup.status === 'voting'

  return (
    <div
      className={`mx-auto w-full max-w-sm rounded-lg border-2 p-4 ${
        isVoting
          ? 'border-primary shadow-md'
          : isDecided
            ? 'border-green-500/50'
            : 'border-border'
      }`}
    >
      <div className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {matchup.round === 1 ? 'Grand Finals' : 'Grand Finals - Reset Match'}
      </div>
      <div className="flex items-center gap-3">
        {/* Entrant 1 (WB Champion) */}
        <div
          className={`flex-1 rounded-md border p-3 text-center text-sm font-medium ${
            matchup.winnerId === matchup.entrant1Id
              ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300'
              : matchup.entrant1 ? '' : 'text-muted-foreground italic'
          }`}
        >
          {e1Name}
          {matchup.entrant1 && (
            <div className="mt-0.5 text-[10px] text-muted-foreground">WB Champion</div>
          )}
        </div>

        <span className="text-xs font-bold text-muted-foreground">VS</span>

        {/* Entrant 2 (LB Champion) */}
        <div
          className={`flex-1 rounded-md border p-3 text-center text-sm font-medium ${
            matchup.winnerId === matchup.entrant2Id
              ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300'
              : matchup.entrant2 ? '' : 'text-muted-foreground italic'
          }`}
        >
          {e2Name}
          {matchup.entrant2 && (
            <div className="mt-0.5 text-[10px] text-muted-foreground">LB Champion</div>
          )}
        </div>
      </div>
      {isVoting && (
        <div className="mt-2 text-center text-xs font-medium text-primary">
          Voting in progress
        </div>
      )}
      {isDecided && (
        <div className="mt-2 text-center text-xs font-medium text-green-600">
          Winner: {matchup.winner?.name ?? 'Unknown'}
        </div>
      )}
    </div>
  )
}

// --- Main component ---
export function DoubleElimDiagram({
  bracket,
  entrants,
  matchups,
  isTeacher = false,
}: DoubleElimDiagramProps) {
  const [activeTab, setActiveTab] = useState<DETab>('winners')

  // Filter matchups by bracketRegion
  const winnersMatchups = useMemo(
    () => matchups.filter((m) => m.bracketRegion === 'winners'),
    [matchups]
  )
  const losersMatchups = useMemo(
    () => matchups.filter((m) => m.bracketRegion === 'losers'),
    [matchups]
  )
  const grandFinalsMatchups = useMemo(
    () => matchups.filter((m) => m.bracketRegion === 'grand_finals'),
    [matchups]
  )

  // Re-normalize rounds for BracketDiagram (it expects round 1..N)
  const normalizedWinners = useMemo(() => normalizeRounds(winnersMatchups), [winnersMatchups])
  const normalizedLosers = useMemo(() => normalizeRounds(losersMatchups), [losersMatchups])

  const winnersTotalRounds = useMemo(() => computeTotalRounds(normalizedWinners), [normalizedWinners])
  const losersTotalRounds = useMemo(() => computeTotalRounds(normalizedLosers), [normalizedLosers])

  // Badge counts: active matchups per region
  const winnersActive = useMemo(
    () => winnersMatchups.filter((m) => m.status === 'voting').length,
    [winnersMatchups]
  )
  const losersActive = useMemo(
    () => losersMatchups.filter((m) => m.status === 'voting').length,
    [losersMatchups]
  )
  const gfActive = useMemo(
    () => grandFinalsMatchups.filter((m) => m.status === 'voting').length,
    [grandFinalsMatchups]
  )

  // Grand Finals tab visibility: hidden until at least one GF matchup has both entrants set
  const showGrandFinals = useMemo(
    () => grandFinalsMatchups.some((m) => m.entrant1Id != null && m.entrant2Id != null),
    [grandFinalsMatchups]
  )

  // Effective bracket size for zoom detection
  const effectiveSize = bracket.maxEntrants ?? bracket.size

  // Overview data: entrant statuses
  const overviewData = useMemo(() => {
    const wbEntrantIds = referencedEntrantIds(winnersMatchups)
    const lbEntrantIds = referencedEntrantIds(losersMatchups)

    // Find entrants eliminated from WB (they appear in losers)
    // "Still in Winners" = referenced by WB, not yet in LB, and not eliminated from WB
    // "In Losers" = referenced by LB
    // "Eliminated" = lost in LB (appear as loser in a decided LB matchup but not referenced in later LB matchups)

    // Determine which entrants have been eliminated: they lost in a decided matchup
    // and are NOT the entrant in any pending/voting matchup
    const activeEntrantIds = new Set<string>()
    for (const m of matchups) {
      if (m.status !== 'decided') {
        if (m.entrant1Id) activeEntrantIds.add(m.entrant1Id)
        if (m.entrant2Id) activeEntrantIds.add(m.entrant2Id)
      }
    }

    // Entrants who lost a decided matchup
    const lostMatchupIds = new Set<string>()
    for (const m of matchups) {
      if (m.status === 'decided' && m.winnerId) {
        if (m.entrant1Id && m.entrant1Id !== m.winnerId) lostMatchupIds.add(m.entrant1Id)
        if (m.entrant2Id && m.entrant2Id !== m.winnerId) lostMatchupIds.add(m.entrant2Id)
      }
    }

    const stillInWinners: BracketEntrantData[] = []
    const inLosers: BracketEntrantData[] = []
    const eliminated: BracketEntrantData[] = []

    for (const e of entrants) {
      // If the entrant is still active in any non-decided matchup
      if (activeEntrantIds.has(e.id)) {
        // Check which region they're in
        if (lbEntrantIds.has(e.id)) {
          inLosers.push(e)
        } else {
          stillInWinners.push(e)
        }
      } else if (lostMatchupIds.has(e.id)) {
        // They lost and are not in any active matchup
        eliminated.push(e)
      } else {
        // No matchup references at all yet, or haven't played -- still in winners
        stillInWinners.push(e)
      }
    }

    return { stillInWinners, inLosers, eliminated }
  }, [entrants, matchups, winnersMatchups, losersMatchups])

  // When Grand Finals tab is selected but not yet visible, fall back to Winners
  const effectiveTab = activeTab === 'grand_finals' && !showGrandFinals ? 'winners' : activeTab

  // Tab definitions
  const tabs: { key: DETab; label: string; badge: number; hidden?: boolean }[] = [
    { key: 'winners', label: 'Winners', badge: winnersActive },
    { key: 'losers', label: 'Losers', badge: losersActive },
    { key: 'grand_finals', label: 'Grand Finals', badge: gfActive, hidden: !showGrandFinals },
    { key: 'overview', label: 'Overview', badge: 0 },
  ]

  const visibleTabs = tabs.filter((t) => !t.hidden)

  return (
    <div className="space-y-3">
      {/* Segmented control tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              effectiveTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            <TabBadge count={tab.badge} />
          </button>
        ))}
      </div>

      {/* Tab content */}
      {effectiveTab === 'winners' && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Winners Bracket
          </h3>
          {normalizedWinners.length > 0 ? (
            <div className="rounded-lg border p-3">
              {effectiveSize >= 32 ? (
                <BracketZoomWrapper
                  options={effectiveSize >= 64 ? { initialScale: 0.75 } : undefined}
                >
                  <BracketDiagram
                    matchups={normalizedWinners}
                    totalRounds={winnersTotalRounds}
                    bracketSize={effectiveSize}
                  />
                </BracketZoomWrapper>
              ) : (
                <BracketDiagram
                  matchups={normalizedWinners}
                  totalRounds={winnersTotalRounds}
                  bracketSize={effectiveSize}
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No winners bracket matchups.</p>
          )}
        </div>
      )}

      {effectiveTab === 'losers' && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Losers Bracket
          </h3>
          {normalizedLosers.length > 0 ? (
            <div className="rounded-lg border p-3">
              {effectiveSize >= 32 ? (
                <BracketZoomWrapper
                  options={effectiveSize >= 64 ? { initialScale: 0.75 } : undefined}
                >
                  <BracketDiagram
                    matchups={normalizedLosers}
                    totalRounds={losersTotalRounds}
                    bracketSize={effectiveSize}
                  />
                </BracketZoomWrapper>
              ) : (
                <BracketDiagram
                  matchups={normalizedLosers}
                  totalRounds={losersTotalRounds}
                  bracketSize={effectiveSize}
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No losers bracket matchups yet.</p>
          )}
        </div>
      )}

      {effectiveTab === 'grand_finals' && showGrandFinals && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Grand Finals
          </h3>
          <div className="space-y-4 py-4">
            {grandFinalsMatchups.map((m) => (
              <GrandFinalsCard key={m.id} matchup={m} />
            ))}
          </div>
        </div>
      )}

      {effectiveTab === 'overview' && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Entrant Overview
          </h3>
          <div className="space-y-4">
            {/* Still in Winners */}
            {overviewData.stillInWinners.length > 0 && (
              <div>
                <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  Still in Winners ({overviewData.stillInWinners.length})
                </h4>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                  {overviewData.stillInWinners.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-md border px-2.5 py-1.5 text-xs"
                    >
                      <span className="mr-1 text-muted-foreground">#{e.seedPosition}</span>
                      {e.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* In Losers Bracket */}
            {overviewData.inLosers.length > 0 && (
              <div>
                <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  In Losers Bracket ({overviewData.inLosers.length})
                </h4>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                  {overviewData.inLosers.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs dark:border-amber-800 dark:bg-amber-950"
                    >
                      <span className="mr-1 text-muted-foreground">#{e.seedPosition}</span>
                      {e.name}
                      <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400">
                        dropped
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Eliminated */}
            {overviewData.eliminated.length > 0 && (
              <div>
                <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
                  Eliminated ({overviewData.eliminated.length})
                </h4>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                  {overviewData.eliminated.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground line-through opacity-60"
                    >
                      <span className="mr-1">#{e.seedPosition}</span>
                      {e.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entrants.length === 0 && (
              <p className="text-sm text-muted-foreground">No entrants found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
