/**
 * Team logo URL resolution with fallback.
 *
 * Primary source: SportsDataIO TeamLogoUrl from API response.
 * Fallback: null (component renders team abbreviation text instead).
 *
 * ESPN CDN fallback deferred -- requires SportsDataIO-to-ESPN ID mapping
 * which is not available in the current data model.
 */

/**
 * Resolve the logo URL for a team.
 *
 * @param sportsDataIOLogoUrl - Logo URL from SportsDataIO API response
 * @param teamAbbreviation - Team abbreviation (used for future fallback resolution)
 * @returns Logo URL string or null if no logo available
 */
export function resolveTeamLogoUrl(
  sportsDataIOLogoUrl: string | null,
  teamAbbreviation: string
): string | null {
  // Primary: SportsDataIO TeamLogoUrl from API response
  if (sportsDataIOLogoUrl) return sportsDataIOLogoUrl
  // Fallback: return null, component renders team abbreviation text instead
  // ESPN CDN fallback deferred -- requires SportsDataIO-to-ESPN ID mapping
  void teamAbbreviation // suppress unused warning until fallback implemented
  return null
}
