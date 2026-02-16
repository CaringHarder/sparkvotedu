'use client'

import { List, LayoutGrid } from 'lucide-react'

export interface PlacementModeToggleProps {
  mode: 'list' | 'visual'
  onModeChange: (mode: 'list' | 'visual') => void
}

export function PlacementModeToggle({
  mode,
  onModeChange,
}: PlacementModeToggleProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      <button
        type="button"
        onClick={() => onModeChange('list')}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          mode === 'list'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <List className="h-4 w-4" />
        List Reorder
      </button>
      <button
        type="button"
        onClick={() => onModeChange('visual')}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          mode === 'visual'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        Visual Placement
      </button>
    </div>
  )
}
