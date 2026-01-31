'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * WebSocket fallback detection hook for school networks.
 *
 * Attempts to establish a Supabase Realtime WebSocket connection. If the
 * channel does not reach SUBSCRIBED status within 5 seconds, automatically
 * switches to HTTP polling at the specified interval.
 *
 * This ensures the app works on school networks that block WebSocket
 * connections while providing the best experience where WebSocket is available.
 *
 * @param bracketId - The bracket ID to subscribe/poll
 * @param onData - Callback invoked with bracket state data on each poll
 * @param pollIntervalMs - Polling interval in ms (default 3000)
 */
export function useTransportFallback(
  bracketId: string,
  onData: (data: unknown) => void,
  pollIntervalMs = 3000
) {
  const supabase = useMemo(() => createClient(), [])
  const [transport, setTransport] = useState<'websocket' | 'polling'>('websocket')

  // Refs for cleanup
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const onDataRef = useRef(onData)

  // Keep onData ref current without triggering effect re-runs
  onDataRef.current = onData

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/brackets/${bracketId}/state`)
      if (res.ok) {
        const data = await res.json()
        onDataRef.current(data)
      }
    } catch {
      // Fetch failure is non-fatal -- will retry on next interval
    }
  }, [bracketId])

  const switchToPolling = useCallback(() => {
    setTransport('polling')

    // Clean up WebSocket channel if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Immediately fetch once on switch
    fetchState()

    // Start polling interval
    pollIntervalRef.current = setInterval(fetchState, pollIntervalMs)
  }, [supabase, fetchState, pollIntervalMs])

  useEffect(() => {
    // Attempt WebSocket connection
    const channel = supabase
      .channel(`bracket:${bracketId}`)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // WebSocket connected successfully -- clear the fallback timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
        }
      })

    channelRef.current = channel

    // Set 5-second timeout for WebSocket connection
    timeoutRef.current = setTimeout(() => {
      // If we get here, WebSocket did not connect in time
      switchToPolling()
    }, 5000)

    return () => {
      // Cleanup: remove channel, clear intervals and timeouts
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [bracketId, supabase, switchToPolling])

  return { transport, switchToPolling }
}
