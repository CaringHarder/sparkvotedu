'use client'

import { useMemo, useCallback, useState } from 'react'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { Draggable, Droppable } from '@dnd-kit/dom'
import { isSortable } from '@dnd-kit/dom/sortable'
import { GripVertical } from 'lucide-react'
import { generateRoundRobinRounds } from '@/lib/bracket/round-robin'
import type { PlacementEntrant } from '@/lib/bracket/placement'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlacementMatchupGridProps {
  entrants: PlacementEntrant[]
  entrantCount: number
  onEntrantsChange: (entrants: PlacementEntrant[]) => void
}

// ---------------------------------------------------------------------------
// Sortable pool item
// ---------------------------------------------------------------------------

function SortablePoolItem({
  entrant,
  index,
}: {
  entrant: PlacementEntrant
  index: number
}) {
  const { ref, isDragSource } = useSortable({
    id: `pool-${entrant.id}`,
    index,
    group: 'rr-pool',
    data: { entrantId: entrant.id },
  })

  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
        isDragSource
          ? 'border-primary/50 bg-primary/5 opacity-50'
          : 'bg-background hover:bg-muted/50'
      }`}
    >
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted font-mono text-xs font-medium">
        {entrant.seedPosition}
      </span>
      <span className="flex-1 truncate text-sm">{entrant.name}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Matchup card (read-only)
// ---------------------------------------------------------------------------

function MatchupCard({
  entrant1Name,
  entrant2Name,
  isBye,
}: {
  entrant1Name: string
  entrant2Name: string
  isBye: boolean
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-3">
      <span className="min-w-0 flex-1 truncate rounded border px-2 py-1 text-center text-sm">
        {entrant1Name}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">vs</span>
      <span
        className={`min-w-0 flex-1 truncate rounded border px-2 py-1 text-center text-sm ${
          isBye ? 'italic text-muted-foreground' : ''
        }`}
      >
        {entrant2Name}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Entrant pool (reorderable list)
// ---------------------------------------------------------------------------

function EntrantPool({
  entrants,
}: {
  entrants: PlacementEntrant[]
}) {
  return (
    <div className="space-y-1">
      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
        Entrant Pool
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Drag to reorder seeds. The matchup grid updates in real-time.
      </p>
      {entrants.map((entrant, index) => (
        <SortablePoolItem
          key={entrant.id}
          entrant={entrant}
          index={index}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Matchup grid (read-only visualization)
// ---------------------------------------------------------------------------

function MatchupGrid({
  entrants,
  entrantCount,
}: {
  entrants: PlacementEntrant[]
  entrantCount: number
}) {
  const rounds = useMemo(
    () => generateRoundRobinRounds(entrantCount),
    [entrantCount]
  )

  // Look up an entrant name by seed position. Returns "(Unassigned)" if
  // the seed slot has not yet been filled.
  const nameForSeed = useCallback(
    (seed: number): string => {
      const found = entrants.find((e) => e.seedPosition === seed)
      return found?.name ?? '(Unassigned)'
    },
    [entrants]
  )

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Matchup Schedule
      </h3>
      {rounds.map((round) => (
        <div key={round.roundNumber}>
          <h4 className="mb-2 text-xs font-medium text-muted-foreground">
            Round {round.roundNumber}
          </h4>
          <div className="flex flex-wrap gap-3">
            {round.matchups.map((matchup, mIdx) => {
              const name1 = nameForSeed(matchup.entrant1Seed)
              const name2 = nameForSeed(matchup.entrant2Seed)
              return (
                <MatchupCard
                  key={`r${round.roundNumber}-m${mIdx}`}
                  entrant1Name={name1}
                  entrant2Name={name2}
                  isBye={false}
                />
              )
            })}
          </div>

          {/* Show BYE for odd entrant counts */}
          {entrantCount % 2 === 1 && (
            <ByeIndicator
              round={round}
              entrants={entrants}
              entrantCount={entrantCount}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BYE indicator for odd entrant counts
// ---------------------------------------------------------------------------

function ByeIndicator({
  round,
  entrants,
  entrantCount,
}: {
  round: ReturnType<typeof generateRoundRobinRounds>[number]
  entrants: PlacementEntrant[]
  entrantCount: number
}) {
  // The sitting-out entrant is the one whose seed does not appear in any
  // matchup of this round.
  const allSeeds = new Set(
    Array.from({ length: entrantCount }, (_, i) => i + 1)
  )
  for (const m of round.matchups) {
    allSeeds.delete(m.entrant1Seed)
    allSeeds.delete(m.entrant2Seed)
  }

  if (allSeeds.size === 0) return null

  const byeSeed = allSeeds.values().next().value as number
  const byeEntrant = entrants.find((e) => e.seedPosition === byeSeed)
  const byeName = byeEntrant?.name ?? '(Unassigned)'

  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
      <span className="italic">BYE:</span>
      <span>{byeName} sits out this round</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlacementMatchupGrid({
  entrants,
  entrantCount,
  onEntrantsChange,
}: PlacementMatchupGridProps) {
  // Sort entrants by seedPosition for display in the pool
  const sortedEntrants = useMemo(
    () => [...entrants].sort((a, b) => a.seedPosition - b.seedPosition),
    [entrants]
  )

  // Track whether a drag is in progress for visual feedback
  const [isDragging, setIsDragging] = useState(false)

  // Handle reorder on drag end
  const handleDragEnd = useCallback(
    (event: {
      operation: {
        source: Draggable | null | undefined
        target: Droppable | null | undefined
      }
      canceled: boolean
    }) => {
      setIsDragging(false)

      if (event.canceled) return

      const { source, target } = event.operation
      if (!source || !target) return
      if (!isSortable(source) || !isSortable(target)) return

      const fromIndex = source.sortable.initialIndex
      const toIndex = target.sortable.index

      if (fromIndex === toIndex) return

      // Reorder the sorted array, then reassign seedPositions 1..N
      const reordered = [...sortedEntrants]
      const [moved] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, moved)

      // Reassign seed positions based on new order
      const updated = reordered.map((e, i) => ({
        ...e,
        seedPosition: i + 1,
      }))

      onEntrantsChange(updated)
    },
    [sortedEntrants, onEntrantsChange]
  )

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  if (entrantCount < 3) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Round-robin requires at least 3 entrants to generate a matchup
          schedule.
        </p>
      </div>
    )
  }

  return (
    <DragDropProvider onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left sidebar: Entrant pool (reorderable) */}
        <div className="w-full shrink-0 lg:w-64">
          <EntrantPool entrants={sortedEntrants} />
        </div>

        {/* Right main area: Matchup grid (read-only) */}
        <div
          className={`min-w-0 flex-1 rounded-lg border p-4 transition-colors ${
            isDragging ? 'border-primary/30 bg-primary/5' : ''
          }`}
        >
          <MatchupGrid entrants={sortedEntrants} entrantCount={entrantCount} />
        </div>
      </div>
    </DragDropProvider>
  )
}
