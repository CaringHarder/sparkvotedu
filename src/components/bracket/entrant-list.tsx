'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  GripVertical,
  X,
  ChevronUp,
  ChevronDown,
  Pencil,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { calculateBracketSizeWithByes } from '@/lib/bracket/byes'
import type { BracketType } from '@/lib/bracket/types'

interface EntrantItem {
  id: string
  name: string
  seedPosition: number
}

interface EntrantListProps {
  entrants: EntrantItem[]
  onReorder: (entrants: EntrantItem[]) => void
  onRemove: (id: string) => void
  onEdit: (id: string, newName: string) => void
  disabled?: boolean
  /** Bracket type for bye calculation (defaults to single_elimination) */
  bracketType?: BracketType
  /** Total entrant count for the bracket (used for bye calculation) */
  totalEntrants?: number
}

export function EntrantList({
  entrants,
  onReorder,
  onRemove,
  onEdit,
  disabled = false,
  bracketType = 'single_elimination',
  totalEntrants,
}: EntrantListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Calculate bye seeds based on total entrant count
  // Round-robin doesn't use byes (inherent in schedule)
  const byeSeeds = useMemo(() => {
    if (bracketType === 'round_robin' || !totalEntrants || totalEntrants < 3) {
      return new Set<number>()
    }
    const { byeSeeds: seeds } = calculateBracketSizeWithByes(totalEntrants)
    return new Set(seeds)
  }, [bracketType, totalEntrants])

  // --- Drag handlers ---
  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      if (disabled) return
      setDragIndex(index)
      e.dataTransfer.effectAllowed = 'move'
      // Required for Firefox
      e.dataTransfer.setData('text/plain', String(index))
    },
    [disabled]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      if (disabled || dragIndex === null || dragIndex === index) return
      setDragOverIndex(index)
    },
    [disabled, dragIndex]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault()
      if (disabled || dragIndex === null || dragIndex === dropIndex) {
        setDragIndex(null)
        setDragOverIndex(null)
        return
      }

      const reordered = [...entrants]
      const [moved] = reordered.splice(dragIndex, 1)
      reordered.splice(dropIndex, 0, moved)
      onReorder(reordered)

      setDragIndex(null)
      setDragOverIndex(null)
    },
    [disabled, dragIndex, entrants, onReorder]
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  // --- Move up/down ---
  const moveUp = useCallback(
    (index: number) => {
      if (index === 0) return
      const reordered = [...entrants]
      ;[reordered[index - 1], reordered[index]] = [
        reordered[index],
        reordered[index - 1],
      ]
      onReorder(reordered)
    },
    [entrants, onReorder]
  )

  const moveDown = useCallback(
    (index: number) => {
      if (index === entrants.length - 1) return
      const reordered = [...entrants]
      ;[reordered[index], reordered[index + 1]] = [
        reordered[index + 1],
        reordered[index],
      ]
      onReorder(reordered)
    },
    [entrants, onReorder]
  )

  // --- Inline editing ---
  const startEditing = useCallback((entrant: EntrantItem) => {
    setEditingId(entrant.id)
    setEditValue(entrant.name)
  }, [])

  const confirmEdit = useCallback(() => {
    if (editingId && editValue.trim()) {
      onEdit(editingId, editValue.trim())
    }
    setEditingId(null)
    setEditValue('')
  }, [editingId, editValue, onEdit])

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        confirmEdit()
      } else if (e.key === 'Escape') {
        setEditingId(null)
        setEditValue('')
      }
    },
    [confirmEdit]
  )

  if (entrants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No entrants added yet. Use the options above to add entrants.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {entrants.map((entrant, index) => {
        const isDragging = dragIndex === index
        const isDragOver = dragOverIndex === index
        const isEditing = editingId === entrant.id
        const hasBye = byeSeeds.has(entrant.seedPosition)

        return (
          <div
            key={entrant.id}
            draggable={!disabled && !isEditing}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
              isDragging
                ? 'opacity-50'
                : isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'bg-background'
            }`}
          >
            {/* Drag handle */}
            {!disabled && (
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
            )}

            {/* Seed badge */}
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted font-mono text-xs font-medium">
              {entrant.seedPosition}
            </span>

            {/* Name (editable) */}
            {isEditing ? (
              <div className="flex flex-1 items-center gap-1">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={confirmEdit}
                  className="h-7 text-sm"
                  maxLength={100}
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={confirmEdit}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <span className="flex-1 truncate text-sm">{entrant.name}</span>
            )}

            {/* Bye badge */}
            {hasBye && !isEditing && (
              <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                BYE
              </span>
            )}

            {/* Actions */}
            {!disabled && !isEditing && (
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => startEditing(entrant)}
                  title="Edit name"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  title="Move up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveDown(index)}
                  disabled={index === entrants.length - 1}
                  title="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onRemove(entrant.id)}
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
