'use client'

import { useState } from 'react'

/**
 * Stub hook for session presence tracking.
 * Will be fully implemented in Phase 4 (real-time/WebSocket).
 * Currently returns empty data to satisfy the import.
 */
export function useSessionPresence(
  _sessionId: string,
  _participantIdentifier: string
) {
  const [connectedStudents] = useState<
    { funName: string; participantId: string }[]
  >([])

  return {
    connectedStudents,
    connectedCount: connectedStudents.length,
  }
}
