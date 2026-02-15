/**
 * SportsDataIO implementation of the SportsDataProvider interface.
 *
 * Translates between the SportsDataIO REST API (via SportsDataIOClient)
 * and the internal sports domain types. All raw API types are mapped to
 * domain types before returning -- raw types never escape this module.
 *
 * Currently implements NCAA Men's Basketball (CBB). The client supports
 * WCBB as well, which can be exposed through getActiveTournaments in the future.
 */

import type { SportsDataProvider, SportsGame, SportsTournament } from '../types'
import type { SportsDataIOTeam } from './types'
import { SportsDataIOClient } from './client'
import { mapGame, mapTournament } from './mappers'

export class SportsDataIOProvider implements SportsDataProvider {
  private client: SportsDataIOClient

  constructor(client: SportsDataIOClient) {
    this.client = client
  }

  /**
   * Build a teams lookup map for efficient game mapping.
   * Fetches teams for both men's and women's, keyed by TeamID.
   */
  private async buildTeamsMap(
    gender: 'mens' | 'womens' = 'mens'
  ): Promise<Map<number, SportsDataIOTeam>> {
    const teams = await this.client.getTeams(gender)
    const map = new Map<number, SportsDataIOTeam>()
    for (const team of teams) {
      map.set(team.TeamID, team)
    }
    return map
  }

  /**
   * Get active and upcoming NCAA basketball tournaments.
   *
   * Fetches the current season's tournament for both men's and women's
   * divisions and returns them as SportsTournament domain objects.
   */
  async getActiveTournaments(): Promise<SportsTournament[]> {
    const tournaments: SportsTournament[] = []

    // Fetch men's tournament
    try {
      const mensSeason = await this.client.getCurrentSeason('mens')
      const mensTournament = await this.client.getTournament(
        'mens',
        mensSeason.Season
      )
      tournaments.push(mapTournament(mensTournament, 'mens'))
    } catch (error) {
      // Tournament data may not be available yet for the season
      console.warn('Failed to fetch mens tournament:', error)
    }

    // Fetch women's tournament
    try {
      const womensSeason = await this.client.getCurrentSeason('womens')
      const womensTournament = await this.client.getTournament(
        'womens',
        womensSeason.Season
      )
      tournaments.push(mapTournament(womensTournament, 'womens'))
    } catch (error) {
      console.warn('Failed to fetch womens tournament:', error)
    }

    return tournaments
  }

  /**
   * Get all games for a specific tournament and season.
   *
   * Fetches the tournament schedule, builds a teams map, and maps
   * all games to domain objects.
   */
  async getTournamentGames(
    tournamentId: string,
    season: number
  ): Promise<SportsGame[]> {
    // Determine gender from tournament ID convention or try both
    // For now, try men's first, fall back to women's
    let rawTournament = await this.client.getTournament('mens', season)
    let gender: 'mens' | 'womens' = 'mens'

    if (rawTournament.TournamentID.toString() !== tournamentId) {
      rawTournament = await this.client.getTournament('womens', season)
      gender = 'womens'
    }

    const teamsMap = await this.buildTeamsMap(gender)
    const games = rawTournament.Games ?? []

    return games.map((game) => mapGame(game, teamsMap))
  }

  /**
   * Get all games scheduled for a specific date.
   *
   * SportsDataIO expects dates in YYYY-MMM-DD format (e.g., '2026-MAR-15').
   * This method accepts YYYY-MM-DD and converts automatically.
   */
  async getGamesByDate(date: string): Promise<SportsGame[]> {
    // Convert YYYY-MM-DD to SportsDataIO format YYYY-MMM-DD
    const apiDate = formatDateForApi(date)

    // Fetch games from both men's and women's
    const [mensGames, womensGames, mensTeams, womensTeams] = await Promise.all([
      this.client.getGamesByDate('mens', apiDate),
      this.client.getGamesByDate('womens', apiDate),
      this.buildTeamsMap('mens'),
      this.buildTeamsMap('womens'),
    ])

    const mapped: SportsGame[] = [
      ...mensGames.map((g) => mapGame(g, mensTeams)),
      ...womensGames.map((g) => mapGame(g, womensTeams)),
    ]

    return mapped
  }

  /**
   * Get a single game by its external ID.
   *
   * Searches the current season's schedule for both men's and women's.
   * Returns null if not found.
   */
  async getGameById(gameId: number): Promise<SportsGame | null> {
    // Try men's first
    try {
      const mensSeason = await this.client.getCurrentSeason('mens')
      const mensGames = await this.client.getSchedule('mens', mensSeason.Season)
      const found = mensGames.find((g) => g.GameID === gameId)
      if (found) {
        const teamsMap = await this.buildTeamsMap('mens')
        return mapGame(found, teamsMap)
      }
    } catch {
      // Continue to women's
    }

    // Try women's
    try {
      const womensSeason = await this.client.getCurrentSeason('womens')
      const womensGames = await this.client.getSchedule(
        'womens',
        womensSeason.Season
      )
      const found = womensGames.find((g) => g.GameID === gameId)
      if (found) {
        const teamsMap = await this.buildTeamsMap('womens')
        return mapGame(found, teamsMap)
      }
    } catch {
      // Game not found in either division
    }

    return null
  }

  /**
   * Check if any NCAA basketball games are currently in progress.
   *
   * Checks both men's and women's divisions.
   */
  async areGamesInProgress(): Promise<boolean> {
    const [mensInProgress, womensInProgress] = await Promise.all([
      this.client.areGamesInProgress('mens').catch(() => false),
      this.client.areGamesInProgress('womens').catch(() => false),
    ])

    return mensInProgress || womensInProgress
  }
}

/**
 * Convert a YYYY-MM-DD date to SportsDataIO's expected YYYY-MMM-DD format.
 *
 * @example formatDateForApi('2026-03-15') => '2026-MAR-15'
 */
function formatDateForApi(date: string): string {
  const months = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ]

  const parts = date.split('-')
  if (parts.length !== 3) return date

  const monthIndex = parseInt(parts[1], 10) - 1
  if (monthIndex < 0 || monthIndex > 11) return date

  return `${parts[0]}-${months[monthIndex]}-${parts[2]}`
}
