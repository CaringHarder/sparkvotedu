/**
 * Sports data provider factory.
 *
 * Returns a cached singleton instance of the configured sports data provider.
 * Currently supports SportsDataIO as the only provider implementation.
 *
 * Usage:
 *   const provider = getProvider()
 *   const tournaments = await provider.getActiveTournaments()
 */

import type { SportsDataProvider } from './types'
import { SportsDataIOClient } from './sportsdataio/client'
import { SportsDataIOProvider } from './sportsdataio/provider'

// Cached singleton -- created once per process lifetime
let cachedProvider: SportsDataProvider | null = null

/**
 * Get the sports data provider singleton.
 *
 * Reads SPORTSDATAIO_API_KEY from the environment on first call.
 * Throws if the API key is not configured.
 *
 * @returns The configured SportsDataProvider instance
 */
export function getProvider(): SportsDataProvider {
  if (cachedProvider) {
    return cachedProvider
  }

  const apiKey = process.env.SPORTSDATAIO_API_KEY
  if (!apiKey) {
    throw new Error(
      'SPORTSDATAIO_API_KEY environment variable is required. ' +
      'Sign up at https://sportsdata.io/free-trial to get an API key.'
    )
  }

  const client = new SportsDataIOClient({ apiKey })
  cachedProvider = new SportsDataIOProvider(client)

  return cachedProvider
}
