'use client'

import { useCallback } from 'react'
import type { PlacementEntrant } from '@/lib/bracket/placement'
import { usePlacementContext } from './placement-provider'

export interface PlacementSlotProps {
  slotIndex: number
  expectedSeed: number
  placedEntrant: PlacementEntrant | null
  isBye: boolean
  matchupPosition: number
  slotPosition: 1 | 2
}

export function PlacementSlot({
  slotIndex,
  expectedSeed,
  placedEntrant,
  isBye,
  matchupPosition,
  slotPosition,
}: PlacementSlotProps) {
  const {
    selectedEntrantId,
    setSelectedEntrantId,
    handleSlotClick,
  } = usePlacementContext()

  const handleClick = useCallback(() => {
    if (placedEntrant && !selectedEntrantId) {
      // Clicking a placed entrant selects it for moving
      setSelectedEntrantId(placedEntrant.id)
    } else {
      // Delegate to context: places selected entrant or no-ops
      handleSlotClick(slotIndex)
    }
  }, [placedEntrant, selectedEntrantId, setSelectedEntrantId, handleSlotClick, slotIndex])

  const isSelected = placedEntrant != null && selectedEntrantId === placedEntrant.id

  // Show pulse animation on empty/bye slots when an entrant is selected
  const showPlacementGlow = selectedEntrantId != null

  // Render empty slot
  if (!placedEntrant && !isBye) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`flex h-10 w-full items-center gap-2 rounded-md border border-dashed px-3 transition-all ${
          showPlacementGlow
            ? 'border-primary/40 bg-primary/5 animate-pulse'
            : 'border-muted-foreground/30'
        }`}
      >
        <span className="text-sm text-muted-foreground/50">
          Seed {expectedSeed}
        </span>
      </button>
    )
  }

  // Render bye slot (non-interactive — byes cannot be replaced)
  if (isBye) {
    return (
      <div className="flex h-10 w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3">
        <span className="italic text-muted-foreground">BYE</span>
      </div>
    )
  }

  // Render placed entrant slot
  if (!placedEntrant) return null
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex h-10 w-full items-center gap-2 rounded-md border px-3 transition-all ${
        isSelected
          ? 'border-primary bg-primary/10 ring-2 ring-primary'
          : 'border-border bg-background hover:bg-muted'
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted font-mono text-xs font-medium">
        {placedEntrant.seedPosition}
      </span>
      <span className="flex-1 truncate text-left text-sm">
        {placedEntrant.name}
      </span>
    </button>
  )
}
