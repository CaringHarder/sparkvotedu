/**
 * Raw SportsDataIO API response types.
 *
 * These types match the shape returned by the SportsDataIO REST API v3
 * for NCAA Basketball (CBB and WCBB endpoints). They are NEVER exported
 * beyond the sportsdataio/ directory -- mappers convert them to internal
 * domain types (SportsTournament, SportsTeam, SportsGame).
 *
 * Field names match the API's PascalCase JSON keys exactly.
 */

/**
 * Raw game object from SportsDataIO /Games or /Tournament endpoints.
 * Covers both men's (CBB) and women's (WCBB) NCAA basketball.
 */
export interface SportsDataIOGame {
  GameID: number
  Season: number
  Status: string // 'Scheduled', 'InProgress', 'Final', 'Postponed', 'Canceled', etc.
  DateTime: string | null // ISO 8601 or null for TBD
  HomeTeamID: number
  AwayTeamID: number
  HomeTeamScore: number | null
  AwayTeamScore: number | null
  Period: string | null // e.g., '1st Half', '2nd Half', 'OT'
  TimeRemainingMinutes: number | null
  TimeRemainingSeconds: number | null
  IsClosed: boolean
  TournamentID: number | null
  Bracket: string | null // e.g., 'East', 'West', 'South', 'Midwest'
  Round: number | null
  TournamentDisplayOrder: number | null
  AwayTeamPreviousGameID: number | null
  HomeTeamPreviousGameID: number | null
  HomeTeamName: string | null
  AwayTeamName: string | null
  HomeTeamSeed: number | null
  AwayTeamSeed: number | null
}

/**
 * Raw team object from SportsDataIO /Teams endpoint.
 */
export interface SportsDataIOTeam {
  TeamID: number
  Key: string // e.g., 'DUKE', 'UNC'
  School: string // e.g., 'Duke', 'North Carolina'
  Name: string // e.g., 'Blue Devils', 'Tar Heels'
  ShortDisplayName: string // e.g., 'Duke', 'UNC'
  Conference: string // e.g., 'ACC', 'Big Ten'
  TeamLogoUrl: string | null
}

/**
 * Raw season object from SportsDataIO /CurrentSeason endpoint.
 */
export interface SportsDataIOSeason {
  Season: number
  Description: string
  StartYear: number
  EndYear: number
  PostSeasonStartDate: string | null
  ApiSeason: string // e.g., '2026'
}

/**
 * Raw tournament game schedule from SportsDataIO /Tournament endpoint.
 */
export interface SportsDataIOTournament {
  TournamentID: number
  Season: number
  Name: string
  Location: string | null
  Games: SportsDataIOGame[]
}
