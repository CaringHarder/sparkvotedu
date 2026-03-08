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
  const [transport, setTransport] = useState<'websocket' | 'polling'>('websocket')
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

    let wsConnected = false
    let pollInterval: ReturnType<typeof setInterval> | null = null

    // Subscribe to Supabase Realtime channel for activity updates.
    // Uses broadcast (not postgres_changes) to avoid per-subscriber DB reads
    // in classrooms with 30+ students (see 02-RESEARCH.md Pitfall 5).
    const channel = supabase
      .channel(`activities:${sessionId}`)
      .on('broadcast', { event: 'activity_update' }, () => {
        fetchActivities()
      })
      .subscribe((status) => {
        // Refetch on reconnect to catch missed events during outage
        if (status === 'SUBSCRIBED') {
          wsConnected = true
          fetchActivities()
        }
      })

    // Fall back to HTTP polling if WebSocket fails to connect within 5 seconds
    const wsTimeout = setTimeout(() => {
      if (!wsConnected) {
        setTransport('polling')
        fetchActivities()
        pollInterval = setInterval(fetchActivities, 3000)
      }
    }, 5000)

    // Refetch when tab regains focus to catch missed deletions while backgrounded
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchActivities()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearTimeout(wsTimeout)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [sessionId, supabase, fetchActivities])

  return { activities, loading, transport }
}
