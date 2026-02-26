'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
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
 * - If no activities: renders EmptyState (variant depends on prior state)
 * - If one activity: auto-navigates to it (per CONTEXT.md)
 * - If multiple: renders responsive card grid with animated exit
 *
 * Grid layout: 1 column on mobile, 2 on md, 3 on lg.
 * Cards fade out with 200ms opacity transition on removal;
 * remaining cards slide together via layout animation.
 */
export function ActivityGrid({ sessionId, participantId }: ActivityGridProps) {
  const { activities, loading } = useRealtimeActivities(sessionId, participantId)
  const router = useRouter()

  // Track whether activities were previously non-empty to differentiate
  // "teacher hasn't added anything yet" vs "teacher removed everything"
  const [hadActivities, setHadActivities] = useState(false)

  useEffect(() => {
    if (activities.length > 0) {
      setHadActivities(true)
    }
  }, [activities])

  // Auto-navigate when only one activity is active (CONTEXT.md requirement)
  useEffect(() => {
    if (!loading && activities.length === 1) {
      const activity = activities[0]
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
    return <EmptyState variant={hadActivities ? 'removed' : 'waiting'} />
  }

  // Single activity: auto-navigate handled by useEffect above
  // Show grid briefly while navigating
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Brackets/Polls</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {activities.map((activity) => (
            <motion.div
              key={activity.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ActivityCard
                activity={activity}
                onClick={() => {
                  const path =
                    activity.type === 'bracket'
                      ? `/session/${sessionId}/bracket/${activity.id}`
                      : `/session/${sessionId}/poll/${activity.id}`
                  router.push(path)
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
