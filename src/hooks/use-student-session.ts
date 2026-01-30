'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PresenceState {
  funName: string
  joinedAt: string
}

/**
 * Supabase Realtime Presence hook for tracking connected students in a session.
 *
 * Subscribes to the `session:{sessionId}` Presence channel and tracks
 * the caller's own presence with their fun name.
 *
 * Used by both teacher roster (to show connected count) and student views.
 *
 * @param sessionId - The class session ID to track
 * @param funName - The fun name to broadcast (use '__teacher__' for teacher view)
 * @returns Connected students list and count
 */
export function useSessionPresence(sessionId: string, funName: string) {
  const [connectedStudents, setConnectedStudents] = useState<PresenceState[]>([])
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const channel = supabase.channel(`session:${sessionId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>()
        const students = Object.values(state).flat()
        setConnectedStudents(students)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            funName,
            joinedAt: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [sessionId, funName, supabase])

  return {
    connectedStudents,
    connectedCount: connectedStudents.length,
  }
}
