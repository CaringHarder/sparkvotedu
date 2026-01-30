'use client'

import { useParams } from 'next/navigation'
import { ActivityGrid } from '@/components/student/activity-grid'

/**
 * Student session main page.
 *
 * Renders the ActivityGrid which shows active brackets/polls,
 * empty state when none are active, and auto-navigates when
 * only one activity is active.
 *
 * Participant identity is managed by the session layout via
 * localStorage (sparkvotedu_session_{sessionId}).
 */
export default function StudentSessionPage() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId

  // Read participantId from localStorage session data
  const participantId =
    typeof window !== 'undefined'
      ? (() => {
          try {
            const stored = localStorage.getItem(
              `sparkvotedu_session_${sessionId}`
            )
            if (stored) {
              return JSON.parse(stored).participantId ?? ''
            }
          } catch {
            // localStorage not available
          }
          return ''
        })()
      : ''

  return (
    <div className="container mx-auto py-6 px-4">
      <ActivityGrid sessionId={sessionId} participantId={participantId} />
    </div>
  )
}
