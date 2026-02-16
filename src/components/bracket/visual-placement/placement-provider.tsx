'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { DragDropProvider } from '@dnd-kit/react'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/dom'
import {
  placeEntrantInSlot,
  swapSlots,
  autoSeed,
  seedToSlot,
  type PlacementEntrant,
} from '@/lib/bracket/placement'

/** Data attached to draggable/droppable items */
export interface PlacementDragData {
  type: 'entrant' | 'slot' | 'pool'
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

  // Escape key deselects the currently selected entrant
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedEntrantId) {
        setSelectedEntrantId(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedEntrantId])

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

      // Case 3: slot -> pool (drag back to pool = reset to auto-seed position)
      if (sourceData.type === 'slot' && targetData.type === 'pool' && sourceData.entrantId != null) {
        const entrant = entrants.find((e) => e.id === sourceData.entrantId)
        if (!entrant) return

        // Reset entrant to their auto-seed position (array index + 1)
        const idx = entrants.indexOf(entrant)
        const autoSeedPosition = idx + 1

        // If the auto-seed position is taken by someone else, swap
        const occupant = entrants.find(
          (e) => e.id !== sourceData.entrantId && e.seedPosition === autoSeedPosition
        )

        if (occupant) {
          const updated = entrants.map((e) => {
            if (e.id === sourceData.entrantId) return { ...e, seedPosition: autoSeedPosition }
            if (e.id === occupant.id) return { ...e, seedPosition: entrant.seedPosition }
            return e
          })
          onEntrantsChange(updated)
        } else {
          const updated = entrants.map((e) =>
            e.id === sourceData.entrantId ? { ...e, seedPosition: autoSeedPosition } : e
          )
          onEntrantsChange(updated)
        }
        return
      }
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
