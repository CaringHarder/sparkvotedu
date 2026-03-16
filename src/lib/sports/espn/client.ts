/**
 * ESPN HTTP client for NCAA basketball scoreboard data.
 *
 * Uses ESPN's free public scoreboard API -- no API key required.
 * Queries are date-based: one request per date per gender.
 */

import type { SportGender } from '../types'
import type { ESPNScoreboardResponse, ESPNEvent } from './types'

const BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball'

/** Map our gender type to ESPN's sport path segment. */
function getSportPath(gender: SportGender): string {
  return gender === 'mens' ? 'mens-college-basketball' : 'womens-college-basketball'
}

/** Pause execution for the given number of milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class ESPNClient {
  /**
   * Fetch the scoreboard for a single date and gender.
   *
   * @param gender - 'mens' or 'womens'
   * @param date - Date in YYYYMMDD format
   * @returns Parsed scoreboard response
   */
  async fetchScoreboard(gender: SportGender, date: string): Promise<ESPNScoreboardResponse> {
    const sport = getSportPath(gender)
    const url = `${BASE_URL}/${sport}/scoreboard?groups=100&dates=${date}&limit=100`

    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status} ${response.statusText} for ${url}`)
    }

    const data = (await response.json()) as ESPNScoreboardResponse
    return data
  }

  /**
   * Fetch scoreboards across multiple dates, collecting and deduplicating events.
   *
   * Queries each date sequentially with a 150ms delay between requests
   * to be respectful of ESPN's servers. Individual date failures are logged
   * and skipped (the batch continues).
   *
   * @param gender - 'mens' or 'womens'
   * @param dates - Array of dates in YYYYMMDD format
   * @returns Deduplicated array of ESPN events
   */
  async fetchScoreboardForDates(gender: SportGender, dates: string[]): Promise<ESPNEvent[]> {
    const seenIds = new Set<string>()
    const events: ESPNEvent[] = []

    for (let i = 0; i < dates.length; i++) {
      try {
        const response = await this.fetchScoreboard(gender, dates[i])

        for (const event of response.events) {
          if (!seenIds.has(event.id)) {
            seenIds.add(event.id)
            events.push(event)
          }
        }
      } catch (error) {
        console.warn(`ESPN: failed to fetch ${gender} scoreboard for ${dates[i]}:`, error)
        // Continue with remaining dates
      }

      // Rate-limit: 150ms delay between requests
      if (i < dates.length - 1) {
        await delay(150)
      }
    }

    return events
  }
}
