'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { nanoid } from 'nanoid'
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react'
import { EntrantImageUpload } from '@/components/bracket/entrant-image-upload'
import { updateBracketEntrants } from '@/actions/bracket'
import { PlacementModeToggle } from '@/components/bracket/visual-placement/placement-mode-toggle'
import { PlacementBracket } from '@/components/bracket/visual-placement/placement-bracket'
import { PlacementMatchupGrid } from '@/components/bracket/visual-placement/placement-matchup-grid'
import { calculateBracketSizeWithByes } from '@/lib/bracket/byes'

interface Entrant {
  id: string
  name: string
  seedPosition: number
  logoUrl?: string | null
}

interface BracketEditFormProps {
  bracket: {
    id: string
    name: string
    size: number
    bracketType: string
    entrants: {
      id: string
      name: string
      seedPosition: number
      bracketId: string
      logoUrl?: string | null
    }[]
  }
}

export function BracketEditForm({ bracket }: BracketEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [newEntrantName, setNewEntrantName] = useState('')
  const [placementMode, setPlacementMode] = useState<'list' | 'visual'>('list')

  // Initialize entrants from bracket data with IDs
  const [entrants, setEntrants] = useState<Entrant[]>(
    bracket.entrants.map((e) => ({
      id: e.id,
      name: e.name,
      seedPosition: e.seedPosition,
      logoUrl: e.logoUrl ?? null,
    }))
  )

  // Compute bye info for non-RR brackets
  const byeInfo = useMemo(() => {
    if (bracket.bracketType === 'round_robin') return null
    const info = calculateBracketSizeWithByes(bracket.size)
    return info.numByes > 0 ? info : null
  }, [bracket.bracketType, bracket.size])

  function handleEntrantNameChange(index: number, name: string) {
    setEntrants((prev) =>
      prev.map((e, i) => (i === index ? { ...e, name } : e))
    )
  }

  function handleRemoveEntrant(index: number) {
    setEntrants((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      // Re-number seed positions
      return updated.map((e, i) => ({ ...e, seedPosition: i + 1 }))
    })
  }

  function handleAddEntrant() {
    if (!newEntrantName.trim()) return
    if (entrants.length >= bracket.size) return

    setEntrants((prev) => [
      ...prev,
      { id: nanoid(), name: newEntrantName.trim(), seedPosition: prev.length + 1 },
    ])
    setNewEntrantName('')
  }

  function handleMoveUp(index: number) {
    if (index === 0) return
    setEntrants((prev) => {
      const updated = [...prev]
      const temp = updated[index]
      updated[index] = updated[index - 1]
      updated[index - 1] = temp
      // Re-number seed positions
      return updated.map((e, i) => ({ ...e, seedPosition: i + 1 }))
    })
  }

  function handleMoveDown(index: number) {
    if (index === entrants.length - 1) return
    setEntrants((prev) => {
      const updated = [...prev]
      const temp = updated[index]
      updated[index] = updated[index + 1]
      updated[index + 1] = temp
      // Re-number seed positions
      return updated.map((e, i) => ({ ...e, seedPosition: i + 1 }))
    })
  }

  function handleImageChange(id: string, logoUrl: string | null) {
    setEntrants((prev) =>
      prev.map((e) => (e.id === id ? { ...e, logoUrl } : e))
    )
  }

  function handleVisualPlacement(updatedEntrants: Entrant[]) {
    setEntrants(updatedEntrants)
  }

  function handleSave() {
    setError(null)

    if (entrants.length !== bracket.size) {
      setError(`Need exactly ${bracket.size} entrants (have ${entrants.length})`)
      return
    }

    const emptyNames = entrants.some((e) => !e.name.trim())
    if (emptyNames) {
      setError('All entrants must have a name')
      return
    }

    startTransition(async () => {
      const result = await updateBracketEntrants({
        bracketId: bracket.id,
        entrants: entrants.map((e) => ({
          name: e.name.trim(),
          seedPosition: e.seedPosition,
          logoUrl: e.logoUrl ?? null,
        })),
      })

      if (result && 'error' in result) {
        setError(result.error as string)
      } else {
        router.push(`/brackets/${bracket.id}`)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/brackets/${bracket.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to bracket
      </Link>

      {/* Entrant counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {entrants.length} / {bracket.size} entrants
        </p>
      </div>

      {/* Placement mode toggle (only when entrants exist) */}
      {entrants.length > 0 && (
        <PlacementModeToggle
          mode={placementMode}
          onModeChange={setPlacementMode}
        />
      )}

      {/* Entrant list (list mode) or visual placement (visual mode) */}
      {placementMode === 'list' ? (
        <>
          {/* Entrant list */}
          <div className="space-y-2">
            {entrants.map((entrant, index) => (
              <div
                key={entrant.id}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-2"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="w-6 shrink-0 text-xs text-muted-foreground">
                  #{entrant.seedPosition}
                </span>
                <EntrantImageUpload
                  bracketId={bracket.id}
                  existingImageUrl={entrant.logoUrl}
                  onImageUrl={(url) => handleImageChange(entrant.id, url)}
                  onRemove={() => handleImageChange(entrant.id, null)}
                />
                <input
                  type="text"
                  value={entrant.name}
                  onChange={(e) => handleEntrantNameChange(index, e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  placeholder="Entrant name"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="rounded p-1 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
                    title="Move up"
                  >
                    {'\u2191'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === entrants.length - 1}
                    className="rounded p-1 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
                    title="Move down"
                  >
                    {'\u2193'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveEntrant(index)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : entrants.length > 0 ? (
        bracket.bracketType === 'round_robin' ? (
          <PlacementMatchupGrid
            entrants={entrants}
            entrantCount={bracket.size}
            onEntrantsChange={handleVisualPlacement}
          />
        ) : (
          <PlacementBracket
            entrants={entrants}
            bracketSize={byeInfo?.bracketSize ?? bracket.size}
            entrantCount={bracket.size}
            onEntrantsChange={handleVisualPlacement}
          />
        )
      ) : null}

      {/* Add entrant */}
      {entrants.length < bracket.size && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newEntrantName}
            onChange={(e) => setNewEntrantName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddEntrant()
              }
            }}
            placeholder="New entrant name"
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={handleAddEntrant}
            disabled={!newEntrantName.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 border-t pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || entrants.length !== bracket.size}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
        <Link
          href={`/brackets/${bracket.id}`}
          className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Cancel
        </Link>
      </div>
    </div>
  )
}
