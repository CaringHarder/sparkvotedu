'use client'

import { useState, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { GripVertical, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OptionImageUpload } from '@/components/poll/option-image-upload'
import { PollCSVUpload } from '@/components/poll/poll-csv-upload'

export interface OptionItem {
  id: string
  text: string
  imageUrl?: string
}

interface OptionListProps {
  options: OptionItem[]
  onChange: (options: OptionItem[]) => void
  maxOptions?: number
  minOptions?: number
  disabled?: boolean
  /** Poll ID for image upload URL scoping (null/undefined during creation uses 'draft' fallback) */
  pollId?: string
}

export function OptionList({
  options,
  onChange,
  maxOptions = 32,
  minOptions = 2,
  disabled = false,
  pollId,
}: OptionListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // --- Option CRUD ---
  const addOption = useCallback(() => {
    if (options.length >= maxOptions) return
    onChange([...options, { id: nanoid(), text: '' }])
  }, [options, maxOptions, onChange])

  const updateOptionText = useCallback(
    (id: string, text: string) => {
      onChange(options.map((o) => (o.id === id ? { ...o, text } : o)))
    },
    [options, onChange]
  )

  const removeOption = useCallback(
    (id: string) => {
      if (options.length <= minOptions) return
      onChange(options.filter((o) => o.id !== id))
    },
    [options, minOptions, onChange]
  )

  const updateOptionImage = useCallback(
    (id: string, imageUrl: string) => {
      onChange(options.map((o) => (o.id === id ? { ...o, imageUrl } : o)))
    },
    [options, onChange]
  )

  const removeOptionImage = useCallback(
    (id: string) => {
      onChange(options.map((o) => (o.id === id ? { ...o, imageUrl: undefined } : o)))
    },
    [options, onChange]
  )

  const handleCSVImport = useCallback(
    (parsed: Array<{ text: string; imageUrl?: string }>) => {
      const newOptions: OptionItem[] = parsed.map((p) => ({
        id: nanoid(),
        text: p.text,
        imageUrl: p.imageUrl,
      }))
      onChange(newOptions)
    },
    [onChange]
  )

  // --- Drag-and-drop (HTML5 native, same as entrant-list) ---
  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      if (disabled) return
      setDragIndex(index)
      e.dataTransfer.effectAllowed = 'move'
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

      const reordered = [...options]
      const [moved] = reordered.splice(dragIndex, 1)
      reordered.splice(dropIndex, 0, moved)
      onChange(reordered)

      setDragIndex(null)
      setDragOverIndex(null)
    },
    [disabled, dragIndex, options, onChange]
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  if (options.length === 0) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No options added yet. Add at least {minOptions} options.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addOption} disabled={disabled}>
          <Plus className="mr-1 h-4 w-4" />
          Add Option
        </Button>
        {!disabled && (
          <PollCSVUpload
            onImportComplete={handleCSVImport}
            maxOptions={maxOptions}
            pollId={pollId}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {options.map((option, index) => {
        const isDragging = dragIndex === index
        const isDragOver = dragOverIndex === index

        return (
          <div
            key={option.id}
            draggable={!disabled}
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

            {/* Position badge */}
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted font-mono text-xs font-medium">
              {index + 1}
            </span>

            {/* Camera icon / image upload (always visible when not disabled) */}
            {!disabled && (
              <OptionImageUpload
                pollId={pollId}
                existingImageUrl={option.imageUrl ?? null}
                onImageUrl={(url) => updateOptionImage(option.id, url)}
                onRemove={() => removeOptionImage(option.id)}
              />
            )}

            {/* Option text input */}
            <Input
              value={option.text}
              onChange={(e) => updateOptionText(option.id, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="h-8 text-sm"
              maxLength={200}
              disabled={disabled}
            />

            {/* Remove button */}
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                onClick={() => removeOption(option.id)}
                disabled={options.length <= minOptions}
                title="Remove option"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )
      })}

      {/* Add option button */}
      {!disabled && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
            disabled={options.length >= maxOptions}
            className="w-full"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Option
            {maxOptions < 32 && (
              <span className="ml-1 text-muted-foreground">
                ({options.length}/{maxOptions})
              </span>
            )}
          </Button>
          <PollCSVUpload
            onImportComplete={handleCSVImport}
            maxOptions={maxOptions}
            pollId={pollId}
          />
        </>
      )}
    </div>
  )
}
