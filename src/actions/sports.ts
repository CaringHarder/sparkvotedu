'use server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { createSportsBracketDAL, getActiveSportsBrackets, syncBracketResults } from '@/lib/dal/sports'
import { importTournamentSchema } from '@/lib/utils/validation'
import { canAccess } from '@/lib/gates/features'
import { getProvider } from '@/lib/sports/provider'
import { broadcastActivityUpdate } from '@/lib/realtime/broadcast'
import type { SubscriptionTier } from '@/lib/gates/tiers'
import { revalidatePath } from 'next/cache'

/**
 * Get available tournaments from the sports data provider.
 *
 * Auth -> gate check -> provider call -> return tournaments.
 * Feature gate: sportsIntegration (Pro Plus only).
 */
export async function getAvailableTournaments() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const tier = (teacher.subscriptionTier ?? 'free') as SubscriptionTier
  const gateResult = canAccess(tier, 'sportsIntegration')
  if (!gateResult.allowed) {
    return { error: gateResult.reason, upgradeTarget: gateResult.upgradeTarget }
  }

  try {
    const provider = getProvider()
    const tournaments = await provider.getActiveTournaments()
    return { tournaments }
  } catch (err) {
    console.error('getAvailableTournaments failed:', err)
    return { error: 'Unable to fetch tournaments. Please check your sports data configuration.' }
  }
}

/**
 * Import a tournament as a sports bracket linked to a class session.
 *
 * Auth -> gate check -> validate -> session ownership -> duplicate check
 * -> DAL create -> broadcast -> revalidate -> return.
 *
 * Feature gate: sportsIntegration (Pro Plus only).
 * Duplicate prevention: one import per tournament per session.
 */
export async function importTournament(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const tier = (teacher.subscriptionTier ?? 'free') as SubscriptionTier
  const gateResult = canAccess(tier, 'sportsIntegration')
  if (!gateResult.allowed) {
    return { error: gateResult.reason, upgradeTarget: gateResult.upgradeTarget }
  }

  const parsed = importTournamentSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid import data', issues: parsed.error.issues }
  }

  const { tournamentId, season, sessionId } = parsed.data

  try {
    // Verify session belongs to teacher
    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, teacherId: teacher.id },
      select: { id: true },
    })
    if (!session) {
      return { error: 'Session not found or not owned by you' }
    }

    // Check for duplicate import (one tournament per session)
    const existing = await prisma.bracket.findFirst({
      where: {
        externalTournamentId: tournamentId,
        sessionId,
      },
      select: { id: true, name: true },
    })
    if (existing) {
      return { error: 'This tournament has already been imported for this session.' }
    }

    // Create the sports bracket
    const result = await createSportsBracketDAL(teacher.id, {
      tournamentId,
      season,
      sessionId,
    })

    if (!result.bracket) {
      return { error: 'Failed to create sports bracket' }
    }

    // Log any import warnings
    if (result.warnings.length > 0) {
      console.warn('[importTournament] warnings:', result.warnings)
    }

    // Non-blocking broadcast (per 04-03 pattern)
    broadcastActivityUpdate(sessionId).catch(console.error)

    revalidatePath('/brackets')
    revalidatePath('/activities')

    return { bracket: { id: result.bracket.id, name: result.bracket.name } }
  } catch (err) {
    console.error('importTournament failed:', err)
    return { error: 'Failed to import tournament' }
  }
}

/**
 * Manually trigger a sync of all active sports brackets owned by the teacher.
 *
 * Auth -> gate check -> fetch active brackets -> sync each -> return count.
 * Feature gate: sportsIntegration (Pro Plus only).
 */
export async function triggerSportsSync() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const tier = (teacher.subscriptionTier ?? 'free') as SubscriptionTier
  const gateResult = canAccess(tier, 'sportsIntegration')
  if (!gateResult.allowed) {
    return { error: gateResult.reason, upgradeTarget: gateResult.upgradeTarget }
  }

  try {
    const provider = getProvider()
    const activeBrackets = await getActiveSportsBrackets()

    // Filter to only brackets owned by this teacher
    const teacherBrackets = activeBrackets.filter(
      (b) => b.teacherId === teacher.id
    )

    let syncedCount = 0

    for (const bracket of teacherBrackets) {
      if (!bracket.externalTournamentId) continue

      // Determine season from bracket data (extract year from name or use current)
      const seasonMatch = bracket.name.match(/\b(20\d{2})\b/)
      const season = seasonMatch ? parseInt(seasonMatch[1], 10) : new Date().getFullYear()

      const games = await provider.getTournamentGames(
        bracket.externalTournamentId,
        season
      )

      await syncBracketResults(bracket.id, games)
      syncedCount++
    }

    revalidatePath('/brackets')

    return { synced: syncedCount }
  } catch (err) {
    console.error('triggerSportsSync failed:', err)
    return { error: 'Failed to sync sports brackets' }
  }
}
