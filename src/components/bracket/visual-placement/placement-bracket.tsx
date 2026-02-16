'use client'

import { useCallback, useMemo } from 'react'
import {
  buildSlotMap,
  seedToSlot,
  slotToSeed,
  getByeSlots,
  autoSeed,
  type PlacementEntrant,
} from '@/lib/bracket/placement'
import { calculateBracketSizeWithByes } from '@/lib/bracket/byes'
import { PlacementProvider } from './placement-provider'
import { EntrantPool } from './entrant-pool'
import { PlacementSlot } from './placement-slot'

export interface PlacementBracketProps {
  entrants: PlacementEntrant[]
  bracketSize: number
  entrantCount: number
  onEntrantsChange: (entrants: PlacementEntrant[]) => void
}

/** Build a map from slot index to placed entrant (or null) */
function buildPlacedMap(
  entrants: PlacementEntrant[],
  bracketSize: number
): Map<number, PlacementEntrant> {
  const map = new Map<number, PlacementEntrant>()
  for (const entrant of entrants) {
    const slot = seedToSlot(entrant.seedPosition, bracketSize)
    if (slot >= 0) {
      map.set(slot, entrant)
    }
  }
  return map
}

export function PlacementBracket({
  entrants,
  bracketSize: rawBracketSize,
  entrantCount,
  onEntrantsChange,
}: PlacementBracketProps) {
  // Ensure bracket size is power of 2
  const bracketSize = useMemo(() => {
    const isPow2 = rawBracketSize > 0 && (rawBracketSize & (rawBracketSize - 1)) === 0
    if (isPow2) return rawBracketSize
    return calculateBracketSizeWithByes(entrantCount).bracketSize
  }, [rawBracketSize, entrantCount])

  // Build slot map and bye slots
  const slotMap = useMemo(() => buildSlotMap(bracketSize), [bracketSize])
  const byeSlotSet = useMemo(() => {
    const slots = getByeSlots(entrantCount, bracketSize)
    return new Set(slots)
  }, [entrantCount, bracketSize])

  // Build placed entrant map
  const placedMap = useMemo(
    () => buildPlacedMap(entrants, bracketSize),
    [entrants, bracketSize]
  )

  // Build R1 matchups: bracketSize / 2 matchups, each with 2 slots
  const matchups = useMemo(() => {
    const numMatchups = bracketSize / 2
    const result: Array<{
      position: number
      topSlot: number
      bottomSlot: number
      topSeed: number
      bottomSeed: number
    }> = []

    for (let m = 0; m < numMatchups; m++) {
      const topSlotIndex = m * 2
      const bottomSlotIndex = m * 2 + 1
      result.push({
        position: m + 1,
        topSlot: topSlotIndex,
        bottomSlot: bottomSlotIndex,
        topSeed: slotMap[topSlotIndex],
        bottomSeed: slotMap[bottomSlotIndex],
      })
    }
    return result
  }, [bracketSize, slotMap])

  // Handler to reset an entrant's placement (auto-seed position)
  const handleResetEntrant = useCallback(
    (entrantId: string) => {
      const entrant = entrants.find((e) => e.id === entrantId)
      if (!entrant) return

      // Find the entrant's index in the original array and assign seedPosition = index + 1
      const idx = entrants.indexOf(entrant)
      const autoSeedPosition = idx + 1

      // If the auto-seed position is taken by someone else, swap
      const occupant = entrants.find(
        (e) => e.id !== entrantId && e.seedPosition === autoSeedPosition
      )

      if (occupant) {
        // Swap seed positions
        const updated = entrants.map((e) => {
          if (e.id === entrantId) return { ...e, seedPosition: autoSeedPosition }
          if (e.id === occupant.id) return { ...e, seedPosition: entrant.seedPosition }
          return e
        })
        onEntrantsChange(updated)
      } else {
        const updated = entrants.map((e) =>
          e.id === entrantId ? { ...e, seedPosition: autoSeedPosition } : e
        )
        onEntrantsChange(updated)
      }
    },
    [entrants, onEntrantsChange]
  )

  // Responsive grid columns based on matchup count
  const gridCols = useMemo(() => {
    if (matchups.length <= 2) return 'grid-cols-1 md:grid-cols-2'
    if (matchups.length <= 4) return 'grid-cols-1 md:grid-cols-2'
    if (matchups.length <= 8) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    if (matchups.length <= 16) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }, [matchups.length])

  return (
    <PlacementProvider
      entrants={entrants}
      bracketSize={bracketSize}
      onEntrantsChange={onEntrantsChange}
    >
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-4 rounded-lg border bg-card p-4">
            <EntrantPool
              entrants={entrants}
              bracketSize={bracketSize}
              entrantCount={entrantCount}
              onEntrantsChange={onEntrantsChange}
              layout="sidebar"
            />
          </div>
        </aside>

        {/* Mobile chip bar */}
        <div className="md:hidden">
          <div className="rounded-lg border bg-card p-3">
            <EntrantPool
              entrants={entrants}
              bracketSize={bracketSize}
              entrantCount={entrantCount}
              onEntrantsChange={onEntrantsChange}
              layout="inline"
            />
          </div>
        </div>

        {/* Matchup grid */}
        <main className="flex-1">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Round 1 - {matchups.length} Matchups
            </h3>
          </div>
          <div className={`grid gap-3 ${gridCols}`}>
            {matchups.map((matchup) => {
              const topEntrant = placedMap.get(matchup.topSlot) ?? null
              const bottomEntrant = placedMap.get(matchup.bottomSlot) ?? null
              const topIsBye = byeSlotSet.has(matchup.topSlot)
              const bottomIsBye = byeSlotSet.has(matchup.bottomSlot)

              return (
                <div
                  key={matchup.position}
                  className="rounded-lg border bg-card p-3"
                >
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Match {matchup.position}
                  </div>

                  {/* Top slot */}
                  <PlacementSlot
                    slotIndex={matchup.topSlot}
                    expectedSeed={matchup.topSeed}
                    placedEntrant={topIsBye ? null : topEntrant}
                    isBye={topIsBye}
                    matchupPosition={matchup.position}
                    slotPosition={1}
                    onResetEntrant={handleResetEntrant}
                  />

                  {/* VS divider */}
                  <div className="my-1 text-center text-[10px] font-medium text-muted-foreground/50">
                    vs
                  </div>

                  {/* Bottom slot */}
                  <PlacementSlot
                    slotIndex={matchup.bottomSlot}
                    expectedSeed={matchup.bottomSeed}
                    placedEntrant={bottomIsBye ? null : bottomEntrant}
                    isBye={bottomIsBye}
                    matchupPosition={matchup.position}
                    slotPosition={2}
                    onResetEntrant={handleResetEntrant}
                  />
                </div>
              )
            })}
          </div>
        </main>
      </div>
    </PlacementProvider>
  )
}
