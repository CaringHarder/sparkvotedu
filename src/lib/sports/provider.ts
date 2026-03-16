/**
 * Sports data provider factory.
 *
 * Returns a cached singleton instance of the configured sports data provider.
 * Defaults to ESPN (free, no API key needed). Set SPORTS_PROVIDER=sportsdataio
 * to use SportsDataIO instead (requires SPORTSDATAIO_API_KEY).
 *
 * Usage:
 *   const provider = getProvider()
 *   const tournaments = await provider.getActiveTournaments()
 */

import type { SportsDataProvider } from './types'
import { SportsDataIOClient } from './sportsdataio/client'
import { SportsDataIOProvider } from './sportsdataio/provider'
import { ESPNClient } from './espn/client'
import { ESPNProvider } from './espn/provider'

// Cached singleton -- created once per process lifetime
let cachedProvider: SportsDataProvider | null = null

/**
 * Get the name of the active sports data provider.
 *
 * Reads SPORTS_PROVIDER env var. Defaults to 'espn' if not set.
 * Used by the DAL to record dataSource on created brackets.
 */
export function getProviderName(): string {
  return process.env.SPORTS_PROVIDER ?? 'espn'
}

/**
 * Get the sports data provider singleton.
 *
 * ESPN (default): No configuration needed -- uses free public API.
 * SportsDataIO: Set SPORTS_PROVIDER=sportsdataio and SPORTSDATAIO_API_KEY.
 *
 * @returns The configured SportsDataProvider instance
 */
export function getProvider(): SportsDataProvider {
  if (cachedProvider) {
    return cachedProvider
  }

  const providerType = getProviderName()

  if (providerType === 'sportsdataio') {
    const apiKey = process.env.SPORTSDATAIO_API_KEY
    if (!apiKey) {
      throw new Error(
        'SPORTSDATAIO_API_KEY environment variable is required when SPORTS_PROVIDER=sportsdataio. ' +
        'Sign up at https://sportsdata.io/free-trial to get an API key.'
      )
    }
    const client = new SportsDataIOClient({ apiKey })
    cachedProvider = new SportsDataIOProvider(client)
  } else {
    // ESPN provider -- no API key needed
    const client = new ESPNClient()
    cachedProvider = new ESPNProvider(client)
  }

  return cachedProvider
}
