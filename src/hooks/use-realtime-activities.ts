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
 * Fetches activities from /api/sessions/{sessionId}/activities and
 * subscribes to the `activities:{sessionId}` Supabase Realtime channel
 * for live updates when brackets are activated, advanced, or completed.
 *
 * @param sessionId - The class session ID to watch
 * @param participantId - The student participant ID (for hasVoted check)
 * @returns Activities list and loading state
 */
export function useRealtimeActivities(
  sessionId: string,
  participantId: string
) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchActivities = useCallback(async () => {
    try {
      const url = `/api/sessions/${sessionId}/activities${
        participantId ? `?pid=${encodeURIComponent(participantId)}` : ''
      }`
      const res = await fetch(url)
      if (res.ok) {
        const data: Activity[] = await res.json()
        setActivities(data)
      } else {
        setActivities([])
      }
    } catch {
      // Network error -- keep previous state, will retry on next broadcast
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [sessionId, participantId])

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
