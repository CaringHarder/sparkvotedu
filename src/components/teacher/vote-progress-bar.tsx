'use client'

interface VoteProgressBarProps {
  votedCount: number
  totalCount: number
  isActive: boolean
  label?: string
}

export function VoteProgressBar({
  votedCount,
  totalCount,
  isActive,
  label,
}: VoteProgressBarProps) {
  if (totalCount === 0) return null

  const pct = Math.round((votedCount / totalCount) * 100)
  const allVoted = votedCount >= totalCount && totalCount > 0

  return (
    <div className="rounded-lg border bg-card px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isActive ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-sm font-medium">
            {isActive ? 'Voting' : 'Idle'}
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground tabular-nums">
          {votedCount} of {totalCount} voted ({pct}%)
        </span>
        {allVoted && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
            All voted!
          </span>
        )}
        {label && (
          <>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground">{label}</span>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}
