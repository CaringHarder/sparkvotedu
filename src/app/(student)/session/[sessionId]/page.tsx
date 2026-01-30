'use client'

import { useParams } from 'next/navigation'

/**
 * Student session main page.
 *
 * Shows a holding state while the teacher sets up activities.
 * The ActivityGrid from Plan 05 will replace this placeholder
 * content when activity display is implemented.
 *
 * Participant identity is managed by the session layout via
 * localStorage (sparkvotedu_session_{sessionId}).
 */
export default function StudentSessionPage() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId

  // Read participantId from localStorage for future activity grid usage
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

  // Placeholder: will render ActivityGrid in Plan 05
  void participantId

  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="text-4xl">*</div>
        <h2 className="text-xl font-semibold">Hang tight!</h2>
        <p className="text-muted-foreground">
          Your teacher is setting things up.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"
          style={{ animationDelay: '0.2s' }}
        />
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"
          style={{ animationDelay: '0.4s' }}
        />
      </div>

      <p className="text-xs text-muted-foreground">SparkVotEDU</p>
    </div>
  )
}
