'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeActivities } from '@/hooks/use-realtime-activities'
import { ActivityCard } from './activity-card'
import { EmptyState } from './empty-state'

interface ActivityGridProps {
  sessionId: string
  participantId: string
}

/**
 * Activity grid container for the student session view.
 *
 * Subscribes to real-time activity updates via Supabase Realtime.
 * - If loading: shows skeleton loading state
 * - If no activities: renders EmptyState ("Hang tight!")
 * - If one activity: auto-navigates to it (per CONTEXT.md)
 * - If multiple: renders responsive card grid
 *
 * Grid layout: 1 column on mobile, 2 on md, 3 on lg.
 */
export function ActivityGrid({ sessionId, participantId }: ActivityGridProps) {
  const { activities, loading } = useRealtimeActivities(sessionId, participantId)
  const router = useRouter()

  // Auto-navigate when only one activity is active (CONTEXT.md requirement)
  useEffect(() => {
    if (!loading && activities.length === 1) {
      const activity = activities[0]
      // Route TBD: depends on Phase 3/4/5 routes for brackets and polls
      const activityPath =
        activity.type === 'bracket'
          ? `/session/${sessionId}/bracket/${activity.id}`
          : `/session/${sessionId}/poll/${activity.id}`
      router.push(activityPath)
    }
  }, [activities, loading, sessionId, router])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border bg-muted"
          />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return <EmptyState />
  }

  // Single activity: auto-navigate handled by useEffect above
  // Show grid briefly while navigating
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Brackets/Polls</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onClick={() => {
              const path =
                activity.type === 'bracket'
                  ? `/session/${sessionId}/bracket/${activity.id}`
                  : `/session/${sessionId}/poll/${activity.id}`
              router.push(path)
            }}
          />
        ))}
      </div>
    </div>
  )
}
