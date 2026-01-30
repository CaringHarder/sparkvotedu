'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import { Trophy, Plus, Upload, List, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EntrantList } from '@/components/bracket/entrant-list'
import { CSVUpload } from '@/components/bracket/csv-upload'
import { TopicPicker } from '@/components/bracket/topic-picker'
import { createBracket } from '@/actions/bracket'
import type { BracketSize } from '@/lib/bracket/types'

// Entrant with client-side temp ID
interface FormEntrant {
  id: string
  name: string
  seedPosition: number
}

type EntrantTab = 'manual' | 'csv' | 'topics'

const BRACKET_SIZES: BracketSize[] = [4, 8, 16]

export function BracketForm() {
  const router = useRouter()

  // Wizard step
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Bracket info
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [size, setSize] = useState<BracketSize | null>(null)

  // Step 2: Entrants
  const [entrants, setEntrants] = useState<FormEntrant[]>([])
  const [activeTab, setActiveTab] = useState<EntrantTab>('manual')
  const [manualInput, setManualInput] = useState('')

  // Step 3: Submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // --- Step 1 handlers ---
  const canProceedStep1 = name.trim().length > 0 && size !== null

  const handleSizeChange = useCallback(
    (newSize: BracketSize) => {
      setSize(newSize)
      // Truncate entrants if exceeding new size
      if (entrants.length > newSize) {
        setEntrants((prev) =>
          prev.slice(0, newSize).map((e, i) => ({ ...e, seedPosition: i + 1 }))
        )
      }
    },
    [entrants.length]
  )

  // --- Step 2 handlers ---
  const addManualEntrant = useCallback(() => {
    const trimmed = manualInput.trim()
    if (!trimmed || !size || entrants.length >= size) return

    setEntrants((prev) => [
      ...prev,
      { id: nanoid(), name: trimmed, seedPosition: prev.length + 1 },
    ])
    setManualInput('')
  }, [manualInput, size, entrants.length])

  const handleManualKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        addManualEntrant()
      }
    },
    [addManualEntrant]
  )

  const handleEntrantsFromCSV = useCallback(
    (parsed: Array<{ name: string; seed: number }>) => {
      if (!size) return
      const newEntrants: FormEntrant[] = parsed.slice(0, size).map((p, i) => ({
        id: nanoid(),
        name: p.name,
        seedPosition: i + 1,
      }))
      setEntrants(newEntrants)
    },
    [size]
  )

  const handleEntrantsFromTopics = useCallback(
    (selected: Array<{ name: string; seed: number }>) => {
      if (!size) return
      const newEntrants: FormEntrant[] = selected.slice(0, size).map((t, i) => ({
        id: nanoid(),
        name: t.name,
        seedPosition: i + 1,
      }))
      setEntrants(newEntrants)
    },
    [size]
  )

  const handleReorder = useCallback((reordered: FormEntrant[]) => {
    setEntrants(reordered.map((e, i) => ({ ...e, seedPosition: i + 1 })))
  }, [])

  const handleRemove = useCallback((id: string) => {
    setEntrants((prev) =>
      prev.filter((e) => e.id !== id).map((e, i) => ({ ...e, seedPosition: i + 1 }))
    )
  }, [])

  const handleEdit = useCallback((id: string, newName: string) => {
    setEntrants((prev) =>
      prev.map((e) => (e.id === id ? { ...e, name: newName } : e))
    )
  }, [])

  const canProceedStep2 = size !== null && entrants.length === size

  // --- Step 3 handlers ---
  const handleSubmit = useCallback(async () => {
    if (!size || !canProceedStep2) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createBracket({
        bracket: {
          name: name.trim(),
          description: description.trim() || undefined,
          size,
        },
        entrants: entrants.map((e) => ({
          name: e.name,
          seedPosition: e.seedPosition,
        })),
      })

      if ('error' in result && result.error) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      if ('bracket' in result && result.bracket) {
        router.push(`/brackets/${result.bracket.id}`)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }, [size, canProceedStep2, name, description, entrants, router])

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {s}
            </div>
            <span
              className={`hidden text-sm sm:inline ${
                s === step ? 'font-medium' : 'text-muted-foreground'
              }`}
            >
              {s === 1 ? 'Info' : s === 2 ? 'Entrants' : 'Review'}
            </span>
            {s < 3 && (
              <div className="mx-2 h-px w-8 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Bracket Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Bracket Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bracket-name">Name</Label>
              <Input
                id="bracket-name"
                placeholder="e.g. Best Planet in the Solar System"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {name.length}/100 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bracket-description">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <textarea
                id="bracket-description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="What are students voting on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/500 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label>Bracket Size</Label>
              <div className="flex gap-2">
                {BRACKET_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSizeChange(s)}
                    className={`flex-1 rounded-md border px-4 py-3 text-center font-medium transition-colors ${
                      size === s
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {s} entrants
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Add Entrants */}
      {step === 2 && size && (
        <Card>
          <CardHeader>
            <CardTitle>Add Entrants</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add {size} entrants to your bracket using any method below.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tab buttons */}
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'manual'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Plus className="h-4 w-4" />
                Manual
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('csv')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'csv'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Upload className="h-4 w-4" />
                CSV Upload
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('topics')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'topics'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="h-4 w-4" />
                Topic Lists
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'manual' && (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter entrant name..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={handleManualKeyDown}
                  maxLength={100}
                  disabled={entrants.length >= size}
                />
                <Button
                  type="button"
                  onClick={addManualEntrant}
                  disabled={!manualInput.trim() || entrants.length >= size}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>
            )}

            {activeTab === 'csv' && (
              <CSVUpload
                onEntrantsParsed={handleEntrantsFromCSV}
                maxEntrants={size}
              />
            )}

            {activeTab === 'topics' && (
              <TopicPicker
                onTopicsSelected={handleEntrantsFromTopics}
                bracketSize={size}
              />
            )}

            {/* Entrant counter */}
            <div className="flex items-center justify-between">
              <span
                className={`text-sm font-medium ${
                  entrants.length === size
                    ? 'text-green-600 dark:text-green-400'
                    : entrants.length > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground'
                }`}
              >
                {entrants.length} / {size} entrants
              </span>
              {entrants.length > 0 && entrants.length !== size && (
                <span className="text-xs text-muted-foreground">
                  {entrants.length < size
                    ? `Need ${size - entrants.length} more`
                    : `Remove ${entrants.length - size}`}
                </span>
              )}
            </div>

            {/* Entrant list */}
            <EntrantList
              entrants={entrants}
              onReorder={handleReorder}
              onRemove={handleRemove}
              onEdit={handleEdit}
            />

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Create */}
      {step === 3 && size && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Name</span>
                <p className="font-medium">{name}</p>
              </div>
              {description.trim() && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Description
                  </span>
                  <p className="text-sm">{description}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-muted-foreground">Size</span>
                <p className="font-medium">{size} entrants</p>
              </div>
            </div>

            {/* Entrant list (read-only) */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Entrants (by seed)
              </h3>
              <EntrantList
                entrants={entrants}
                onReorder={handleReorder}
                onRemove={handleRemove}
                onEdit={handleEdit}
                disabled
              />
            </div>

            {/* Error display */}
            {error && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !canProceedStep2}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Trophy className="mr-2 h-4 w-4" />
                    Create Bracket
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
