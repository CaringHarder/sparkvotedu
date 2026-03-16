'use client'

import { useState, useMemo, useCallback } from 'react'
import type { MatchupData, BracketEntrantData } from '@/lib/bracket/types'

interface UsePredictionCascadeOptions {
  matchups: MatchupData[]
  initialSelections: Record<string, string>
  enabled: boolean // false when predictions closed or submitted+not editing
}

interface UsePredictionCascadeReturn {
  augmentedMatchups: MatchupData[]
  selectableMatchups: MatchupData[]
  selections: Record<string, string>
  handleSelect: (matchupId: string, entrantId: string) => void
  totalSelectableCount: number
  selectedCount: number
  allSelected: boolean
}

/**
 * Client-side prediction cascade engine.
 *
 * Takes bracket matchups and current selections, propagates predicted winners
 * through nextMatchupId topology so students can predict all rounds --
 * not just round 1. Changing an earlier pick cascades invalidation downstream.
 */
export function usePredictionCascade({
  matchups,
  initialSelections,
  enabled,
}: UsePredictionCascadeOptions): UsePredictionCascadeReturn {
  const [selections, setSelections] = useState<Record<string, string>>(() => ({
    ...initialSelections,
  }))

  // Sync selections when initialSelections changes (after server fetch)
  const [lastInitialKey, setLastInitialKey] = useState(() => stableKey(initialSelections))
  const currentKey = stableKey(initialSelections)
  if (currentKey !== lastInitialKey) {
    setSelections({ ...initialSelections })
    setLastInitialKey(currentKey)
  }

  // Build augmented matchups: fill speculative entrants from predictions
  const augmentedMatchups = useMemo(
    () => buildAugmentedMatchups(matchups, selections),
    [matchups, selections]
  )

  // Selectable matchups: non-bye with both entrants known (real or speculative)
  const selectableMatchups = useMemo(
    () => augmentedMatchups.filter((m) => !m.isBye && m.entrant1Id != null && m.entrant2Id != null),
    [augmentedMatchups]
  )

  const totalSelectableCount = selectableMatchups.length
  const selectedCount = selectableMatchups.filter((m) => selections[m.id] != null).length
  const allSelected = totalSelectableCount > 0 && selectedCount === totalSelectableCount

  const handleSelect = useCallback(
    (matchupId: string, entrantId: string) => {
      if (!enabled) return

      setSelections((prev) => {
        const next = { ...prev }

        // Toggle: clicking the same entrant deselects
        if (next[matchupId] === entrantId) {
          delete next[matchupId]
          // Clear downstream from this matchup
          clearDownstream(matchupId, matchups, next)
          return next
        }

        const previousSelection = next[matchupId]
        next[matchupId] = entrantId

        // If selection changed (not a fresh pick), cascade invalidate downstream
        if (previousSelection != null && previousSelection !== entrantId) {
          clearDownstream(matchupId, matchups, next)
        }

        return next
      })
    },
    [enabled, matchups]
  )

  return {
    augmentedMatchups,
    selectableMatchups,
    selections,
    handleSelect,
    totalSelectableCount,
    selectedCount,
    allSelected,
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build augmented matchups with speculative entrants filled in from predictions.
 * Processes in round order so earlier-round predictions propagate forward.
 */
function buildAugmentedMatchups(
  matchups: MatchupData[],
  selections: Record<string, string>
): MatchupData[] {
  // Deep clone matchups (shallow per-object is sufficient since we replace entrant refs)
  const cloned: MatchupData[] = matchups.map((m) => ({
    ...m,
    entrant1: m.entrant1 ? { ...m.entrant1 } : null,
    entrant2: m.entrant2 ? { ...m.entrant2 } : null,
  }))

  const byId = new Map<string, MatchupData>()
  for (const m of cloned) {
    byId.set(m.id, m)
  }

  // Sort by round ascending so we process earlier rounds first
  const sorted = [...cloned].sort((a, b) => a.round - b.round)

  for (const m of sorted) {
    const selectedEntrantId = selections[m.id]
    if (selectedEntrantId == null || m.nextMatchupId == null) continue

    // Find the selected entrant data from this matchup
    const selectedEntrant = findEntrant(m, selectedEntrantId)
    if (!selectedEntrant) continue

    const nextMatchup = byId.get(m.nextMatchupId)
    if (!nextMatchup) continue

    // Position parity: odd -> entrant1 slot, even -> entrant2 slot
    const speculativeEntrant: BracketEntrantData = {
      id: selectedEntrant.id,
      name: selectedEntrant.name,
      seedPosition: selectedEntrant.seedPosition,
      bracketId: selectedEntrant.bracketId,
      externalTeamId: selectedEntrant.externalTeamId ?? null,
      logoUrl: selectedEntrant.logoUrl ?? null,
      abbreviation: selectedEntrant.abbreviation ?? null,
      tournamentSeed: selectedEntrant.tournamentSeed ?? null,
    }

    if (m.position % 2 === 1) {
      // Only set speculative if the slot is not already filled by actual DB data
      // (i.e., the original matchup had null entrant1Id)
      const original = matchups.find((om) => om.id === nextMatchup.id)
      if (!original?.entrant1Id) {
        nextMatchup.entrant1Id = speculativeEntrant.id
        nextMatchup.entrant1 = speculativeEntrant
      }
    } else {
      const original = matchups.find((om) => om.id === nextMatchup.id)
      if (!original?.entrant2Id) {
        nextMatchup.entrant2Id = speculativeEntrant.id
        nextMatchup.entrant2 = speculativeEntrant
      }
    }
  }

  return cloned
}

/** Find entrant data (entrant1 or entrant2) matching the given id in a matchup */
function findEntrant(matchup: MatchupData, entrantId: string): BracketEntrantData | null {
  if (matchup.entrant1?.id === entrantId) return matchup.entrant1
  if (matchup.entrant2?.id === entrantId) return matchup.entrant2
  return null
}

/**
 * Clear all downstream selections starting from a given matchup.
 * Walks the nextMatchupId chain and removes any selections for matchups
 * whose entrants were populated (speculatively) from the changed matchup.
 */
function clearDownstream(
  startMatchupId: string,
  matchups: MatchupData[],
  selections: Record<string, string>
): void {
  const byId = new Map<string, MatchupData>()
  for (const m of matchups) {
    byId.set(m.id, m)
  }

  const startMatchup = byId.get(startMatchupId)
  if (!startMatchup?.nextMatchupId) return

  // BFS through downstream matchups
  const queue = [startMatchup.nextMatchupId]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    // Remove selection for this downstream matchup
    delete selections[currentId]

    // Continue downstream
    const current = byId.get(currentId)
    if (current?.nextMatchupId) {
      queue.push(current.nextMatchupId)
    }
  }
}

/** Produce a stable string key for a Record to detect changes */
function stableKey(obj: Record<string, string>): string {
  const entries = Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
  return entries.map(([k, v]) => `${k}:${v}`).join('|')
}
