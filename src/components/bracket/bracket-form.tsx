'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import {
  Trophy,
  Plus,
  Upload,
  List,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Swords,
  Grid3X3,
  Brain,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EntrantList } from '@/components/bracket/entrant-list'
import { CSVUpload } from '@/components/bracket/csv-upload'
import { TopicPicker } from '@/components/bracket/topic-picker'
import { PlacementModeToggle } from '@/components/bracket/visual-placement/placement-mode-toggle'
import { PlacementBracket } from '@/components/bracket/visual-placement/placement-bracket'
import { PlacementMatchupGrid } from '@/components/bracket/visual-placement/placement-matchup-grid'
import { createBracket } from '@/actions/bracket'
import { calculateBracketSizeWithByes } from '@/lib/bracket/byes'
import type { BracketType, RoundRobinPacing, RoundRobinVotingStyle, RoundRobinStandingsMode, PredictiveMode, PredictiveResolutionMode } from '@/lib/bracket/types'

// Entrant with client-side temp ID
interface FormEntrant {
  id: string
  name: string
  seedPosition: number
  logoUrl?: string | null
}

type EntrantTab = 'manual' | 'csv' | 'topics'

const PRESET_SIZES = [4, 8, 16, 32, 64] as const

// Type card config
const BRACKET_TYPE_OPTIONS: {
  value: BracketType
  label: string
  description: string
  icon: typeof Trophy
  badge?: string
}[] = [
  {
    value: 'single_elimination',
    label: 'Single Elimination',
    description: 'Standard tournament bracket',
    icon: Trophy,
  },
  {
    value: 'double_elimination',
    label: 'Double Elimination',
    description: 'Two chances before elimination',
    icon: Swords,
    badge: 'Pro+',
  },
  {
    value: 'round_robin',
    label: 'Round Robin',
    description: 'Everyone plays everyone',
    icon: Grid3X3,
    badge: 'Pro+',
  },
  {
    value: 'predictive',
    label: 'Predictive',
    description: 'Students predict outcomes',
    icon: Brain,
    badge: 'Pro Plus',
  },
]

export function BracketForm() {
  const router = useRouter()

  // Wizard step
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Bracket info
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [bracketType, setBracketType] = useState<BracketType>('single_elimination')
  const [size, setSize] = useState<number | null>(null)
  const [useCustomSize, setUseCustomSize] = useState(false)
  const [customSizeInput, setCustomSizeInput] = useState('')

  // Type-specific options
  const [roundRobinPacing, setRoundRobinPacing] = useState<RoundRobinPacing>('round_by_round')
  const [roundRobinVotingStyle, setRoundRobinVotingStyle] = useState<RoundRobinVotingStyle>('simple')
  const [roundRobinStandingsMode, setRoundRobinStandingsMode] = useState<RoundRobinStandingsMode>('live')
  const [predictiveMode, setPredictiveMode] = useState<PredictiveMode>('simple')
  const [predictiveResolutionMode, setPredictiveResolutionMode] = useState<PredictiveResolutionMode>('vote_based')
  const [playInEnabled, setPlayInEnabled] = useState(false)
  const [viewingMode, setViewingMode] = useState<'simple' | 'advanced'>('advanced')
  const [showSeedNumbers, setShowSeedNumbers] = useState(true)

  // Step 2: Entrants
  const [entrants, setEntrants] = useState<FormEntrant[]>([])
  const [activeTab, setActiveTab] = useState<EntrantTab>('manual')
  const [manualInput, setManualInput] = useState('')
  const [placementMode, setPlacementMode] = useState<'list' | 'visual'>('list')

  // Step 3: Submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Computed values
  const maxSize = bracketType === 'round_robin' ? 8 : bracketType === 'double_elimination' ? 64 : 128
  const minSize = 3

  const byeInfo = useMemo(() => {
    if (!size || bracketType === 'round_robin') return null
    const info = calculateBracketSizeWithByes(size)
    return info.numByes > 0 ? info : null
  }, [size, bracketType])

  // --- Step 1 handlers ---
  const canProceedStep1 =
    name.trim().length > 0 &&
    size !== null &&
    size >= minSize &&
    (bracketType !== 'round_robin' || size <= 8)

  const handleTypeChange = useCallback(
    (newType: BracketType) => {
      setBracketType(newType)
      // Reset size if it exceeds new type's max
      const newMax = newType === 'round_robin' ? 8 : newType === 'double_elimination' ? 64 : 128
      if (size !== null && size > newMax) {
        setSize(null)
        setUseCustomSize(false)
        setCustomSizeInput('')
      }
      // Reset play-in if switching away from double-elim
      if (newType !== 'double_elimination') {
        setPlayInEnabled(false)
      }
    },
    [size]
  )

  const handleSizeChange = useCallback(
    (newSize: number) => {
      setSize(newSize)
      setUseCustomSize(false)
      setCustomSizeInput('')
      // Truncate entrants if exceeding new size
      if (entrants.length > newSize) {
        setEntrants((prev) =>
          prev.slice(0, newSize).map((e, i) => ({ ...e, seedPosition: i + 1 }))
        )
      }
    },
    [entrants.length]
  )

  const handleCustomSizeChange = useCallback(
    (value: string) => {
      setCustomSizeInput(value)
      const num = parseInt(value, 10)
      if (!isNaN(num) && num >= minSize && num <= maxSize) {
        setSize(num)
        // Truncate entrants if exceeding new size
        if (entrants.length > num) {
          setEntrants((prev) =>
            prev.slice(0, num).map((e, i) => ({ ...e, seedPosition: i + 1 }))
          )
        }
      } else {
        setSize(null)
      }
    },
    [maxSize, entrants.length]
  )

  const handleCustomToggle = useCallback(() => {
    setUseCustomSize(true)
    setSize(null)
    setCustomSizeInput('')
  }, [])

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

  const handleVisualPlacement = useCallback((updatedEntrants: FormEntrant[]) => {
    setEntrants(updatedEntrants)
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

  const handleImageChange = useCallback((id: string, logoUrl: string | null) => {
    setEntrants((prev) =>
      prev.map((e) => (e.id === id ? { ...e, logoUrl } : e))
    )
  }, [])

  const canProceedStep2 = size !== null && entrants.length === size

  // --- Step 3 handlers ---
  const handleSubmit = useCallback(async () => {
    if (!size || !canProceedStep2) return

    setIsSubmitting(true)
    setError(null)

    try {
      const bracketData: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        size,
        bracketType,
        showSeedNumbers,
      }

      // Add type-specific options
      if (bracketType === 'round_robin') {
        bracketData.roundRobinPacing = roundRobinPacing
        bracketData.roundRobinVotingStyle = roundRobinVotingStyle
        bracketData.roundRobinStandingsMode = roundRobinStandingsMode
      }
      if (bracketType === 'predictive') {
        bracketData.predictiveMode = predictiveMode
        bracketData.predictiveResolutionMode = predictiveResolutionMode
      }
      if (bracketType === 'double_elimination') {
        bracketData.playInEnabled = playInEnabled
      }
      if (bracketType === 'single_elimination') {
        bracketData.viewingMode = viewingMode
      }

      const result = await createBracket({
        bracket: bracketData,
        entrants: entrants.map((e) => ({
          name: e.name,
          seedPosition: e.seedPosition,
          logoUrl: e.logoUrl ?? null,
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
  }, [
    size,
    canProceedStep2,
    name,
    description,
    bracketType,
    roundRobinPacing,
    roundRobinVotingStyle,
    roundRobinStandingsMode,
    predictiveMode,
    predictiveResolutionMode,
    playInEnabled,
    viewingMode,
    showSeedNumbers,
    entrants,
    router,
  ])

  // Type label for review
  const typeLabel = BRACKET_TYPE_OPTIONS.find((t) => t.value === bracketType)?.label ?? bracketType

  // Full-width mode: expand when visual placement is active in step 2
  const isFullWidth = step === 2 && placementMode === 'visual'

  return (
    <div className={isFullWidth ? 'mx-auto' : 'mx-auto max-w-2xl'}>
      {/* Step indicator -- always centered at readable width */}
      <div className="mx-auto mb-8 flex max-w-2xl items-center justify-center gap-2">
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
          <CardContent className="space-y-6">
            {/* Name */}
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

            {/* Description */}
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

            {/* Bracket Type Selector */}
            <div className="space-y-2">
              <Label>Bracket Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {BRACKET_TYPE_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const isSelected = bracketType === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleTypeChange(option.value)}
                      className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-4 text-center transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {option.badge && (
                        <span className="absolute right-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          {option.badge}
                        </span>
                      )}
                      <Icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Bracket Size Selector */}
            <div className="space-y-2">
              <Label>Bracket Size</Label>
              {bracketType === 'round_robin' && (
                <p className="text-xs text-muted-foreground">
                  Round-robin supports 3-8 entrants
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {PRESET_SIZES.filter((s) => s <= maxSize).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSizeChange(s)}
                    className={`min-w-[64px] rounded-md border px-4 py-3 text-center font-medium transition-colors ${
                      size === s && !useCustomSize
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleCustomToggle}
                  className={`min-w-[64px] rounded-md border px-4 py-3 text-center font-medium transition-colors ${
                    useCustomSize
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  Custom
                </button>
              </div>

              {useCustomSize && (
                <div className="mt-2">
                  <Input
                    type="number"
                    min={minSize}
                    max={maxSize}
                    placeholder={`Enter size (${minSize}-${maxSize})`}
                    value={customSizeInput}
                    onChange={(e) => handleCustomSizeChange(e.target.value)}
                    className="max-w-[200px]"
                  />
                  {customSizeInput && size === null && (
                    <p className="mt-1 text-xs text-destructive">
                      Size must be between {minSize} and {maxSize}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Type-specific options */}
            {bracketType === 'double_elimination' && (
              <div className="space-y-3 rounded-lg border p-4">
                <h4 className="text-sm font-medium">Double Elimination Options</h4>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={playInEnabled}
                    onChange={(e) => setPlayInEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">
                    Add 8 play-in entrants (NCAA March Madness style)
                  </span>
                </label>
              </div>
            )}

            {bracketType === 'round_robin' && (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="text-sm font-medium">Round Robin Options</h4>

                {/* Pacing */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Pacing</Label>
                  <div className="flex gap-3">
                    {(['round_by_round', 'all_at_once'] as const).map((value) => (
                      <label key={value} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="rr-pacing"
                          checked={roundRobinPacing === value}
                          onChange={() => setRoundRobinPacing(value)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">
                          {value === 'round_by_round' ? 'Round by Round' : 'All at Once'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Voting Style */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Voting Style</Label>
                  <div className="flex gap-3">
                    {(['simple', 'advanced'] as const).map((value) => (
                      <label key={value} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="rr-voting"
                          checked={roundRobinVotingStyle === value}
                          onChange={() => setRoundRobinVotingStyle(value)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm capitalize">{value}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Standings Mode */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Standings Mode</Label>
                  <div className="flex gap-3">
                    {(['live', 'suspenseful'] as const).map((value) => (
                      <label key={value} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="rr-standings"
                          checked={roundRobinStandingsMode === value}
                          onChange={() => setRoundRobinStandingsMode(value)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm capitalize">{value}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {bracketType === 'predictive' && (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="text-sm font-medium">Predictive Options</h4>

                {/* Prediction Mode */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Prediction Mode</Label>
                  <div className="flex gap-3">
                    {(['simple', 'advanced'] as const).map((value) => (
                      <label key={value} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="pred-mode"
                          checked={predictiveMode === value}
                          onChange={() => setPredictiveMode(value)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm capitalize">{value}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Resolution Mode */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Resolution Mode</Label>
                  <div className="flex flex-col gap-2">
                    {([
                      { value: 'vote_based' as const, label: 'Predict then Vote', description: 'Students predict bracket, then Live Vote to pick winners.' },
                      { value: 'auto' as const, label: 'Prediction is the Vote', description: 'Predictions auto-resolve the bracket. Teacher paces the reveal.' },
                    ]).map((option) => (
                      <label key={option.value} className="flex items-start gap-1.5">
                        <input
                          type="radio"
                          name="pred-resolution"
                          checked={predictiveResolutionMode === option.value}
                          onChange={() => setPredictiveResolutionMode(option.value)}
                          className="mt-0.5 h-4 w-4"
                        />
                        <div>
                          <span className="text-sm font-medium">{option.label}</span>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {bracketType === 'single_elimination' && (
              <div className="space-y-3 rounded-lg border p-4">
                <h4 className="text-sm font-medium">Single Elimination Options</h4>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Viewing Mode</Label>
                  <div className="flex gap-3">
                    {(['simple', 'advanced'] as const).map((value) => (
                      <label key={value} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="se-viewing-mode"
                          checked={viewingMode === value}
                          onChange={() => setViewingMode(value)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm capitalize">{value}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Simple: students see one matchup at a time. Advanced: students see the full bracket diagram.
                  </p>
                </div>
              </div>
            )}

            {/* Display options (all bracket types) */}
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="text-sm font-medium">Display Options</h4>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showSeedNumbers}
                  onChange={(e) => setShowSeedNumbers(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <span className="text-sm">Show seed numbers</span>
                  <p className="text-xs text-muted-foreground">
                    Display seed position numbers next to entrant names in the bracket
                  </p>
                </div>
              </label>
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
            {byeInfo && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {byeInfo.numByes} bye slot{byeInfo.numByes > 1 ? 's' : ''} will be added automatically
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input controls -- constrained width in full-width mode for readability */}
            <div className={isFullWidth ? 'mx-auto max-w-2xl space-y-4' : 'space-y-4'}>
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

              {/* Placement mode toggle (only when entrants exist) */}
              {entrants.length > 0 && (
                <PlacementModeToggle
                  mode={placementMode}
                  onModeChange={setPlacementMode}
                />
              )}
            </div>

            {/* Entrant list (list mode) or visual placement (visual mode) */}
            {placementMode === 'list' ? (
              <EntrantList
                entrants={entrants}
                onReorder={handleReorder}
                onRemove={handleRemove}
                onEdit={handleEdit}
                onImageChange={handleImageChange}
                bracketType={bracketType}
                totalEntrants={size}
              />
            ) : entrants.length > 0 ? (
              bracketType === 'round_robin' ? (
                <PlacementMatchupGrid
                  entrants={entrants}
                  entrantCount={size}
                  onEntrantsChange={handleVisualPlacement}
                />
              ) : (
                <PlacementBracket
                  entrants={entrants}
                  bracketSize={byeInfo?.bracketSize ?? size}
                  entrantCount={size}
                  onEntrantsChange={handleVisualPlacement}
                />
              )
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No entrants added yet. Use the options above to add entrants.
                </p>
              </div>
            )}

            {/* Bye helper text */}
            {byeInfo && entrants.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Entrants at positions 1-{byeInfo.numByes} will receive first-round byes.
              </p>
            )}

            {/* Navigation */}
            <div className={`flex justify-between pt-4${isFullWidth ? ' mx-auto max-w-2xl' : ''}`}>
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
                <span className="text-sm font-medium text-muted-foreground">Type</span>
                <p className="font-medium">{typeLabel}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Size</span>
                <p className="font-medium">
                  {size} entrants
                  {byeInfo ? ` (${byeInfo.numByes} bye${byeInfo.numByes > 1 ? 's' : ''})` : ''}
                </p>
              </div>
              {bracketType === 'round_robin' && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Options</span>
                  <p className="text-sm">
                    Pacing: {roundRobinPacing === 'round_by_round' ? 'Round by Round' : 'All at Once'} /
                    Voting: {roundRobinVotingStyle} /
                    Standings: {roundRobinStandingsMode}
                  </p>
                </div>
              )}
              {bracketType === 'predictive' && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Options</span>
                  <p className="text-sm">
                    Mode: {predictiveMode} /
                    Resolution: {predictiveResolutionMode === 'auto' ? 'Prediction is the Vote' : 'Predict then Vote'}
                  </p>
                </div>
              )}
              {bracketType === 'double_elimination' && playInEnabled && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Options</span>
                  <p className="text-sm">Play-in round enabled (+8 entrants)</p>
                </div>
              )}
              {bracketType === 'single_elimination' && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Options</span>
                  <p className="text-sm">
                    Viewing: {viewingMode === 'simple' ? 'Simple (one matchup at a time)' : 'Advanced (full bracket diagram)'}
                  </p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-muted-foreground">Display</span>
                <p className="text-sm">
                  Seed numbers: {showSeedNumbers ? 'Visible' : 'Hidden'}
                </p>
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
                bracketType={bracketType}
                totalEntrants={size}
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
