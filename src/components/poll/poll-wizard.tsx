'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import {
  BarChart3,
  ListOrdered,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OptionList } from '@/components/poll/option-list'
import type { OptionItem } from '@/components/poll/option-list'
import { createPoll } from '@/actions/poll'
import type { PollTemplate } from '@/lib/poll/templates'
import type { PollType } from '@/lib/poll/types'

interface PollWizardProps {
  /** Pre-fill from template */
  template?: PollTemplate | null
}

type WizardStep = 1 | 2 | 3 | 4
const STEP_LABELS = ['Question', 'Options', 'Settings', 'Review'] as const

export function PollWizard({ template }: PollWizardProps) {
  const router = useRouter()

  // Step state
  const [step, setStep] = useState<WizardStep>(1)

  // Step 1: Question
  const [question, setQuestion] = useState(template?.question ?? '')
  const [description, setDescription] = useState('')
  const [pollType, setPollType] = useState<PollType>(template?.pollType ?? 'simple')

  // Step 2: Options
  const [options, setOptions] = useState<OptionItem[]>(() => {
    if (template) {
      return template.options.map((text) => ({ id: nanoid(), text }))
    }
    return [
      { id: nanoid(), text: '' },
      { id: nanoid(), text: '' },
    ]
  })

  // Step 3: Settings
  const [allowVoteChange, setAllowVoteChange] = useState(true)
  const [showLiveResults, setShowLiveResults] = useState(false)
  const [rankingDepth, setRankingDepth] = useState<number | null>(null)

  // Step 4: Submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validation
  const canProceedStep1 = question.trim().length >= 1
  const validOptionCount = options.filter((o) => o.text.trim().length > 0).length
  const canProceedStep2 = validOptionCount >= 2

  // Submit
  const handleSubmit = useCallback(async () => {
    if (!canProceedStep2) return

    setIsSubmitting(true)
    setError(null)

    const validOptions = options
      .filter((o) => o.text.trim().length > 0)
      .map((o, i) => ({ text: o.text.trim(), position: i, imageUrl: o.imageUrl ?? null }))

    try {
      const result = await createPoll({
        poll: {
          question: question.trim(),
          description: description.trim() || undefined,
          pollType,
          allowVoteChange,
          showLiveResults,
          rankingDepth: pollType === 'ranked' ? rankingDepth : null,
        },
        options: validOptions,
      })

      if (result && 'error' in result) {
        setError(result.error as string)
        setIsSubmitting(false)
        return
      }

      if ('poll' in result && result.poll) {
        router.push(`/polls/${result.poll.id}`)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }, [
    canProceedStep2,
    question,
    description,
    pollType,
    options,
    allowVoteChange,
    showLiveResults,
    rankingDepth,
    router,
  ])

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator (same pattern as bracket-form.tsx) */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {([1, 2, 3, 4] as WizardStep[]).map((s) => (
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
              {STEP_LABELS[s - 1]}
            </span>
            {s < 4 && <div className="mx-2 h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Question */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Poll Question
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wizard-question">Question</Label>
              <Input
                id="wizard-question"
                placeholder='e.g. "Which topic should we cover next?"'
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={300}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">{question.length}/300</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wizard-description">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <textarea
                id="wizard-description"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Add context for your students..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
            </div>

            {/* Poll type toggle */}
            <div className="space-y-2">
              <Label>Poll Type</Label>
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setPollType('simple')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    pollType === 'simple'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Simple
                </button>
                <button
                  type="button"
                  onClick={() => setPollType('ranked')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    pollType === 'ranked'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ListOrdered className="h-4 w-4" />
                  Ranked
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {pollType === 'simple'
                  ? 'Students pick one option.'
                  : 'Students rank options in order of preference.'}
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Options */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Add Options</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add at least 2 options for students to choose from.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Option list */}
            <OptionList options={options} onChange={setOptions} />

            {/* Option count */}
            <p
              className={`text-sm font-medium ${
                validOptionCount >= 2
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {validOptionCount} valid {validOptionCount === 1 ? 'option' : 'options'}
              {validOptionCount < 2 && ' (need at least 2)'}
            </p>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Settings */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <span className="text-sm font-medium">Allow vote changes</span>
                <p className="text-xs text-muted-foreground">
                  Students can update their vote after submitting.
                </p>
              </div>
              <input
                type="checkbox"
                checked={allowVoteChange}
                onChange={(e) => setAllowVoteChange(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <span className="text-sm font-medium">Show live results</span>
                <p className="text-xs text-muted-foreground">
                  Students can see results as votes come in.
                </p>
              </div>
              <input
                type="checkbox"
                checked={showLiveResults}
                onChange={(e) => setShowLiveResults(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
            </label>

            {pollType === 'ranked' && (
              <div className="space-y-2 rounded-lg border p-3">
                <Label htmlFor="wizard-ranking-depth">Ranking Depth</Label>
                <select
                  id="wizard-ranking-depth"
                  value={rankingDepth ?? 'all'}
                  onChange={(e) =>
                    setRankingDepth(
                      e.target.value === 'all' ? null : Number(e.target.value)
                    )
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="all">Rank all options</option>
                  {[2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      Rank top {n}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  How many options students must rank.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(4)}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Question</span>
                <p className="font-medium">{question}</p>
              </div>
              {description.trim() && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Description</span>
                  <p className="text-sm">{description}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-muted-foreground">Type</span>
                <p className="font-medium capitalize">{pollType}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Options</span>
                <ul className="mt-1 space-y-1">
                  {options
                    .filter((o) => o.text.trim())
                    .map((o, i) => (
                      <li key={o.id} className="flex items-center gap-2 text-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
                          {i + 1}
                        </span>
                        {o.text}
                      </li>
                    ))}
                </ul>
              </div>
              <div className="flex gap-4 text-sm">
                <span>
                  Vote changes:{' '}
                  <strong>{allowVoteChange ? 'Allowed' : 'Not allowed'}</strong>
                </span>
                <span>
                  Live results: <strong>{showLiveResults ? 'Visible' : 'Hidden'}</strong>
                </span>
              </div>
              {pollType === 'ranked' && (
                <div className="text-sm">
                  Ranking depth:{' '}
                  <strong>{rankingDepth ? `Top ${rankingDepth}` : 'All options'}</strong>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(3)} disabled={isSubmitting}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !canProceedStep2}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Create Poll
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
