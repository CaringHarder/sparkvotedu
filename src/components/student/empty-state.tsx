'use client'

/**
 * Branded empty state shown when no activities are active in a session.
 * This is what students see between activities or when they join early.
 *
 * Uses a spark/lightning motif with a gentle pulse animation for visual interest.
 * Centered layout with warm, encouraging tone.
 */
export function EmptyState() {
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
      <h2 className="text-2xl font-bold mb-2">Hang tight!</h2>
      <p className="text-muted-foreground max-w-sm">
        Your teacher is setting things up. Activities will appear here when
        they&apos;re ready.
      </p>
      <p className="mt-4 text-sm text-muted-foreground/70">
        SparkVotEDU
      </p>
    </div>
  )
}
