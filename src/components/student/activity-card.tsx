'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { Activity } from '@/hooks/use-realtime-activities'

interface ActivityCardProps {
  activity: Activity
  onClick: () => void
}

/**
 * Individual activity card for the student session grid.
 *
 * Displays the activity name, type icon (bracket vs poll), participant count,
 * and a "Voted" indicator if the student has already voted.
 *
 * Responsive: works on mobile (stacked) and desktop (grid).
 */
export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          {activity.type === 'bracket' ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4" />
              <path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{activity.name}</h3>
          <p className="text-sm text-muted-foreground">
            {activity.type === 'bracket' ? 'Bracket' : 'Poll'}
            {' '}&middot;{' '}
            {activity.participantCount} participant
            {activity.participantCount !== 1 ? 's' : ''}
          </p>
        </div>

        {activity.hasVoted && (
          <div className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Voted
          </div>
        )}
      </CardContent>
    </Card>
  )
}
