'use client'

import { useParams } from 'next/navigation'
import { ActivityGrid } from '@/components/student/activity-grid'

/**
 * Student session view page.
 *
 * Renders the ActivityGrid which shows active brackets/polls,
 * empty state when none are active, and auto-navigates when
 * only one activity is active.
 *
 * The participantId is stored in localStorage and passed to
 * the ActivityGrid for real-time subscription and vote status.
 *
 * NOTE: This is a scaffold. The full session page with participant
 * identity management will be built in plan 02-04. This page
 * focuses on the activity grid display.
 */
export default function StudentSessionPage() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId

  // Participant ID would come from localStorage or session context.
  // For now, use a placeholder that will be replaced when 02-04
  // builds the full join flow and session context.
  const participantId =
    typeof window !== 'undefined'
      ? localStorage.getItem('sparkvotedu_participant_id') ?? ''
      : ''

  return (
    <div className="container mx-auto py-6 px-4">
      <ActivityGrid sessionId={sessionId} participantId={participantId} />
    </div>
  )
}
