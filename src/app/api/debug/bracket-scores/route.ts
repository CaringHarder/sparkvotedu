import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getProvider } from '@/lib/sports/provider'

/**
 * Temporary diagnostic endpoint to inspect Final Four matchup data.
 * DELETE THIS FILE after debugging is complete.
 *
 * GET /api/debug/bracket-scores?bracketId=xxx
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const bracketId = url.searchParams.get('bracketId')

  if (!bracketId) {
    return NextResponse.json({ error: 'bracketId required' }, { status: 400 })
  }

  // Get bracket info
  const bracket = await prisma.bracket.findUnique({
    where: { id: bracketId },
    select: {
      id: true,
      name: true,
      status: true,
      bracketType: true,
      externalTournamentId: true,
    },
  })

  if (!bracket) {
    return NextResponse.json({ error: 'bracket not found' }, { status: 404 })
  }

  // Get all R5+ matchups (Final Four and Championship)
  const matchups = await prisma.matchup.findMany({
    where: { bracketId, round: { gte: 5 } },
    select: {
      id: true,
      round: true,
      position: true,
      externalGameId: true,
      entrant1Id: true,
      entrant2Id: true,
      winnerId: true,
      homeScore: true,
      awayScore: true,
      gameStatus: true,
      status: true,
      entrant1: { select: { id: true, name: true, abbreviation: true, externalTeamId: true } },
      entrant2: { select: { id: true, name: true, abbreviation: true, externalTeamId: true } },
      winner: { select: { id: true, name: true, abbreviation: true, externalTeamId: true } },
    },
    orderBy: [{ round: 'asc' }, { position: 'asc' }],
  })

  // Fetch ESPN games for comparison
  let espnGames: Record<number, unknown> = {}
  try {
    const provider = getProvider()
    const seasonMatch = bracket.name.match(/\b(20\d{2})\b/)
    const season = seasonMatch ? parseInt(seasonMatch[1], 10) : new Date().getFullYear()
    const games = await provider.getTournamentGames(bracket.externalTournamentId!, season)

    // Only include games that match our matchups
    const matchupExtIds = new Set(matchups.map((m) => m.externalGameId).filter(Boolean))
    for (const g of games) {
      if (matchupExtIds.has(g.externalId)) {
        espnGames[g.externalId] = {
          externalId: g.externalId,
          round: g.round,
          homeTeam: { name: g.homeTeam.shortName, externalId: g.homeTeam.externalId, abbreviation: g.homeTeam.abbreviation },
          awayTeam: { name: g.awayTeam.shortName, externalId: g.awayTeam.externalId, abbreviation: g.awayTeam.abbreviation },
          homeScore: g.homeScore,
          awayScore: g.awayScore,
          winnerId: g.winnerId,
          status: g.status,
          isClosed: g.isClosed,
        }
      }
    }
  } catch (err) {
    espnGames = { error: String(err) }
  }

  return NextResponse.json({
    bracket: { id: bracket.id, name: bracket.name, status: bracket.status },
    matchups: matchups.map((m) => ({
      id: m.id,
      round: m.round,
      position: m.position,
      externalGameId: m.externalGameId,
      entrant1: m.entrant1 ? { id: m.entrant1.id, name: m.entrant1.name, abbr: m.entrant1.abbreviation, extTeamId: m.entrant1.externalTeamId } : null,
      entrant2: m.entrant2 ? { id: m.entrant2.id, name: m.entrant2.name, abbr: m.entrant2.abbreviation, extTeamId: m.entrant2.externalTeamId } : null,
      winner: m.winner ? { id: m.winner.id, name: m.winner.name, abbr: m.winner.abbreviation, extTeamId: m.winner.externalTeamId } : null,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      gameStatus: m.gameStatus,
      status: m.status,
      // Diagnostic: does entrant1 == winner?
      entrant1IsWinner: m.entrant1Id === m.winnerId,
    })),
    espnGames,
  }, { status: 200 })
}
