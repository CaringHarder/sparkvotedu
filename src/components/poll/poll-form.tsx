'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import { BarChart3, ListOrdered, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OptionList } from '@/components/poll/option-list'
import type { OptionItem } from '@/components/poll/option-list'
import { createPoll, updatePoll, updatePollOptions } from '@/actions/poll'
import { POLL_TEMPLATES, type PollTemplate } from '@/lib/poll/templates'
import { Badge } from '@/components/ui/badge'
import type { PollType } from '@/lib/poll/types'

const CATEGORY_COLORS: Record<string, string> = {
  'Icebreakers': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Classroom Decisions': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Academic Debates': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Fun & Trivia': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Feedback': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

interface PollFormProps {
  /** Creation mode: 'quick' hides poll type/settings/ranking depth */
  mode?: 'quick' | 'edit'
  /** Existing poll data for edit mode */
  existingPoll?: {
    id: string
    question: string
    description: string | null
    pollType: string
    allowVoteChange: boolean
    showLiveResults: boolean
    rankingDepth: number | null
    options: { id: string; text: string; imageUrl: string | null; position: number }[]
  } | null
}

export function PollForm({ mode = 'edit', existingPoll }: PollFormProps) {
  const router = useRouter()
  const isEditing = !!existingPoll
  const isQuickCreate = mode === 'quick'

  // Template selection (Quick Create only)
  const [selectedTemplate, setSelectedTemplate] = useState<PollTemplate | null>(null)

  // Form state
  const [question, setQuestion] = useState(
    existingPoll?.question ?? ''
  )
  const [description, setDescription] = useState(existingPoll?.description ?? '')
  const [pollType, setPollType] = useState<PollType>(
    isQuickCreate ? 'simple' : (existingPoll?.pollType as PollType) ?? 'simple'
  )
  const [options, setOptions] = useState<OptionItem[]>(() => {
    if (existingPoll) {
      return existingPoll.options.map((o) => ({
        id: o.id,
        text: o.text,
        imageUrl: o.imageUrl ?? undefined,
      }))
    }
    return [
      { id: nanoid(), text: '' },
      { id: nanoid(), text: '' },
    ]
  })

  // Settings
  const [allowVoteChange, setAllowVoteChange] = useState(
    isQuickCreate ? false : (existingPoll?.allowVoteChange ?? true)
  )
  const [showLiveResults, setShowLiveResults] = useState(
    isQuickCreate ? false : (existingPoll?.showLiveResults ?? false)
  )
  const [rankingDepth, setRankingDepth] = useState<number | null>(
    existingPoll?.rankingDepth ?? null
  )

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit =
    question.trim().length > 0 &&
    options.filter((o) => o.text.trim().length > 0).length >= 2

  function handleTemplateSelect(template: PollTemplate | null) {
    setSelectedTemplate(template)
    if (template) {
      setQuestion(template.question)
      setOptions(template.options.map((text) => ({ id: nanoid(), text })))
    } else {
      setQuestion('')
      setOptions([{ id: nanoid(), text: '' }, { id: nanoid(), text: '' }])
    }
  }

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)

    const validOptions = options
      .filter((o) => o.text.trim().length > 0)
      .map((o, i) => ({
        text: o.text.trim(),
        position: i,
        imageUrl: o.imageUrl ?? null,
      }))

    try {
      if (isEditing && existingPoll) {
        // Update existing poll fields
        const result = await updatePoll({
          pollId: existingPoll.id,
          question: question.trim(),
          description: description.trim() || null,
          pollType,
          allowVoteChange,
          showLiveResults,
          rankingDepth: pollType === 'ranked' ? rankingDepth : null,
        })

        if (result && 'error' in result) {
          setError(result.error as string)
          return
        }

        // Update options (text, imageUrl, position) using the original option IDs
        const optionsToUpdate = options
          .filter((o) => o.text.trim().length > 0)
          .map((o, i) => ({
            id: o.id,
            text: o.text.trim(),
            imageUrl: o.imageUrl ?? null,
            position: i,
          }))

        if (optionsToUpdate.length > 0) {
          const optionResult = await updatePollOptions({
            pollId: existingPoll.id,
            options: optionsToUpdate,
          })

          if (optionResult && 'error' in optionResult) {
            setError(optionResult.error as string)
            return
          }
        }

        router.refresh()
      } else {
        // Create new poll
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
          return
        }

        if ('poll' in result && result.poll) {
          router.push(`/polls/${result.poll.id}`)
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    canSubmit,
    question,
    description,
    pollType,
    options,
    allowVoteChange,
    showLiveResults,
    rankingDepth,
    isEditing,
    existingPoll,
    router,
  ])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4.5 w-4.5" />
          {isEditing ? 'Edit Poll' : 'Quick Create'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Template chip grid (Quick Create only) */}
        {isQuickCreate && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Start from a template</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {POLL_TEMPLATES.map((t) => {
                const isSelected = selectedTemplate?.id === t.id
                const colorClass = CATEGORY_COLORS[t.category] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateSelect(isSelected ? null : t)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-transparent hover:border-primary/30'
                    }`}
                  >
                    <span className="text-xs font-medium line-clamp-2">{t.question}</span>
                    <Badge variant="secondary" className={colorClass}>{t.category}</Badge>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Question */}
        <div className="space-y-2">
          <Label htmlFor="poll-question">Question</Label>
          <Input
            id="poll-question"
            placeholder='e.g. "What should we do for our class reward?"'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground">{question.length}/300</p>
        </div>

        {/* Description (optional) */}
        <div className="space-y-2">
          <Label htmlFor="poll-description">
            Description <span className="text-muted-foreground">(optional)</span>
          </Label>
          <textarea
            id="poll-description"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Add context for students..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
          />
        </div>

        {/* Poll Type Toggle -- hidden in Quick Create */}
        {!isQuickCreate && (
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
          </div>
        )}

        {/* Ranking depth (for ranked polls) -- hidden in Quick Create */}
        {!isQuickCreate && pollType === 'ranked' && (
          <div className="space-y-2">
            <Label htmlFor="ranking-depth">Ranking Depth</Label>
            <select
              id="ranking-depth"
              value={rankingDepth ?? 'all'}
              onChange={(e) =>
                setRankingDepth(e.target.value === 'all' ? null : Number(e.target.value))
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
          </div>
        )}

        {/* Options */}
        <div className="space-y-2">
          <Label>Options</Label>
          <OptionList options={options} onChange={setOptions} pollId={existingPoll?.id} />
        </div>

        {/* Settings -- hidden in Quick Create */}
        {!isQuickCreate && (
          <div className="space-y-3 rounded-lg border p-3">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Settings
            </h4>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Allow students to change their vote</span>
              <input
                type="checkbox"
                checked={allowVoteChange}
                onChange={(e) => setAllowVoteChange(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Show live results to students</span>
              <input
                type="checkbox"
                checked={showLiveResults}
                onChange={(e) => setShowLiveResults(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
            </label>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : isEditing ? (
            'Update Poll'
          ) : (
            'Create Poll'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
