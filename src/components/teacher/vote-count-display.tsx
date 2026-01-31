'use client'

import type { MatchupStatus } from '@/types/vote'
import type { VoteCounts } from '@/types/vote'

interface VoteCountDisplayProps {
  matchupId: string
  entrant1Name: string
  entrant2Name: string
  entrant1Id: string
  entrant2Id: string
  voteCounts: VoteCounts
  totalVotes: number
  totalParticipants: number
  status: MatchupStatus
}

export function VoteCountDisplay({
  entrant1Name,
  entrant2Name,
  entrant1Id,
  entrant2Id,
  voteCounts,
  totalVotes,
  totalParticipants,
  status,
}: VoteCountDisplayProps) {
  if (status === 'pending') {
    return (
      <div className="flex items-center justify-center py-2">
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Waiting
        </span>
      </div>
    )
  }

  if (status === 'decided') {
    // Determine winner
    const entrant1Votes = voteCounts[entrant1Id] ?? 0
    const entrant2Votes = voteCounts[entrant2Id] ?? 0
    const winnerName = entrant1Votes >= entrant2Votes ? entrant1Name : entrant2Name

    return (
      <div className="flex items-center gap-2 py-2">
        <svg
          className="h-4 w-4 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className="text-sm font-semibold text-green-700">{winnerName}</span>
        <span className="text-xs text-muted-foreground">
          ({entrant1Votes} - {entrant2Votes})
        </span>
      </div>
    )
  }

  // Status: voting -- show progress bars
  const entrant1Votes = voteCounts[entrant1Id] ?? 0
  const entrant2Votes = voteCounts[entrant2Id] ?? 0

  // Calculate percentages for bar widths
  const maxVotes = Math.max(entrant1Votes + entrant2Votes, 1) // avoid division by zero
  const entrant1Pct = (entrant1Votes / maxVotes) * 100
  const entrant2Pct = (entrant2Votes / maxVotes) * 100

  const allVoted = totalParticipants > 0 && totalVotes >= totalParticipants

  return (
    <div className="space-y-1.5">
      {/* Entrant 1 bar */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between text-xs">
          <span className="truncate font-medium">{entrant1Name}</span>
          <span className="ml-1 text-muted-foreground">{entrant1Votes}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${entrant1Pct}%` }}
          />
        </div>
      </div>

      {/* Entrant 2 bar */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between text-xs">
          <span className="truncate font-medium">{entrant2Name}</span>
          <span className="ml-1 text-muted-foreground">{entrant2Votes}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-500"
            style={{ width: `${entrant2Pct}%` }}
          />
        </div>
      </div>

      {/* Participation fraction */}
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-xs text-muted-foreground">
          {totalVotes}/{totalParticipants} voted
        </span>
        {allVoted && (
          <span className="animate-in fade-in rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            All voted!
          </span>
        )}
      </div>
    </div>
  )
}
