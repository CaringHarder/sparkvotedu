// Bracket sizes allowed in Phase 3 (single-elimination only)
export type BracketSize = 4 | 8 | 16

// Bracket lifecycle statuses
export type BracketStatus = 'draft' | 'active' | 'completed'

// Serialized bracket data (matches Prisma model shape for client use)
export interface BracketData {
  id: string
  name: string
  description: string | null
  bracketType: string
  size: number
  status: BracketStatus
  viewingMode: string
  showVoteCounts: boolean
  votingTimerSeconds: number | null
  teacherId: string
  sessionId: string | null
  createdAt: string // ISO string for serialization
  updatedAt: string
}

// Serialized entrant data
export interface BracketEntrantData {
  id: string
  name: string
  seedPosition: number
  bracketId: string
}

// Serialized matchup data
export interface MatchupData {
  id: string
  round: number
  position: number
  status: string
  bracketId: string
  entrant1Id: string | null
  entrant2Id: string | null
  winnerId: string | null
  nextMatchupId: string | null
  entrant1: BracketEntrantData | null
  entrant2: BracketEntrantData | null
  winner: BracketEntrantData | null
}

// Input type for bracket engine (before database persistence)
export interface MatchupSeed {
  round: number
  position: number
  entrant1Seed: number | null // seed position of entrant 1 (first round only)
  entrant2Seed: number | null // seed position of entrant 2 (first round only)
  nextMatchupPosition: { round: number; position: number } | null
}

// Full bracket with relations for detail view
export interface BracketWithDetails extends BracketData {
  entrants: BracketEntrantData[]
  matchups: MatchupData[]
}
