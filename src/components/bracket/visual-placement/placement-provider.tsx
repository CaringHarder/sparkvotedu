'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react'
import { DragDropProvider } from '@dnd-kit/react'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/dom'
import {
  placeEntrantInSlot,
  swapSlots,
  type PlacementEntrant,
} from '@/lib/bracket/placement'

/** Data attached to draggable/droppable items */
export interface PlacementDragData {
  type: 'entrant' | 'slot'
  entrantId?: string
  slotIndex?: number
  isBye?: boolean
}

export interface PlacementContextValue {
  selectedEntrantId: string | null
  setSelectedEntrantId: (id: string | null) => void
  handleSlotClick: (slotIndex: number) => void
  isDragging: boolean
}

const PlacementContext = createContext<PlacementContextValue | null>(null)

export function usePlacementContext(): PlacementContextValue {
  const ctx = useContext(PlacementContext)
  if (!ctx) {
    throw new Error('usePlacementContext must be used within PlacementProvider')
  }
  return ctx
}

export interface PlacementProviderProps {
  entrants: PlacementEntrant[]
  bracketSize: number
  onEntrantsChange: (entrants: PlacementEntrant[]) => void
  children: React.ReactNode
}

export function PlacementProvider({
  entrants,
  bracketSize,
  onEntrantsChange,
  children,
}: PlacementProviderProps) {
  const [selectedEntrantId, setSelectedEntrantId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleSlotClick = useCallback(
    (slotIndex: number) => {
      if (isDragging) return

      if (selectedEntrantId) {
        // Place the selected entrant in the clicked slot
        const updated = placeEntrantInSlot(
          entrants,
          selectedEntrantId,
          slotIndex,
          bracketSize
        )
        onEntrantsChange(updated)
        setSelectedEntrantId(null)
      } else {
        // No entrant selected -- check if the slot has an entrant and select it
        // This is handled by the slot component via setSelectedEntrantId
      }
    },
    [isDragging, selectedEntrantId, entrants, bracketSize, onEntrantsChange]
  )

  const handleDragStart = useCallback(
    (_event: Parameters<NonNullable<typeof DragDropProvider extends React.FC<infer P> ? P extends { onDragStart?: infer F } ? F : never : never>>[0]) => {
      setIsDragging(true)
      setSelectedEntrantId(null)
    },
    []
  )

  const handleDragEnd = useCallback(
    (event: Parameters<NonNullable<typeof DragDropProvider extends React.FC<infer P> ? P extends { onDragEnd?: infer F } ? F : never : never>>[0]) => {
      setIsDragging(false)

      const { operation } = event
      const source = operation.source
      const target = operation.target

      if (!source || !target) return

      const sourceData = source.data as PlacementDragData | undefined
      const targetData = target.data as PlacementDragData | undefined

      if (!sourceData || !targetData) return

      // Case 1: entrant from pool -> bracket slot
      if (sourceData.type === 'entrant' && targetData.type === 'slot' && sourceData.entrantId != null && targetData.slotIndex != null) {
        const updated = placeEntrantInSlot(
          entrants,
          sourceData.entrantId,
          targetData.slotIndex,
          bracketSize
        )
        onEntrantsChange(updated)
        return
      }

      // Case 2: slot -> slot (bracket swap)
      if (sourceData.type === 'slot' && targetData.type === 'slot' && sourceData.slotIndex != null && targetData.slotIndex != null) {
        const updated = swapSlots(
          entrants,
          sourceData.slotIndex,
          targetData.slotIndex,
          bracketSize
        )
        onEntrantsChange(updated)
        return
      }

      // Case 3: drop on pool -- no-op
    },
    [entrants, bracketSize, onEntrantsChange]
  )

  return (
    <PlacementContext.Provider
      value={{
        selectedEntrantId,
        setSelectedEntrantId,
        handleSlotClick,
        isDragging,
      }}
    >
      <DragDropProvider
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {children}
      </DragDropProvider>
    </PlacementContext.Provider>
  )
}
