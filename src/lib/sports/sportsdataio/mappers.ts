/**
 * Pure mapping functions that convert raw SportsDataIO API responses
 * to internal domain types (SportsTournament, SportsTeam, SportsGame).
 *
 * These mappers are the only bridge between raw API types and domain types.
 * They ensure raw SportsDataIO types never leak beyond the sportsdataio/ directory.
 */

import type { SportsGame, SportsTeam, SportsTournament, GameStatus, SportGender } from '../types'
import type { SportsDataIOGame, SportsDataIOTeam, SportsDataIOTournament } from './types'

/**
 * Map a raw SportsDataIO game status string to our internal GameStatus.
 *
 * SportsDataIO uses PascalCase strings: 'Scheduled', 'InProgress', 'Final',
 * 'Postponed', 'Canceled'. We normalize to lowercase snake_case.
 */
export function mapGameStatus(status: string): GameStatus {
  const normalized = status.toLowerCase()

  if (normalized === 'inprogress' || normalized === 'in progress') {
    return 'in_progress'
  }
  if (normalized === 'final' || normalized === 'f' || normalized === 'f/ot') {
    return 'final'
  }
  if (normalized === 'postponed') {
    return 'postponed'
  }
  if (normalized === 'canceled' || normalized === 'cancelled') {
    return 'canceled'
  }

  // Default: scheduled (covers 'Scheduled', unknown statuses)
  return 'scheduled'
}

/**
 * Map a raw SportsDataIO team to an internal SportsTeam.
 *
 * @param raw - Raw team from SportsDataIO /Teams endpoint
 * @param seed - Optional tournament seed (from game data, not team data)
 * @param region - Optional tournament region (from game data)
 */
export function mapTeam(
  raw: SportsDataIOTeam,
  seed?: number | null,
  region?: string | null
): SportsTeam {
  return {
    externalId: raw.TeamID,
    name: raw.School,
    shortName: raw.ShortDisplayName || raw.Key,
    abbreviation: raw.Key,
    logoUrl: raw.TeamLogoUrl ?? null,
    conference: raw.Conference || 'Unknown',
    seed: seed ?? null,
    region: region ?? null,
  }
}

/**
 * Map a raw SportsDataIO game to an internal SportsGame.
 *
 * Requires a pre-built teams map for resolving team IDs to full team objects.
 * If a team is not in the map, a minimal fallback team is constructed from
 * the game's inline team name fields.
 *
 * @param raw - Raw game from SportsDataIO API
 * @param teamsMap - Map of TeamID -> SportsDataIOTeam for team resolution
 */
export function mapGame(
  raw: SportsDataIOGame,
  teamsMap: Map<number, SportsDataIOTeam>
): SportsGame {
  const homeTeamRaw = teamsMap.get(raw.HomeTeamID)
  const awayTeamRaw = teamsMap.get(raw.AwayTeamID)

  const homeTeam: SportsTeam = homeTeamRaw
    ? mapTeam(homeTeamRaw, raw.HomeTeamSeed, raw.Bracket)
    : {
        externalId: raw.HomeTeamID,
        name: raw.HomeTeamName || `Team ${raw.HomeTeamID}`,
        shortName: raw.HomeTeamName || `Team ${raw.HomeTeamID}`,
        abbreviation: '',
        logoUrl: null,
        conference: 'Unknown',
        seed: raw.HomeTeamSeed ?? null,
        region: raw.Bracket ?? null,
      }

  const awayTeam: SportsTeam = awayTeamRaw
    ? mapTeam(awayTeamRaw, raw.AwayTeamSeed, raw.Bracket)
    : {
        externalId: raw.AwayTeamID,
        name: raw.AwayTeamName || `Team ${raw.AwayTeamID}`,
        shortName: raw.AwayTeamName || `Team ${raw.AwayTeamID}`,
        abbreviation: '',
        logoUrl: null,
        conference: 'Unknown',
        seed: raw.AwayTeamSeed ?? null,
        region: raw.Bracket ?? null,
      }

  // Determine winner from scores (when game is closed/final)
  let winnerId: number | null = null
  if (raw.IsClosed && raw.HomeTeamScore !== null && raw.AwayTeamScore !== null) {
    if (raw.HomeTeamScore > raw.AwayTeamScore) {
      winnerId = raw.HomeTeamID
    } else if (raw.AwayTeamScore > raw.HomeTeamScore) {
      winnerId = raw.AwayTeamID
    }
  }

  // Build time remaining string from minutes + seconds
  let timeRemaining: string | null = null
  if (raw.TimeRemainingMinutes !== null && raw.TimeRemainingSeconds !== null) {
    const seconds = raw.TimeRemainingSeconds.toString().padStart(2, '0')
    timeRemaining = `${raw.TimeRemainingMinutes}:${seconds}`
  }

  return {
    externalId: raw.GameID,
    tournamentId: raw.TournamentID?.toString() ?? '',
    round: raw.Round ?? 0,
    bracket: raw.Bracket ?? null,
    status: mapGameStatus(raw.Status),
    homeTeam,
    awayTeam,
    homeScore: raw.HomeTeamScore,
    awayScore: raw.AwayTeamScore,
    startTime: raw.DateTime ?? '',
    isClosed: raw.IsClosed,
    period: raw.Period ?? null,
    timeRemaining,
    winnerId,
    displayOrder: raw.TournamentDisplayOrder ?? 0,
    previousHomeGameId: raw.HomeTeamPreviousGameID ?? null,
    previousAwayGameId: raw.AwayTeamPreviousGameID ?? null,
  }
}

/**
 * Map a raw SportsDataIO tournament to an internal SportsTournament.
 *
 * Tournament status is derived from game statuses:
 * - If any games are in progress -> 'active'
 * - If all games are final -> 'completed'
 * - Otherwise -> 'upcoming'
 */
export function mapTournament(
  raw: SportsDataIOTournament,
  gender: SportGender
): SportsTournament {
  const games = raw.Games ?? []

  // Derive tournament status from game statuses
  const hasInProgress = games.some((g) => g.Status.toLowerCase() === 'inprogress')
  const allFinal = games.length > 0 && games.every((g) => g.IsClosed)

  let status: SportsTournament['status'] = 'upcoming'
  if (hasInProgress) {
    status = 'active'
  } else if (allFinal) {
    status = 'completed'
  } else if (games.some((g) => g.IsClosed)) {
    // Some games finished but not all -> active
    status = 'active'
  }

  // Derive dates from game schedule
  const gameDates = games
    .filter((g) => g.DateTime)
    .map((g) => g.DateTime as string)
    .sort()

  const startDate = gameDates[0] ?? ''
  const endDate = gameDates[gameDates.length - 1] ?? ''

  // Count unique teams (exclude null/undefined IDs — TBD games)
  const teamIds = new Set<number>()
  for (const game of games) {
    if (game.HomeTeamID != null) teamIds.add(game.HomeTeamID)
    if (game.AwayTeamID != null) teamIds.add(game.AwayTeamID)
  }

  return {
    externalId: raw.TournamentID.toString(),
    name: raw.Name,
    season: raw.Season,
    gender,
    startDate,
    endDate,
    teamCount: teamIds.size,
    teamsPopulated: teamIds.size > 0,
    status,
  }
}
