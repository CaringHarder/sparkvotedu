'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Loader2 } from 'lucide-react'
import { CURATED_TOPICS, type TopicList } from '@/lib/bracket/curated-topics'
import { createBracket } from '@/actions/bracket'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface BracketQuickCreateProps {
  sessions: Array<{
    id: string
    code: string
    name: string | null
    createdAt: string
  }>
}

/** Fisher-Yates shuffle to pick random entrants */
function pickRandom(items: string[], count: number): string[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

const SUBJECT_COLORS: Record<string, string> = {
  Science: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  History: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Literature: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Arts: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Geography: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Pop Culture': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Fun: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

const ENTRANT_COUNTS = [4, 8, 16] as const
type EntrantCount = (typeof ENTRANT_COUNTS)[number]

export function BracketQuickCreate({ sessions }: BracketQuickCreateProps) {
  const router = useRouter()

  const [selectedTopic, setSelectedTopic] = useState<TopicList | null>(null)
  const [selectedCount, setSelectedCount] = useState<EntrantCount | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!selectedTopic || !selectedCount) return

    setIsCreating(true)
    setError(null)

    try {
      const randomEntrants = pickRandom(selectedTopic.topics, selectedCount)
      const entrants = randomEntrants.map((name, i) => ({
        name,
        seedPosition: i + 1,
        logoUrl: null,
      }))

      const result = await createBracket({
        bracket: {
          name: selectedTopic.name,
          description: selectedTopic.description,
          size: selectedCount,
          bracketType: 'single_elimination',
          viewingMode: 'simple',
          showSeedNumbers: false,
          sessionId: selectedSessionId ?? undefined,
        },
        entrants,
      })

      if (result && 'error' in result && result.error) {
        setError(result.error as string)
        setIsCreating(false)
        return
      }

      if (result && 'bracket' in result && result.bracket) {
        router.push(`/brackets/${result.bracket.id}`)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Topic chip grid */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Pick a topic
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {CURATED_TOPICS.map((topic) => {
            const isSelected = selectedTopic?.id === topic.id
            const colorClass =
              SUBJECT_COLORS[topic.subject] ??
              'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'

            return (
              <button
                key={topic.id}
                type="button"
                onClick={() =>
                  setSelectedTopic((prev) =>
                    prev?.id === topic.id ? null : topic
                  )
                }
                className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors ${
                  isSelected
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-transparent hover:border-primary/30'
                }`}
              >
                <span className="text-sm font-medium">{topic.name}</span>
                <Badge variant="secondary" className={colorClass}>
                  {topic.subject}
                </Badge>
              </button>
            )
          })}
        </div>
      </div>

      {/* Entrant count picker */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          How many entrants?
        </h2>
        <div className="flex gap-2">
          {ENTRANT_COUNTS.map((count) => {
            const isSelected = selectedCount === count
            const isDisabled =
              selectedTopic !== null &&
              count > selectedTopic.topics.length

            return (
              <button
                key={count}
                type="button"
                disabled={isDisabled}
                onClick={() =>
                  setSelectedCount((prev) => (prev === count ? null : count))
                }
                className={`min-w-[56px] rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-accent'
                } ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {count}
              </button>
            )
          })}
        </div>
      </div>

      {/* Session dropdown */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Assign to session (optional)
        </h2>
        <select
          value={selectedSessionId ?? ''}
          onChange={(e) =>
            setSelectedSessionId(e.target.value || null)
          }
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
        >
          <option value="">No session (assign later)</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name ? `${s.name} (${s.code})` : `Unnamed Session (${s.code})`}
            </option>
          ))}
        </select>
      </div>

      {/* Error display */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Create button */}
      <Button
        className="w-full"
        disabled={!selectedTopic || !selectedCount || isCreating}
        onClick={handleCreate}
      >
        {isCreating ? (
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
  )
}
