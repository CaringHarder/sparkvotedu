'use client'

/**
 * Branded empty state shown when no activities are active in a session.
 * This is what students see between activities or when they join early.
 *
 * Uses a spark/lightning motif with a gentle pulse animation for visual interest.
 * Centered layout with warm, encouraging tone.
 *
 * Variants:
 * - 'waiting' (default): "Hang tight!" for when students join before activities exist
 * - 'removed': "No activities right now" for when all activities have been removed
 */

interface EmptyStateProps {
  variant?: 'waiting' | 'removed'
}

export function EmptyState({ variant = 'waiting' }: EmptyStateProps) {
  const heading = variant === 'waiting' ? 'Hang tight!' : 'No activities right now'
  const description =
    variant === 'waiting'
      ? "Your teacher is setting things up. Activities will appear here when they're ready."
      : 'Your teacher will add some soon.'

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="animate-pulse mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        >
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold mb-2">{heading}</h2>
      <p className="text-muted-foreground max-w-sm">
        {description}
      </p>
      <p className="mt-4 text-sm text-muted-foreground/70">
        SparkVotEDU
      </p>
    </div>
  )
}
