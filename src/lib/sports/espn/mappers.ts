/**
 * Pure mapping functions for converting ESPN API data to domain types.
 *
 * All functions are stateless -- they take ESPN raw types and return
 * our internal SportsGame / SportsTournament / SportsTeam types.
 */

import type { GameStatus, SportGender, SportsGame, SportsTeam, SportsTournament, TournamentStatus } from '../types'
import type { ESPNEvent, ESPNCompetitor } from './types'

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

/** Map ESPN event state to our GameStatus enum. */
export function mapEventStatus(event: ESPNEvent): GameStatus {
  const { state, completed } = event.status.type

  if (state === 'in') return 'in_progress'
  if (state === 'post' && completed) return 'final'
  return 'scheduled'
}

// ---------------------------------------------------------------------------
// Round parsing
// ---------------------------------------------------------------------------

/** Parse the tournament round number from an ESPN notes headline. */
export function parseRoundFromHeadline(headline: string): number {
  const h = headline.toLowerCase()

  if (h.includes('first four')) return 0
  if (h.includes('1st round')) return 1
  if (h.includes('2nd round')) return 2
  if (h.includes('sweet 16') || h.includes('regional semifinal')) return 3
  if (h.includes('elite eight') || h.includes('elite 8') || h.includes('regional final')) return 4
  if (h.includes('final four') && !h.includes('national championship')) return 5
  if (h.includes('national championship')) return 6

  return 0
}

// ---------------------------------------------------------------------------
// Region parsing
// ---------------------------------------------------------------------------

/** Parse the bracket region from an ESPN notes headline. */
export function parseRegionFromHeadline(headline: string): string | null {
  // Named regions (men's)
  const namedRegion = headline.match(/(East|West|South|Midwest)\s+Region/i)
  if (namedRegion) return namedRegion[1]

  // Women's regional format: "Regional 1 in Albany" etc
  const numberedRegion = headline.match(/Regional\s+(\d)/i)
  if (numberedRegion) return `Regional ${numberedRegion[1]}`

  // Final Four / Championship
  const h = headline.toLowerCase()
  if (h.includes('final four') || h.includes('national championship')) return 'Final Four'

  return null
}

// ---------------------------------------------------------------------------
// Display order
// ---------------------------------------------------------------------------

const REGION_INDEX: Record<string, number> = {
  East: 0,
  West: 1,
  South: 2,
  Midwest: 3,
  'Regional 1': 0,
  'Regional 2': 1,
  'Regional 3': 2,
  'Regional 4': 3,
  'Final Four': 4,
}

/**
 * Compute a numeric display order for sorting matchups.
 * Encodes round, region, and seed into a single integer.
 */
export function computeDisplayOrder(
  round: number,
  region: string | null,
  seed1: number,
  seed2: number
): number {
  const regionIdx = region ? (REGION_INDEX[region] ?? 5) : 5
  return round * 10000 + regionIdx * 1000 + Math.min(seed1, seed2)
}

// ---------------------------------------------------------------------------
// Competitor -> SportsTeam
// ---------------------------------------------------------------------------

function mapCompetitorToTeam(
  competitor: ESPNCompetitor,
  region: string | null
): SportsTeam {
  const seed = competitor.curatedRank?.current
  // Filter out seed 99 (TBD placeholder) -- treat as no seed
  const normalizedSeed = seed !== undefined && seed < 99 ? seed : null

  return {
    externalId: parseInt(competitor.team.id, 10),
    name: competitor.team.displayName,
    shortName: competitor.team.shortDisplayName,
    abbreviation: competitor.team.abbreviation,
    logoUrl: competitor.team.logo || null,
    conference: '', // ESPN scoreboard does not include conference
    seed: normalizedSeed,
    region,
  }
}

// ---------------------------------------------------------------------------
// Event -> SportsGame
// ---------------------------------------------------------------------------

/** Map a single ESPN event to our SportsGame domain type. */
export function mapEventToGame(event: ESPNEvent, tournamentId: string): SportsGame {
  const competition = event.competitions[0]
  if (!competition) {
    throw new Error(`ESPN event ${event.id} has no competitions`)
  }

  const headline = competition.notes?.[0]?.headline ?? ''
  const round = parseRoundFromHeadline(headline)
  const region = parseRegionFromHeadline(headline)
  const status = mapEventStatus(event)

  const homeCompetitor = competition.competitors.find((c) => c.homeAway === 'home')
  const awayCompetitor = competition.competitors.find((c) => c.homeAway === 'away')

  if (!homeCompetitor || !awayCompetitor) {
    throw new Error(`ESPN event ${event.id} missing home or away competitor`)
  }

  const homeTeam = mapCompetitorToTeam(homeCompetitor, region)
  const awayTeam = mapCompetitorToTeam(awayCompetitor, region)

  // Parse scores -- empty string or NaN becomes null
  const homeScore = homeCompetitor.score ? (parseInt(homeCompetitor.score, 10) || null) : null
  const awayScore = awayCompetitor.score ? (parseInt(awayCompetitor.score, 10) || null) : null

  // Determine winner
  let winnerId: number | null = null
  if (event.status.type.completed) {
    if (homeCompetitor.winner) winnerId = homeTeam.externalId
    else if (awayCompetitor.winner) winnerId = awayTeam.externalId
  }

  return {
    externalId: parseInt(event.id, 10),
    tournamentId,
    round,
    bracket: region,
    status,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    startTime: competition.date,
    isClosed: event.status.type.completed,
    period: null,
    timeRemaining: null,
    winnerId,
    displayOrder: computeDisplayOrder(round, region, homeTeam.seed ?? 0, awayTeam.seed ?? 0),
    previousHomeGameId: null,
    previousAwayGameId: null,
  }
}

// ---------------------------------------------------------------------------
// Events -> SportsTournament
// ---------------------------------------------------------------------------

/** Build a SportsTournament summary from a collection of ESPN events. */
export function mapEventsToTournament(
  events: ESPNEvent[],
  gender: SportGender,
  tournamentId: string
): SportsTournament {
  // Collect unique teams
  const teamIds = new Set<string>()
  const dates: string[] = []

  for (const event of events) {
    const competition = event.competitions[0]
    if (!competition) continue

    dates.push(competition.date)

    for (const competitor of competition.competitors) {
      teamIds.add(competitor.team.id)
    }
  }

  // Sort dates to find start/end
  dates.sort()

  // Determine season: if current month >= 10 (October+), season = next year
  const now = new Date()
  const season = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear()

  // Determine tournament status from game states
  let hasInProgress = false
  let hasCompleted = false
  let hasScheduled = false

  for (const event of events) {
    const state = event.status.type.state
    if (state === 'in') hasInProgress = true
    else if (state === 'post') hasCompleted = true
    else hasScheduled = true
  }

  let status: TournamentStatus = 'upcoming'
  if (hasInProgress) status = 'active'
  else if (hasCompleted && hasScheduled) status = 'active'
  else if (hasCompleted && !hasScheduled) status = 'completed'

  const genderLabel = gender === 'mens' ? "Men's" : "Women's"

  return {
    externalId: tournamentId,
    name: `NCAA ${genderLabel} Basketball Tournament`,
    season,
    gender,
    startDate: dates[0] ?? '',
    endDate: dates[dates.length - 1] ?? '',
    teamCount: teamIds.size,
    gameCount: events.length,
    teamsPopulated: teamIds.size >= 60,
    status,
  }
}
