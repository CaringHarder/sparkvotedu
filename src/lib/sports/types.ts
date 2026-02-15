/**
 * Sports data provider abstraction layer.
 *
 * Defines domain types for sports tournaments, teams, and games,
 * plus the SportsDataProvider interface that concrete implementations
 * (e.g., SportsDataIO) must satisfy.
 *
 * These types are the internal representation -- raw API response types
 * are isolated within each provider's directory (e.g., sportsdataio/types.ts).
 */

// Gender discriminator for NCAA basketball (men's vs women's tournaments)
export type SportGender = 'mens' | 'womens'

// Tournament status lifecycle
export type TournamentStatus = 'upcoming' | 'active' | 'completed'

// Game status lifecycle
export type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'canceled'

/**
 * A sports tournament (e.g., NCAA March Madness).
 * Represents a single tournament instance within a season.
 */
export interface SportsTournament {
  externalId: string
  name: string
  season: number
  gender: SportGender
  startDate: string
  endDate: string
  teamCount: number
  status: TournamentStatus
}

/**
 * A sports team participating in a tournament.
 * Includes seed and region for bracket positioning.
 */
export interface SportsTeam {
  externalId: number
  name: string
  shortName: string
  abbreviation: string
  logoUrl: string | null
  conference: string
  seed: number | null
  region: string | null
}

/**
 * A single game within a tournament bracket.
 * Contains full state: teams, scores, timing, and bracket position.
 */
export interface SportsGame {
  externalId: number
  tournamentId: string
  round: number
  bracket: string | null
  status: GameStatus
  homeTeam: SportsTeam
  awayTeam: SportsTeam
  homeScore: number | null
  awayScore: number | null
  startTime: string
  isClosed: boolean
  period: string | null
  timeRemaining: string | null
  winnerId: number | null
  displayOrder: number
  previousHomeGameId: number | null
  previousAwayGameId: number | null
}

/**
 * The provider interface that all sports data implementations must satisfy.
 *
 * Designed for NCAA basketball but generic enough for other sports.
 * Each method returns domain types (SportsTournament, SportsGame, etc.),
 * never raw API response types.
 */
export interface SportsDataProvider {
  /** Get all active/upcoming tournaments for the current season. */
  getActiveTournaments(): Promise<SportsTournament[]>

  /** Get all games for a specific tournament and season. */
  getTournamentGames(tournamentId: string, season: number): Promise<SportsGame[]>

  /** Get all games scheduled for a specific date (YYYY-MM-DD). */
  getGamesByDate(date: string): Promise<SportsGame[]>

  /** Get a single game by its external ID. Returns null if not found. */
  getGameById(gameId: number): Promise<SportsGame | null>

  /** Check if any games are currently in progress (for live update polling). */
  areGamesInProgress(): Promise<boolean>
}
