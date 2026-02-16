'use client'

import { useCallback, useRef } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/react'
import { X } from 'lucide-react'
import type { PlacementEntrant } from '@/lib/bracket/placement'
import { usePlacementContext, type PlacementDragData } from './placement-provider'

export interface PlacementSlotProps {
  slotIndex: number
  expectedSeed: number
  placedEntrant: PlacementEntrant | null
  isBye: boolean
  matchupPosition: number
  slotPosition: 1 | 2
  onResetEntrant?: (entrantId: string) => void
}

export function PlacementSlot({
  slotIndex,
  expectedSeed,
  placedEntrant,
  isBye,
  matchupPosition,
  slotPosition,
  onResetEntrant,
}: PlacementSlotProps) {
  const {
    selectedEntrantId,
    setSelectedEntrantId,
    handleSlotClick,
    isDragging,
  } = usePlacementContext()

  // Every slot is a drop target
  const { ref: droppableRef, isDropTarget } = useDroppable({
    id: `slot-${slotIndex}`,
    data: {
      type: 'slot',
      slotIndex,
    } satisfies PlacementDragData,
  })

  // Occupied slots (placed entrant or bye) are also draggable for slot-to-slot swaps
  const isOccupied = placedEntrant != null || isBye
  const { ref: draggableRef, isDragSource } = useDraggable({
    id: `slot-drag-${slotIndex}`,
    disabled: !isOccupied,
    data: {
      type: 'slot',
      slotIndex,
      entrantId: placedEntrant?.id,
      isBye,
    } satisfies PlacementDragData,
  })

  // Combine refs -- we need both on the same element
  const elementRef = useCallback(
    (element: Element | null) => {
      droppableRef(element)
      draggableRef(element)
    },
    [droppableRef, draggableRef]
  )

  const handleClick = useCallback(() => {
    if (isDragging) return

    if (placedEntrant && !selectedEntrantId) {
      // Clicking a placed entrant selects it for moving
      setSelectedEntrantId(placedEntrant.id)
    } else {
      // Delegate to context: places selected entrant or no-ops
      handleSlotClick(slotIndex)
    }
  }, [isDragging, placedEntrant, selectedEntrantId, setSelectedEntrantId, handleSlotClick, slotIndex])

  const handleReset = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (placedEntrant && onResetEntrant) {
        onResetEntrant(placedEntrant.id)
      }
    },
    [placedEntrant, onResetEntrant]
  )

  const isSelected = placedEntrant != null && selectedEntrantId === placedEntrant.id

  // Render empty slot
  if (!placedEntrant && !isBye) {
    return (
      <button
        ref={elementRef}
        type="button"
        onClick={handleClick}
        className={`flex h-10 w-full items-center gap-2 rounded-md border border-dashed px-3 transition-all ${
          isDropTarget
            ? 'border-primary bg-primary/5 ring-2 ring-primary/50 shadow-[0_0_8px_rgba(var(--primary),0.3)]'
            : isDragging
              ? 'border-primary/30 bg-primary/5'
              : 'border-muted-foreground/30'
        }`}
      >
        <span className="text-sm text-muted-foreground/50">
          Seed {expectedSeed}
        </span>
      </button>
    )
  }

  // Render bye slot
  if (isBye) {
    return (
      <div
        ref={elementRef}
        className={`flex h-10 w-full items-center gap-2 rounded-md border px-3 transition-all ${
          isDragSource
            ? 'opacity-50'
            : isDropTarget
              ? 'ring-2 ring-primary/50 shadow-[0_0_8px_rgba(var(--primary),0.3)]'
              : 'border-border bg-muted/50'
        }`}
      >
        <span className="italic text-muted-foreground">BYE</span>
      </div>
    )
  }

  // Render placed entrant slot
  // TypeScript narrowing: at this point placedEntrant is guaranteed non-null
  // (both empty and bye cases returned above)
  if (!placedEntrant) return null
  return (
    <button
      ref={elementRef}
      type="button"
      onClick={handleClick}
      className={`group flex h-10 w-full items-center gap-2 rounded-md border px-3 transition-all ${
        isDragSource
          ? 'opacity-50'
          : isDropTarget
            ? 'ring-2 ring-primary/50 shadow-[0_0_8px_rgba(var(--primary),0.3)]'
            : isSelected
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
      {onResetEntrant && (
        <span
          role="button"
          tabIndex={0}
          onClick={handleReset}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleReset(e as unknown as React.MouseEvent)
            }
          }}
          className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:inline-flex"
        >
          <X className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  )
}
