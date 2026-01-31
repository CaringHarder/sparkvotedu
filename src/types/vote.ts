// Matchup voting lifecycle statuses
export type MatchupStatus = 'pending' | 'voting' | 'decided'

// Bracket viewing mode for student UI
export type ViewingMode = 'simple' | 'advanced'

// Serialized vote data (matches Prisma model shape for client use)
export interface VoteData {
  id: string
  matchupId: string
  participantId: string
  entrantId: string
  createdAt: string // ISO string for serialization
  updatedAt: string
}

// Vote counts per entrant: entrantId -> count
export type VoteCounts = Record<string, number>

// Per-matchup vote state for UI consumption
export interface MatchupVoteState {
  matchupId: string
  voteCounts: VoteCounts
  totalVotes: number
  participantVotedEntrantId: string | null
}
