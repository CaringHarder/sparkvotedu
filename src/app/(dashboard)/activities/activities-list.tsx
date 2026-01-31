'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trophy, BarChart3, ListOrdered, Calendar } from 'lucide-react'

interface ActivityItem {
  id: string
  name: string
  type: 'bracket' | 'poll'
  status: string
  updatedAt: string
  meta: {
    // Bracket meta
    size?: number
    entrants?: number
    sessionCode?: string | null
    // Poll meta
    pollType?: string
    votes?: number
  }
}

interface ActivitiesListProps {
  items: ActivityItem[]
}

const STATUS_TABS = ['All', 'Active', 'Draft', 'Closed'] as const
const TYPE_FILTERS = ['All', 'Brackets Only', 'Polls Only'] as const

type StatusTab = (typeof STATUS_TABS)[number]
type TypeFilter = (typeof TYPE_FILTERS)[number]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ActivitiesList({ items }: ActivitiesListProps) {
  const [statusTab, setStatusTab] = useState<StatusTab>('All')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All')

  const filtered = items.filter((item) => {
    // Status filter
    if (statusTab !== 'All') {
      const targetStatus = statusTab.toLowerCase()
      // Bracket uses 'completed' status for closed equivalent
      if (targetStatus === 'closed' && item.type === 'bracket') {
        if (item.status !== 'completed' && item.status !== 'closed') return false
      } else if (targetStatus === 'active' && item.type === 'bracket') {
        if (item.status !== 'active') return false
      } else if (item.status !== targetStatus) {
        return false
      }
    }

    // Type filter
    if (typeFilter === 'Brackets Only' && item.type !== 'bracket') return false
    if (typeFilter === 'Polls Only' && item.type !== 'poll') return false

    return true
  })

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex items-center gap-6">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex gap-1">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setTypeFilter(filter)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === filter
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No activities match the current filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <ActivityItemCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityItemCard({ item }: { item: ActivityItem }) {
  const href =
    item.type === 'bracket' ? `/brackets/${item.id}` : `/polls/${item.id}`

  const isBracket = item.type === 'bracket'
  const Icon = isBracket ? Trophy : item.meta.pollType === 'ranked' ? ListOrdered : BarChart3
  const typeBadgeClass = isBracket
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
  const iconBgClass = isBracket
    ? 'bg-amber-50 dark:bg-amber-900/20'
    : 'bg-indigo-50 dark:bg-indigo-900/20'
  const iconClass = isBracket
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-indigo-600 dark:text-indigo-400'

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    archived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }

  return (
    <Link
      href={href}
      className="group rounded-lg border bg-card transition-shadow hover:shadow-md"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}
          >
            <Icon className={`h-4.5 w-4.5 ${iconClass}`} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold group-hover:text-primary">
              {item.name}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {/* Status badge */}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  statusColors[item.status] ?? statusColors.draft
                }`}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </span>

              {/* Type badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass}`}
              >
                {isBracket ? (
                  <>
                    <Trophy className="h-3 w-3" />
                    Bracket
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-3 w-3" />
                    Poll
                  </>
                )}
              </span>

              {/* Meta info */}
              <span className="text-xs text-muted-foreground">
                {isBracket
                  ? `${item.meta.entrants ?? item.meta.size ?? 0} entrants`
                  : `${item.meta.votes ?? 0} votes`}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(item.updatedAt)}
        </div>
      </div>
    </Link>
  )
}
