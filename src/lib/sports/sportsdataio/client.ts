/**
 * SportsDataIO HTTP client for NCAA Basketball API v3.
 *
 * Handles authentication, base URL selection (men's vs women's),
 * and typed JSON responses. All HTTP interactions with SportsDataIO
 * go through this client -- the provider layer never makes direct
 * fetch calls.
 *
 * API docs: https://sportsdata.io/developers/api-documentation/ncaa-basketball
 */

import type { SportGender } from '../types'
import type {
  SportsDataIOGame,
  SportsDataIOTeam,
  SportsDataIOSeason,
  SportsDataIOTournament,
} from './types'

// SportsDataIO API v3 base URLs
const CBB_BASE = 'https://api.sportsdata.io/v3/cbb' // Men's college basketball
const WCBB_BASE = 'https://api.sportsdata.io/v3/cwbb' // Women's college basketball

/**
 * Low-level HTTP client for the SportsDataIO REST API.
 *
 * Authenticates via the Ocp-Apim-Subscription-Key header.
 * Provides typed methods for each endpoint needed by the provider.
 */
export class SportsDataIOClient {
  private apiKey: string

  constructor({ apiKey }: { apiKey: string }) {
    if (!apiKey) {
      throw new Error('SportsDataIOClient requires an API key')
    }
    this.apiKey = apiKey
  }

  /**
   * Get the base URL for a given gender.
   */
  private getBaseUrl(gender: SportGender): string {
    return gender === 'mens' ? CBB_BASE : WCBB_BASE
  }

  /**
   * Make an authenticated GET request to the SportsDataIO API.
   *
   * @param baseUrl - API base URL (CBB or WCBB)
   * @param endpoint - API endpoint path (e.g., '/scores/json/Games/2026')
   * @returns Parsed JSON response of type T
   */
  private async get<T>(baseUrl: string, endpoint: string): Promise<T> {
    const url = `${baseUrl}${endpoint}`

    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
      },
      // No caching — tournament data changes frequently (Selection Sunday, live scores)
      // and Next.js fetch cache can cause truncated/stale responses
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(
        `SportsDataIO API error: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    return response.json() as Promise<T>
  }

  /**
   * Get the current season info.
   */
  async getCurrentSeason(gender: SportGender): Promise<SportsDataIOSeason> {
    const base = this.getBaseUrl(gender)
    return this.get<SportsDataIOSeason>(base, '/scores/json/CurrentSeason')
  }

  /**
   * Check if any games are currently in progress.
   */
  async areGamesInProgress(gender: SportGender): Promise<boolean> {
    const base = this.getBaseUrl(gender)
    return this.get<boolean>(base, '/scores/json/AreAnyGamesInProgress')
  }

  /**
   * Get the full tournament schedule (games + bracket structure).
   *
   * @param season - Season year (e.g., 2026)
   */
  async getTournament(
    gender: SportGender,
    season: number
  ): Promise<SportsDataIOTournament> {
    const base = this.getBaseUrl(gender)
    return this.get<SportsDataIOTournament>(
      base,
      `/scores/json/Tournament/${season}`
    )
  }

  /**
   * Get all games for a season.
   *
   * @param season - Season year (e.g., 2026)
   */
  async getSchedule(
    gender: SportGender,
    season: number
  ): Promise<SportsDataIOGame[]> {
    const base = this.getBaseUrl(gender)
    return this.get<SportsDataIOGame[]>(base, `/scores/json/Games/${season}`)
  }

  /**
   * Get games for a specific date.
   *
   * @param gender - Men's or women's
   * @param date - Date string in YYYY-MMM-DD format (e.g., '2026-MAR-15')
   */
  async getGamesByDate(
    gender: SportGender,
    date: string
  ): Promise<SportsDataIOGame[]> {
    const base = this.getBaseUrl(gender)
    return this.get<SportsDataIOGame[]>(base, `/scores/json/GamesByDate/${date}`)
  }

  /**
   * Get all teams for the specified gender.
   */
  async getTeams(gender: SportGender): Promise<SportsDataIOTeam[]> {
    const base = this.getBaseUrl(gender)
    return this.get<SportsDataIOTeam[]>(base, '/scores/json/Teams')
  }
}
