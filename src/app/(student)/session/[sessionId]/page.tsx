'use client'

import { useParams } from 'next/navigation'
import { getSessionParticipant } from '@/lib/student/session-store'
import { ActivityGrid } from '@/components/student/activity-grid'

/**
 * Student session main page.
 *
 * Renders the ActivityGrid which shows active brackets/polls,
 * empty state when none are active, and auto-navigates when
 * only one activity is active.
 *
 * Participant identity is managed by the session layout via
 * sessionStorage (per-tab, sparkvotedu_session_{sessionId}).
 */
export default function StudentSessionPage() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId

  // Read participantId from sessionStorage session data (per-tab)
  const stored = typeof window !== 'undefined' ? getSessionParticipant(sessionId) : null
  const participantId = stored?.participantId ?? ''

  return (
    <div className="container mx-auto py-6 px-4">
      <ActivityGrid sessionId={sessionId} participantId={participantId} />
    </div>
  )
}
