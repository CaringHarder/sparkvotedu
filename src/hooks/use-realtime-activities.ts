'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Activity {
  id: string
  name: string
  type: 'bracket' | 'poll'
  participantCount: number
  hasVoted: boolean
  status: string
}

/**
 * Realtime activity list hook for the student session view.
 *
 * Subscribes to the `activities:{sessionId}` Supabase Realtime channel
 * and refetches activities on any change event.
 *
 * NOTE: Since brackets and polls don't exist yet (Phase 3+), this hook
 * initially always returns an empty array. The hook structure and Supabase
 * channel setup is what matters -- the data source will be connected in
 * future phases when activity tables and API endpoints are created.
 *
 * @param sessionId - The class session ID to watch
 * @param participantId - The student participant ID (for hasVoted check)
 * @returns Activities list and loading state
 */
export function useRealtimeActivities(
  sessionId: string,
  _participantId: string
) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchActivities = useCallback(async () => {
    // Scaffold: activities API doesn't exist yet (Phase 3+).
    // When brackets/polls are built, this will fetch from
    // /api/sessions/${sessionId}/activities or a server action.
    // For now, return empty array to show empty state.
    setActivities([])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchActivities()

    // Subscribe to Supabase Realtime channel for activity updates.
    // Uses broadcast (not postgres_changes) to avoid per-subscriber DB reads
    // in classrooms with 30+ students (see 02-RESEARCH.md Pitfall 5).
    const channel = supabase
      .channel(`activities:${sessionId}`)
      .on('broadcast', { event: 'activity_update' }, () => {
        fetchActivities()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase, fetchActivities])

  return { activities, loading }
}
