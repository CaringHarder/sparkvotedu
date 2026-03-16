/**
 * Raw ESPN API response types matching the scoreboard endpoint shape.
 *
 * These types mirror the actual JSON returned by:
 *   https://site.api.espn.com/apis/site/v2/sports/basketball/{sport}/scoreboard
 *
 * Only the fields we consume are typed -- ESPN returns more data than we need.
 */

/** Top-level scoreboard response. */
export interface ESPNScoreboardResponse {
  events: ESPNEvent[]
}

/** A single game event on the scoreboard. */
export interface ESPNEvent {
  id: string // game ID as string, e.g. "401856478"
  name: string // "Duke Blue Devils at Michigan State Spartans"
  shortName: string // "DUKE VS MSU"
  status: {
    type: {
      id: string
      name: string // "STATUS_SCHEDULED", "STATUS_IN_PROGRESS", "STATUS_FINAL"
      state: 'pre' | 'in' | 'post'
      completed: boolean
    }
  }
  competitions: ESPNCompetition[]
}

/** A competition within an event (typically one per event). */
export interface ESPNCompetition {
  date: string // ISO date string
  venue?: { fullName: string }
  tournamentId?: string
  notes: Array<{ type: string; headline: string }>
  competitors: ESPNCompetitor[]
}

/** A competitor (team) in a competition. */
export interface ESPNCompetitor {
  team: {
    id: string
    displayName: string
    shortDisplayName: string
    abbreviation: string
    logo: string // ESPN CDN URL
  }
  curatedRank?: { current: number } // The tournament seed -- undefined for non-ranked / TBD teams
  homeAway: 'home' | 'away'
  score: string // "0", "72", "" (empty for pre-game)
  winner?: boolean
}
