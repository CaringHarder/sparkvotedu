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
   * Queries dates in parallel batches of 5 to balance speed vs rate limits.
   * Individual date failures are logged and skipped (the batch continues).
   *
   * @param gender - 'mens' or 'womens'
   * @param dates - Array of dates in YYYYMMDD format
   * @returns Deduplicated array of ESPN events
   */
  async fetchScoreboardForDates(gender: SportGender, dates: string[]): Promise<ESPNEvent[]> {
    const seenIds = new Set<string>()
    const events: ESPNEvent[] = []
    const BATCH_SIZE = 5

    for (let i = 0; i < dates.length; i += BATCH_SIZE) {
      const batch = dates.slice(i, i + BATCH_SIZE)

      const results = await Promise.allSettled(
        batch.map((date) => this.fetchScoreboard(gender, date))
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const event of result.value.events) {
            if (!seenIds.has(event.id)) {
              seenIds.add(event.id)
              events.push(event)
            }
          }
        }
        // Rejected results are silently skipped (empty dates are common)
      }

      // Small delay between batches to be respectful
      if (i + BATCH_SIZE < dates.length) {
        await delay(100)
      }
    }

    return events
  }
}
