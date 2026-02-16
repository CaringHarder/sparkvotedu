'use client'

import { useCallback, useMemo, useState } from 'react'
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

/** Section definition for large bracket navigation */
interface PlacementSection {
  label: string
  /** Matchup indices into the matchups array (0-based) */
  startMatchup: number
  endMatchup: number
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

  // Compute sections for large bracket navigation
  const sections = useMemo<PlacementSection[]>(() => {
    const r1Matchups = bracketSize / 2
    const matchupsPerSection = 8 // Always 8 matchups per section for readability
    const numSections = Math.ceil(r1Matchups / matchupsPerSection)

    if (numSections <= 1) {
      // Small bracket: single section, no tabs
      return [{ label: 'All', startMatchup: 0, endMatchup: r1Matchups }]
    }

    // Label sections
    const labels =
      numSections === 2
        ? ['Top Half', 'Bottom Half']
        : Array.from({ length: numSections }, (_, i) => `Region ${i + 1}`)

    return labels.map((label, i) => ({
      label,
      startMatchup: i * matchupsPerSection,
      endMatchup: Math.min((i + 1) * matchupsPerSection, r1Matchups),
    }))
  }, [bracketSize])

  const [activeSection, setActiveSection] = useState(0)

  // Get matchups for the active section
  const activeSectionDef = sections[activeSection] ?? sections[0]
  const sectionMatchups = useMemo(
    () => matchups.slice(activeSectionDef.startMatchup, activeSectionDef.endMatchup),
    [matchups, activeSectionDef]
  )

  // Compute placed counts per section for badges
  const sectionPlacedCounts = useMemo(() => {
    return sections.map((section) => {
      const sectionMs = matchups.slice(section.startMatchup, section.endMatchup)
      let placed = 0
      let total = 0
      for (const m of sectionMs) {
        // Top slot
        if (!byeSlotSet.has(m.topSlot)) {
          total++
          if (placedMap.has(m.topSlot)) placed++
        }
        // Bottom slot
        if (!byeSlotSet.has(m.bottomSlot)) {
          total++
          if (placedMap.has(m.bottomSlot)) placed++
        }
      }
      return { placed, total }
    })
  }, [sections, matchups, byeSlotSet, placedMap])

  const showSectionNav = sections.length > 1

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

  // Responsive grid columns based on section matchup count (always 8 or fewer per section)
  const gridCols = useMemo(() => {
    const count = sectionMatchups.length
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2'
    if (count <= 4) return 'grid-cols-1 md:grid-cols-2'
    if (count <= 8) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    if (count <= 16) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }, [sectionMatchups.length])

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

          {/* Section navigation tabs for 32+ brackets */}
          {showSectionNav && (
            <div className="mb-4 flex flex-wrap gap-2">
              {sections.map((section, i) => {
                const counts = sectionPlacedCounts[i]
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveSection(i)}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeSection === i
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {section.label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        activeSection === i
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-background text-muted-foreground'
                      }`}
                    >
                      {counts.placed}/{counts.total}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <div className={`grid gap-3 ${gridCols}`}>
            {sectionMatchups.map((matchup) => {
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
