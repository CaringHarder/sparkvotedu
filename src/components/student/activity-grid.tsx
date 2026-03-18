'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, LayoutGroup } from 'motion/react'
import { useRealtimeActivities } from '@/hooks/use-realtime-activities'
import { ActivityCard } from './activity-card'
import { EmptyState } from './empty-state'

interface ActivityGridProps {
  sessionId: string
  participantId: string
}

const CLOSED_STATUSES = new Set(['completed', 'closed'])

/**
 * Activity grid container for the student session view.
 *
 * Subscribes to real-time activity updates via Supabase Realtime.
 * - If loading: shows skeleton loading state
 * - If no activities: renders EmptyState (variant depends on prior state)
 * - If one active activity: auto-navigates to it (per CONTEXT.md)
 * - If multiple: renders two-section grid (Active top, Closed bottom)
 *   with animated cross-section transitions via LayoutGroup
 *
 * Grid layout: 1 column on mobile, 2 on sm, 3 on lg.
 */
export function ActivityGrid({ sessionId, participantId }: ActivityGridProps) {
  const { activities, loading } = useRealtimeActivities(sessionId, participantId)
  const router = useRouter()

  // Track whether activities were previously non-empty to differentiate
  // "teacher hasn't added anything yet" vs "teacher removed everything"
  const [hadActivities, setHadActivities] = useState(false)

  // Derive active vs closed partitions
  const activeActivities = activities.filter(a => !CLOSED_STATUSES.has(a.status))
  const closedActivities = activities.filter(a => CLOSED_STATUSES.has(a.status))

  useEffect(() => {
    if (activities.length > 0) {
      setHadActivities(true)
    }
  }, [activities])

  // Auto-navigate when only one ACTIVE activity exists (CONTEXT.md requirement)
  // When all activities are closed, do NOT auto-navigate — show grid instead
  useEffect(() => {
    if (!loading && activeActivities.length === 1) {
      const activity = activeActivities[0]
      const activityPath =
        activity.type === 'bracket'
          ? `/session/${sessionId}/bracket/${activity.id}`
          : `/session/${sessionId}/poll/${activity.id}`
      router.push(activityPath)
    }
  }, [activeActivities, loading, sessionId, router])

  const navigateToActivity = useCallback(
    (activity: (typeof activities)[number]) => {
      const path =
        activity.type === 'bracket'
          ? `/session/${sessionId}/bracket/${activity.id}`
          : `/session/${sessionId}/poll/${activity.id}`
      router.push(path)
    },
    [sessionId, router]
  )

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

  // Single active activity: auto-navigate handled by useEffect above
  // Show grid briefly while navigating
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Brackets/Polls</h2>
      <LayoutGroup>
        {/* Active section */}
        {activeActivities.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {activeActivities.map((activity) => (
                <motion.div
                  key={activity.id}
                  layoutId={activity.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0.55 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <ActivityCard
                    activity={activity}
                    isClosed={false}
                    onClick={() => navigateToActivity(activity)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Friendly message when all activities are closed */}
        {activeActivities.length === 0 && closedActivities.length > 0 && (
          <div className="flex flex-col items-center py-8 text-center">
            <h3 className="text-lg font-medium text-muted-foreground">
              No active activities right now
            </h3>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Hang tight — your teacher will start something soon!
            </p>
          </div>
        )}

        {/* Section divider when both sections have items */}
        {activeActivities.length > 0 && closedActivities.length > 0 && (
          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-muted-foreground/20" />
            <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Closed</span>
            <div className="h-px flex-1 bg-muted-foreground/20" />
          </div>
        )}

        {/* Closed section */}
        {closedActivities.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {closedActivities.map((activity) => (
                <motion.div
                  key={activity.id}
                  layoutId={activity.id}
                  layout
                  animate={{ opacity: 0.55 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <ActivityCard
                    activity={activity}
                    isClosed={true}
                    onClick={() => navigateToActivity(activity)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </LayoutGroup>
    </div>
  )
}
