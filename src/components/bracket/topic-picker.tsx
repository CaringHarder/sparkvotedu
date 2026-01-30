'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, Check, BookOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CURATED_TOPICS, type TopicList } from '@/lib/bracket/curated-topics'

interface TopicPickerProps {
  onTopicsSelected: (entrants: Array<{ name: string; seed: number }>) => void
  bracketSize: number
}

// Subject color mapping
const SUBJECT_COLORS: Record<string, string> = {
  Science: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  History: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Literature: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Arts: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Geography: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Pop Culture': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Fun: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
}

export function TopicPicker({ onTopicsSelected, bracketSize }: TopicPickerProps) {
  const [search, setSearch] = useState('')
  const [selectedList, setSelectedList] = useState<TopicList | null>(null)

  // Filter topic lists by search
  const filteredTopics = useMemo(() => {
    if (!search.trim()) return CURATED_TOPICS
    const q = search.toLowerCase()
    return CURATED_TOPICS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    )
  }, [search])

  // Group topics by subject
  const groupedTopics = useMemo(() => {
    const groups: Record<string, TopicList[]> = {}
    for (const topic of filteredTopics) {
      if (!groups[topic.subject]) {
        groups[topic.subject] = []
      }
      groups[topic.subject].push(topic)
    }
    return groups
  }, [filteredTopics])

  const slicedTopics = useMemo(() => {
    if (!selectedList) return []
    return selectedList.topics.slice(0, bracketSize)
  }, [selectedList, bracketSize])

  const handleConfirm = useCallback(() => {
    if (!selectedList) return
    const entrants = slicedTopics.map((name, index) => ({
      name,
      seed: index + 1,
    }))
    onTopicsSelected(entrants)
    setSelectedList(null)
    setSearch('')
  }, [selectedList, slicedTopics, onTopicsSelected])

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search topic lists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Topic list selection or preview */}
      {selectedList ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{selectedList.name}</span>
            <Badge
              variant="secondary"
              className={getSubjectColor(selectedList.subject)}
            >
              {selectedList.subject}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            {selectedList.description}
          </p>

          {selectedList.topics.length > bracketSize && (
            <p className="text-xs text-muted-foreground">
              Showing first {bracketSize} of {selectedList.topics.length} topics.
            </p>
          )}

          {/* Preview entries */}
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
            {slicedTopics.map((topic, i) => (
              <div
                key={`${topic}-${i}`}
                className="flex items-center gap-2 text-sm"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted font-mono text-xs">
                  {i + 1}
                </span>
                <span className="truncate">{topic}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedList(null)}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="flex-1"
            >
              <Check className="mr-1 h-4 w-4" />
              Use These Topics
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-h-64 space-y-4 overflow-y-auto">
          {Object.keys(groupedTopics).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No topic lists match your search.
            </p>
          ) : (
            Object.entries(groupedTopics).map(([subject, lists]) => (
              <div key={subject} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {subject}
                </h4>
                {lists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => setSelectedList(list)}
                    className="w-full rounded-md border p-3 text-left transition-colors hover:border-primary hover:bg-accent"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{list.name}</span>
                      <Badge
                        variant="secondary"
                        className={getSubjectColor(list.subject)}
                      >
                        {list.topics.length} topics
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {list.description}
                    </p>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
