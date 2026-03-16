/**
 * ESPN provider implementation of SportsDataProvider.
 *
 * Uses ESPN's free public scoreboard API to fetch NCAA tournament data
 * for both men's and women's basketball. No API key required.
 *
 * Tournament IDs use the convention: 'espn-mens-ncaat' and 'espn-womens-ncaat'
 */

import type { SportGender, SportsDataProvider, SportsGame, SportsTournament } from '../types'
import { ESPNClient } from './client'
import { mapEventToGame, mapEventsToTournament } from './mappers'
import type { ESPNEvent } from './types'

/**
 * Generate tournament date strings (YYYYMMDD) covering known NCAA game dates.
 * Only includes dates when games are actually scheduled (not every day in the window).
 * This reduces API calls from ~23 to ~13, critical for Vercel serverless timeouts.
 */
function getTournamentDates(): string[] {
  const year = new Date().getFullYear()
  const y = String(year)

  // Known tournament game dates (both men's and women's):
  // First Four: Mar 17-19, R1: Mar 19-21, R2: Mar 21-23,
  // Sweet 16: Mar 27-29, Elite 8: Mar 28-30, FF: Apr 4-5, Championship: Apr 6-7
  const monthDays = [
    [3, [17, 18, 19, 20, 21, 22, 23, 27, 28, 29, 30]],
    [4, [4, 5, 6, 7]],
  ] as const

  const dates: string[] = []
  for (const [month, days] of monthDays) {
    for (const day of days) {
      dates.push(`${y}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`)
    }
  }

  return dates
}

/** Get the tournament ID for a given gender. */
function getTournamentId(gender: SportGender): string {
  return gender === 'mens' ? 'espn-mens-ncaat' : 'espn-womens-ncaat'
}

/** Parse gender from a tournament ID string. */
function parseGenderFromTournamentId(tournamentId: string): SportGender {
  return tournamentId.toLowerCase().includes('womens') ? 'womens' : 'mens'
}

/** Format today's date as YYYYMMDD. */
function todayAsYYYYMMDD(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/**
 * Filter events to only tournament games (those with NCAA tournament notes).
 * This excludes NIT, CBI, or other non-tournament games that may appear on the same date.
 */
function isTournamentGame(event: ESPNEvent): boolean {
  const headline = event.competitions[0]?.notes?.[0]?.headline ?? ''
  return headline.toLowerCase().includes('ncaa')
}

export class ESPNProvider implements SportsDataProvider {
  private client: ESPNClient

  constructor(client: ESPNClient) {
    this.client = client
  }

  /**
   * Get active NCAA tournaments for both men's and women's.
   *
   * Fetches all tournament dates to get accurate team/game counts.
   * Returns a SportsTournament for each gender where games are found.
   */
  async getActiveTournaments(): Promise<SportsTournament[]> {
    const tournaments: SportsTournament[] = []
    const genders: SportGender[] = ['mens', 'womens']
    const dates = getTournamentDates()

    for (const gender of genders) {
      try {
        const events = await this.client.fetchScoreboardForDates(gender, dates)
        const tournamentEvents = events.filter(isTournamentGame)

        if (tournamentEvents.length > 0) {
          const tournamentId = getTournamentId(gender)
          tournaments.push(mapEventsToTournament(tournamentEvents, gender, tournamentId))
        }
      } catch (error) {
        console.warn(`ESPN: failed to fetch ${gender} tournament:`, error)
      }
    }

    return tournaments
  }

  /**
   * Get all games for a specific tournament across the full tournament window.
   *
   * Fetches scoreboards for every date in the tournament window (March 17 - April 8),
   * filters to NCAA tournament games, and maps to SportsGame[].
   */
  async getTournamentGames(tournamentId: string, _season: number): Promise<SportsGame[]> {
    const gender = parseGenderFromTournamentId(tournamentId)
    const dates = getTournamentDates()

    const events = await this.client.fetchScoreboardForDates(gender, dates)
    const tournamentEvents = events.filter(isTournamentGame)

    return tournamentEvents.map((event) => mapEventToGame(event, tournamentId))
  }

  /**
   * Get all NCAA tournament games for a specific date across both genders.
   *
   * @param date - Date in YYYY-MM-DD format
   */
  async getGamesByDate(date: string): Promise<SportsGame[]> {
    // Convert YYYY-MM-DD to YYYYMMDD
    const dateCompact = date.replace(/-/g, '')
    const games: SportsGame[] = []

    for (const gender of ['mens', 'womens'] as SportGender[]) {
      try {
        const response = await this.client.fetchScoreboard(gender, dateCompact)
        const tournamentEvents = response.events.filter(isTournamentGame)
        const tournamentId = getTournamentId(gender)

        for (const event of tournamentEvents) {
          games.push(mapEventToGame(event, tournamentId))
        }
      } catch (error) {
        console.warn(`ESPN: failed to fetch ${gender} games for ${date}:`, error)
      }
    }

    return games
  }

  /**
   * Search today's scoreboard for a specific game by ID.
   *
   * ESPN's scoreboard API doesn't support single-game lookup, so we query
   * today's full scoreboard for both genders and search by event ID.
   */
  async getGameById(gameId: number): Promise<SportsGame | null> {
    const today = todayAsYYYYMMDD()
    const gameIdStr = gameId.toString()

    for (const gender of ['mens', 'womens'] as SportGender[]) {
      try {
        const response = await this.client.fetchScoreboard(gender, today)
        const event = response.events.find((e) => e.id === gameIdStr)

        if (event && isTournamentGame(event)) {
          const tournamentId = getTournamentId(gender)
          return mapEventToGame(event, tournamentId)
        }
      } catch (error) {
        console.warn(`ESPN: failed to search for game ${gameId}:`, error)
      }
    }

    return null
  }

  /**
   * Check if any NCAA tournament games are currently in progress.
   *
   * Queries today's scoreboard for both genders and checks for 'in' state.
   */
  async areGamesInProgress(): Promise<boolean> {
    const today = todayAsYYYYMMDD()

    for (const gender of ['mens', 'womens'] as SportGender[]) {
      try {
        const response = await this.client.fetchScoreboard(gender, today)
        const hasLive = response.events.some(
          (e) => e.status.type.state === 'in' && isTournamentGame(e)
        )
        if (hasLive) return true
      } catch (error) {
        console.warn(`ESPN: failed to check live games for ${gender}:`, error)
      }
    }

    return false
  }
}
