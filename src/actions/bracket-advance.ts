'use server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import {
  advanceMatchupWinner,
  undoMatchupAdvancement,
  isBracketComplete,
} from '@/lib/bracket/advancement'
import { openMatchupsForVoting as openMatchupsForVotingDAL } from '@/lib/dal/vote'
import {
  broadcastBracketUpdate,
  broadcastActivityUpdate,
} from '@/lib/realtime/broadcast'
import {
  advanceMatchupSchema,
  openVotingSchema,
  updateBracketVotingSettingsSchema,
} from '@/lib/utils/validation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

/**
 * Advance a matchup by selecting a winner.
 *
 * Auth -> validate -> ownership check -> advance engine -> broadcast -> revalidate
 */
export async function advanceMatchup(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = advanceMatchupSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid advancement data', issues: parsed.error.issues }
  }

  const { bracketId, matchupId, winnerId } = parsed.data

  try {
    // Verify bracket ownership
    const bracket = await prisma.bracket.findFirst({
      where: { id: bracketId, teacherId: teacher.id },
      select: { id: true, sessionId: true },
    })

    if (!bracket) {
      return { error: 'Bracket not found or not owned by you' }
    }

    // Advance the matchup winner via advancement engine
    await advanceMatchupWinner(matchupId, winnerId, bracketId)

    // Broadcast winner selection
    broadcastBracketUpdate(bracketId, 'winner_selected', {
      matchupId,
      winnerId,
    }).catch(console.error)

    // Check if bracket is now complete
    const completionWinner = await isBracketComplete(bracketId)
    if (completionWinner) {
      broadcastBracketUpdate(bracketId, 'bracket_completed', {
        winnerId: completionWinner,
      }).catch(console.error)
    }

    // Notify session activity channel if bracket belongs to a session
    if (bracket.sessionId) {
      broadcastActivityUpdate(bracket.sessionId).catch(console.error)
    }

    revalidatePath(`/brackets/${bracketId}`)
    revalidatePath(`/brackets/${bracketId}/live`)

    return { success: true }
  } catch {
    return { error: 'Failed to advance matchup' }
  }
}

/**
 * Undo a matchup advancement. Clears winner and restores voting status.
 *
 * Auth -> validate -> ownership check -> undo engine -> broadcast -> revalidate
 */
export async function undoAdvancement(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const undoSchema = z.object({
    bracketId: z.string().uuid(),
    matchupId: z.string().uuid(),
  })

  const parsed = undoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid undo data', issues: parsed.error.issues }
  }

  const { bracketId, matchupId } = parsed.data

  try {
    // Verify bracket ownership
    const bracket = await prisma.bracket.findFirst({
      where: { id: bracketId, teacherId: teacher.id },
      select: { id: true },
    })

    if (!bracket) {
      return { error: 'Bracket not found or not owned by you' }
    }

    // Undo the advancement via engine
    await undoMatchupAdvancement(matchupId, bracketId)

    // Broadcast the undo
    broadcastBracketUpdate(bracketId, 'round_advanced', {
      action: 'undo',
      matchupId,
    }).catch(console.error)

    revalidatePath(`/brackets/${bracketId}`)
    revalidatePath(`/brackets/${bracketId}/live`)

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to undo advancement'
    return { error: message }
  }
}

/**
 * Open matchups for voting (batch status update from pending to voting).
 *
 * Auth -> validate -> ownership check -> DAL -> broadcast -> revalidate
 */
export async function openMatchupsForVoting(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = openVotingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid voting data', issues: parsed.error.issues }
  }

  const { bracketId, matchupIds } = parsed.data

  try {
    // Verify bracket ownership
    const bracket = await prisma.bracket.findFirst({
      where: { id: bracketId, teacherId: teacher.id },
      select: { id: true },
    })

    if (!bracket) {
      return { error: 'Bracket not found or not owned by you' }
    }

    // Open matchups for voting via DAL
    const result = await openMatchupsForVotingDAL(matchupIds)

    // Broadcast voting opened
    broadcastBracketUpdate(bracketId, 'voting_opened', {
      matchupIds,
    }).catch(console.error)

    revalidatePath(`/brackets/${bracketId}`)
    revalidatePath(`/brackets/${bracketId}/live`)

    return { success: true, opened: result.opened }
  } catch {
    return { error: 'Failed to open matchups for voting' }
  }
}

/**
 * Batch advance all decided matchups in a round.
 *
 * Finds matchups with winnerId set, advances them, and propagates
 * winners to the next round.
 *
 * Auth -> validate -> ownership check -> batch advance -> broadcast -> revalidate
 */
export async function batchAdvanceRound(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const batchSchema = z.object({
    bracketId: z.string().uuid(),
    round: z.number().int().positive(),
  })

  const parsed = batchSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid batch advance data', issues: parsed.error.issues }
  }

  const { bracketId, round } = parsed.data

  try {
    // Verify bracket ownership
    const bracket = await prisma.bracket.findFirst({
      where: { id: bracketId, teacherId: teacher.id },
      select: { id: true, sessionId: true },
    })

    if (!bracket) {
      return { error: 'Bracket not found or not owned by you' }
    }

    // Get all matchups in this round that have a winner but status is still voting
    const matchups = await prisma.matchup.findMany({
      where: {
        bracketId,
        round,
        winnerId: { not: null },
        status: 'voting',
      },
    })

    // Advance each matchup and set status to decided
    for (const matchup of matchups) {
      if (matchup.winnerId) {
        await advanceMatchupWinner(matchup.id, matchup.winnerId, bracketId)
      }
    }

    // Broadcast round advancement
    broadcastBracketUpdate(bracketId, 'round_advanced', {
      round,
    }).catch(console.error)

    // Check if bracket is now complete
    const completionWinner = await isBracketComplete(bracketId)
    if (completionWinner) {
      broadcastBracketUpdate(bracketId, 'bracket_completed', {
        winnerId: completionWinner,
      }).catch(console.error)
    }

    // Notify session activity channel
    if (bracket.sessionId) {
      broadcastActivityUpdate(bracket.sessionId).catch(console.error)
    }

    revalidatePath(`/brackets/${bracketId}`)
    revalidatePath(`/brackets/${bracketId}/live`)

    return { success: true, advanced: matchups.length }
  } catch {
    return { error: 'Failed to batch advance round' }
  }
}

/**
 * Update bracket voting settings (viewingMode, showVoteCounts, votingTimerSeconds).
 *
 * Auth -> validate -> ownership check -> update -> return
 */
export async function updateBracketVotingSettings(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = updateBracketVotingSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid settings data', issues: parsed.error.issues }
  }

  const { bracketId, ...settings } = parsed.data

  try {
    // Verify bracket ownership
    const bracket = await prisma.bracket.findFirst({
      where: { id: bracketId, teacherId: teacher.id },
      select: { id: true },
    })

    if (!bracket) {
      return { error: 'Bracket not found or not owned by you' }
    }

    // Build update data from provided fields
    const updateData: {
      viewingMode?: string
      showVoteCounts?: boolean
      votingTimerSeconds?: number | null
    } = {}
    if (settings.viewingMode !== undefined) updateData.viewingMode = settings.viewingMode
    if (settings.showVoteCounts !== undefined) updateData.showVoteCounts = settings.showVoteCounts
    if (settings.votingTimerSeconds !== undefined)
      updateData.votingTimerSeconds = settings.votingTimerSeconds

    const updated = await prisma.bracket.update({
      where: { id: bracketId },
      data: updateData,
    })

    revalidatePath(`/brackets/${bracketId}`)

    return {
      success: true,
      bracket: {
        viewingMode: updated.viewingMode,
        showVoteCounts: updated.showVoteCounts,
        votingTimerSeconds: updated.votingTimerSeconds,
      },
    }
  } catch (err) {
    console.error('Failed to update bracket voting settings:', err)
    const message = err instanceof Error ? err.message : 'Failed to update bracket voting settings'
    return { error: message }
  }
}
