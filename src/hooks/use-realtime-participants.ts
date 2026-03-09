'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Participant = {
  id: string
  funName: string
  firstName?: string
  emoji?: string | null
  lastInitial?: string | null
}

/**
 * Real-time participant list hook.
 *
 * Subscribes to the `activities:{sessionId}` Supabase Broadcast channel
 * (using a unique channel name to avoid conflicts with useRealtimePoll).
 * On `participant_joined` events, refetches the participant list from the API.
 *
 * Returns the current participants array and a set of newly-joined IDs
 * (for highlight animation, cleared after 2 seconds).
 */
export function useRealtimeParticipants(
  sessionId: string | null,
  initialParticipants: Participant[]
) {
  const supabase = useMemo(() => createClient(), [])
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [newParticipantIds, setNewParticipantIds] = useState<Set<string>>(new Set())

  // Track previous participant IDs to detect new ones
  const prevIdsRef = useRef<Set<string>>(new Set(initialParticipants.map((p) => p.id)))

  // Stable fetch function via ref to avoid stale closures
  const fetchRef = useRef<(() => Promise<void>) | null>(null)
  fetchRef.current = async () => {
    if (!sessionId) return
    try {
      const res = await fetch(`/api/sessions/${sessionId}/participants`)
      if (!res.ok) return
      const data = await res.json()
      const newList: Participant[] = data.participants

      // Detect newly added participants
      const prevIds = prevIdsRef.current
      const addedIds = new Set<string>()
      for (const p of newList) {
        if (!prevIds.has(p.id)) {
          addedIds.add(p.id)
        }
      }

      // Update prev IDs ref
      prevIdsRef.current = new Set(newList.map((p) => p.id))

      setParticipants(newList)

      if (addedIds.size > 0) {
        setNewParticipantIds((prev) => {
          const merged = new Set(prev)
          for (const id of addedIds) merged.add(id)
          return merged
        })

        // Clear highlight after 2 seconds
        setTimeout(() => {
          setNewParticipantIds((prev) => {
            const next = new Set(prev)
            for (const id of addedIds) next.delete(id)
            return next
          })
        }, 2000)
      }
    } catch {
      // Non-fatal -- will retry on next event
    }
  }

  const doFetch = useCallback(() => {
    fetchRef.current?.()
  }, [])

  useEffect(() => {
    if (!sessionId) return

    // Use a dedicated channel to avoid conflicts with useRealtimePoll's
    // subscription to activities:{sessionId}. broadcastParticipantJoined
    // sends to both channels.
    const channel = supabase
      .channel(`participant-sidebar:${sessionId}`)
      .on('broadcast', { event: 'participant_joined' }, () => {
        doFetch()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase, doFetch])

  // Sync with new initial participants (e.g. parent re-render)
  useEffect(() => {
    setParticipants(initialParticipants)
    prevIdsRef.current = new Set(initialParticipants.map((p) => p.id))
  }, [initialParticipants])

  return { participants, newParticipantIds }
}
