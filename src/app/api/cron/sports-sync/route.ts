/**
 * Vercel cron endpoint for periodic sports score synchronization.
 *
 * Runs every 2 minutes (configured in vercel.json). Authenticates via
 * CRON_SECRET Bearer token. Adaptive polling: exits early when no active
 * brackets or no games in progress.
 *
 * Per-bracket try/catch ensures one failing bracket doesn't block others
 * (matches webhook per-operation pattern from 06-01).
 */

import { NextResponse } from 'next/server'
import { getActiveSportsBrackets, syncBracketResults, repairBracketAdvancement } from '@/lib/dal/sports'
import { getProvider } from '@/lib/sports/provider'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60s for sync

export async function GET(request: Request) {
  // 1. Authenticate with CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[sports-sync] CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const startTime = Date.now()

  try {
    // 2. Check for active sports brackets -- exit early if none
    const activeBrackets = await getActiveSportsBrackets()
    if (activeBrackets.length === 0) {
      return NextResponse.json({
        status: 'skipped',
        reason: 'no_active_brackets',
        duration: Date.now() - startTime,
      })
    }

    // 3. Adaptive gate: check if any games are in progress
    // If no games active, we still sync (to catch recently finished games)
    // but log the state for monitoring
    const provider = getProvider()
    let gamesInProgress = false
    try {
      gamesInProgress = await provider.areGamesInProgress()
    } catch (err) {
      // areGamesInProgress failure is non-fatal -- proceed with sync
      console.warn('[sports-sync] areGamesInProgress check failed:', err)
    }

    if (!gamesInProgress) {
      // No games in progress -- lightweight check. Still sync to catch
      // recently finalized games, but log for monitoring.
      console.log('[sports-sync] No games in progress, performing catch-up sync')
    }

    // 4. Sync each active bracket with per-bracket try/catch
    const results: Array<{
      bracketId: string
      bracketName: string
      status: 'synced' | 'error'
      error?: string
    }> = []

    for (const bracket of activeBrackets) {
      try {
        if (!bracket.externalTournamentId) {
          results.push({
            bracketId: bracket.id,
            bracketName: bracket.name,
            status: 'error',
            error: 'No externalTournamentId',
          })
          continue
        }

        // Extract season from bracket name (e.g., "NCAA March Madness 2026 - Men's")
        const seasonMatch = bracket.name.match(/\b(20\d{2})\b/)
        const season = seasonMatch
          ? parseInt(seasonMatch[1], 10)
          : new Date().getFullYear()

        // Fetch today's tournament games
        const games = await provider.getTournamentGames(
          bracket.externalTournamentId,
          season
        )

        // Repair R2-R4 positions before syncing results (fixes Sweet 16 ordering bug)
        await repairBracketAdvancement(bracket.id, games)

        // Sync bracket matchups with live game data
        await syncBracketResults(bracket.id, games)

        results.push({
          bracketId: bracket.id,
          bracketName: bracket.name,
          status: 'synced',
        })
      } catch (err) {
        // Per-bracket error isolation -- one failure doesn't block others
        console.error(
          `[sports-sync] Failed to sync bracket ${bracket.id} (${bracket.name}):`,
          err
        )
        results.push({
          bracketId: bracket.id,
          bracketName: bracket.name,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const syncedCount = results.filter((r) => r.status === 'synced').length
    const errorCount = results.filter((r) => r.status === 'error').length

    return NextResponse.json({
      status: 'completed',
      gamesInProgress,
      totalBrackets: activeBrackets.length,
      synced: syncedCount,
      errors: errorCount,
      duration: Date.now() - startTime,
      results,
    })
  } catch (err) {
    console.error('[sports-sync] Cron handler failed:', err)
    return NextResponse.json(
      {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
