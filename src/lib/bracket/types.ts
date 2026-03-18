// Bracket size type -- widened from 4|8|16 to number for Phase 7 non-power-of-two support
// Validation is handled by Zod schema (bracketSizeSchema: 3-128 range)
export type BracketSize = number

// Bracket lifecycle statuses
export type BracketStatus = 'draft' | 'active' | 'paused' | 'completed'

// Bracket type discriminator for all bracket formats
export type BracketType = 'single_elimination' | 'double_elimination' | 'round_robin' | 'predictive' | 'sports'

// Bracket region for double-elimination matchups
export type BracketRegion = 'winners' | 'losers' | 'grand_finals'

// Prediction status for predictive brackets
export type PredictionStatus = 'predictions_open' | 'active' | 'tabulating' | 'previewing' | 'revealing'

// Round-robin configuration types
export type RoundRobinPacing = 'round_by_round' | 'all_at_once'
export type RoundRobinVotingStyle = 'simple' | 'advanced'
export type RoundRobinStandingsMode = 'live' | 'suspenseful'

// Round-robin round structure (output of circle method schedule generation)
export interface RoundRobinRound {
  roundNumber: number
  matchups: Array<{ entrant1Seed: number; entrant2Seed: number }>
}

// Round-robin standings entry
export interface RoundRobinStanding {
  entrantId: string
  entrantName: string
  wins: number
  losses: number
  ties: number
  points: number
  rank: number
}

// Predictive bracket configuration types
export type PredictiveMode = 'simple' | 'advanced'
export type PredictiveResolutionMode = 'manual' | 'vote_based' | 'auto'

// Prediction data (serialized from Prisma Prediction model)
export interface PredictionData {
  id: string
  bracketId: string
  participantId: string
  matchupId: string
  predictedWinnerId: string
  createdAt: string
  updatedAt: string
}

// Prediction scoring result
export interface PredictionScore {
  participantId: string
  participantName: string
  totalPoints: number
  correctPicks: number
  totalPicks: number
  pointsByRound: Record<number, { correct: number; total: number; points: number }>
}

// Tabulation input: a single matchup to resolve via prediction counting
export interface TabulationInput {
  matchupId: string
  round: number
  position: number
  entrant1Id: string | null
  entrant2Id: string | null
  isBye: boolean
  nextMatchupId: string | null
}

// Tabulation result: outcome of prediction counting for a matchup
export interface TabulationResult {
  matchupId: string
  round: number
  position: number
  winnerId: string | null
  entrant1Id: string | null
  entrant2Id: string | null
  entrant1Votes: number
  entrant2Votes: number
  totalVotes: number
  status: 'resolved' | 'tie' | 'no_predictions'
}

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
  showSeedNumbers: boolean
  votingTimerSeconds: number | null
  teacherId: string
  sessionId: string | null
  predictionStatus: string | null
  roundRobinPacing: string | null
  roundRobinVotingStyle: string | null
  roundRobinStandingsMode: string | null
  predictiveMode: string | null
  predictiveResolutionMode: string | null
  playInEnabled: boolean
  maxEntrants: number | null
  revealedUpToRound: number | null
  externalTournamentId: string | null
  dataSource: string | null
  lastSyncAt: string | null
  sportGender: string | null
  finalFourPairing: string | null
  createdAt: string // ISO string for serialization
  updatedAt: string
}

// Serialized entrant data
export interface BracketEntrantData {
  id: string
  name: string
  seedPosition: number
  bracketId: string
  externalTeamId: number | null
  logoUrl: string | null
  abbreviation: string | null
  tournamentSeed: number | null
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
  bracketRegion: string | null
  isBye: boolean
  roundRobinRound: number | null
  externalGameId: number | null
  homeScore: number | null
  awayScore: number | null
  gameStatus: string | null
  gameStartTime: string | null
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

// Extended matchup seed with bye and region data
export interface MatchupSeedWithBye extends MatchupSeed {
  isBye?: boolean
  bracketRegion?: BracketRegion
}

// Double-elimination matchup structure (output of double-elim engine)
export interface DoubleElimMatchups {
  winners: MatchupSeed[]
  losers: MatchupSeed[]
  grandFinals: MatchupSeed[]
}

// Full bracket with relations for detail view
export interface BracketWithDetails extends BracketData {
  entrants: BracketEntrantData[]
  matchups: MatchupData[]
}
