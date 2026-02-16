'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  placeEntrantInSlot,
  type PlacementEntrant,
} from '@/lib/bracket/placement'

export interface PlacementContextValue {
  selectedEntrantId: string | null
  setSelectedEntrantId: (id: string | null) => void
  handleSlotClick: (slotIndex: number) => void
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
      if (selectedEntrantId) {
        const updated = placeEntrantInSlot(
          entrants,
          selectedEntrantId,
          slotIndex,
          bracketSize
        )
        onEntrantsChange(updated)
        setSelectedEntrantId(null)
      }
    },
    [selectedEntrantId, entrants, bracketSize, onEntrantsChange]
  )

  return (
    <PlacementContext.Provider
      value={{
        selectedEntrantId,
        setSelectedEntrantId,
        handleSlotClick,
      }}
    >
      {children}
    </PlacementContext.Provider>
  )
}
