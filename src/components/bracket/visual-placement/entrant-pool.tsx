'use client'

import { useCallback, useMemo } from 'react'
import { useDraggable } from '@dnd-kit/react'
import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  autoSeed,
  seedToSlot,
  slotToSeed,
  type PlacementEntrant,
} from '@/lib/bracket/placement'
import { usePlacementContext, type PlacementDragData } from './placement-provider'

interface EntrantPoolProps {
  entrants: PlacementEntrant[]
  bracketSize: number
  entrantCount: number
  onEntrantsChange: (entrants: PlacementEntrant[]) => void
  /** Layout mode: sidebar for desktop, inline for mobile chip bar */
  layout?: 'sidebar' | 'inline'
}

/** A single draggable entrant chip in the pool */
function PoolEntrant({
  entrant,
  layout,
}: {
  entrant: PlacementEntrant
  layout: 'sidebar' | 'inline'
}) {
  const { selectedEntrantId, setSelectedEntrantId } = usePlacementContext()
  const isSelected = selectedEntrantId === entrant.id

  const { ref, isDragSource } = useDraggable({
    id: `pool-${entrant.id}`,
    data: {
      type: 'entrant',
      entrantId: entrant.id,
    } satisfies PlacementDragData,
  })

  const handleClick = useCallback(() => {
    setSelectedEntrantId(isSelected ? null : entrant.id)
  }, [isSelected, entrant.id, setSelectedEntrantId])

  if (layout === 'inline') {
    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
          isDragSource
            ? 'opacity-50'
            : isSelected
              ? 'border-primary bg-primary/10 ring-2 ring-primary'
              : 'border-border bg-background hover:bg-muted'
        }`}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-semibold">
          {entrant.seedPosition}
        </span>
        <span className="truncate">{entrant.name}</span>
      </button>
    )
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-all ${
        isDragSource
          ? 'opacity-50'
          : isSelected
            ? 'border-primary bg-primary/10 ring-2 ring-primary'
            : 'border-border bg-background hover:bg-muted'
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted font-mono text-xs font-medium">
        {entrant.seedPosition}
      </span>
      <span className="flex-1 truncate">{entrant.name}</span>
    </button>
  )
}

export function EntrantPool({
  entrants,
  bracketSize,
  entrantCount,
  onEntrantsChange,
  layout = 'sidebar',
}: EntrantPoolProps) {
  // Compute which entrants are unplaced (not manually placed in a slot)
  // An entrant is "in the pool" if their seedPosition has not been manually changed
  // from the auto-seed default. But since we can't distinguish manual from auto,
  // we show ALL real entrants (seedPosition <= entrantCount) in the pool as draggable
  // items that are available for placement. The bracket grid shows where each is placed.
  const poolEntrants = useMemo(() => {
    return entrants
      .filter((e) => e.seedPosition <= entrantCount)
      .sort((a, b) => a.seedPosition - b.seedPosition)
  }, [entrants, entrantCount])

  const handleAutoSeed = useCallback(() => {
    const updated = autoSeed(entrants)
    onEntrantsChange(updated)
  }, [entrants, onEntrantsChange])

  if (layout === 'inline') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            Entrants ({poolEntrants.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoSeed}
            className="h-7 gap-1 text-xs"
          >
            <Sparkles className="h-3 w-3" />
            Auto Seed
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {poolEntrants.map((entrant) => (
            <PoolEntrant
              key={entrant.id}
              entrant={entrant}
              layout="inline"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Entrants ({poolEntrants.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAutoSeed}
          className="h-7 gap-1 text-xs"
        >
          <Sparkles className="h-3 w-3" />
          Auto Seed
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Drag an entrant to a bracket slot, or click to select then click a slot.
      </p>
      <div className="space-y-1">
        {poolEntrants.map((entrant) => (
          <PoolEntrant
            key={entrant.id}
            entrant={entrant}
            layout="sidebar"
          />
        ))}
      </div>
    </div>
  )
}
