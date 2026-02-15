'use server'

import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getBracketWithDetails } from '@/lib/dal/bracket'
import { getPollByIdDAL } from '@/lib/dal/poll'
import {
  getBracketVoteDistribution,
  getPollVoteDistribution,
} from '@/lib/dal/analytics'
import { scoreBracketPredictions } from '@/lib/dal/prediction'
import { canAccess } from '@/lib/gates/features'
import { getPointsForRound } from '@/lib/bracket/predictive'
import type { SubscriptionTier } from '@/lib/gates/tiers'

// ---------------------------------------------------------------------------
// Bracket CSV Export
// ---------------------------------------------------------------------------

/**
 * Fetch bracket matchup data for CSV export with tier verification.
 *
 * Returns flat rows: Round, Position, Entrant 1, Entrant 2, Winner,
 * Entrant 1 Votes, Entrant 2 Votes, Total Votes.
 */
export async function getBracketExportData(bracketId: string): Promise<
  | {
      data: Record<string, unknown>[]
      filename: string
    }
  | { error: string }
> {
  try {
    const teacher = await getAuthenticatedTeacher()
    if (!teacher) {
      return { error: 'Not authenticated' }
    }

    const tier = (teacher.subscriptionTier ?? 'free') as SubscriptionTier
    const csvAccess = canAccess(tier, 'csvExport')
    if (!csvAccess.allowed) {
      return {
        error: `CSV export requires ${csvAccess.upgradeTarget} plan`,
      }
    }

    const bracket = await getBracketWithDetails(bracketId, teacher.id)
    if (!bracket) {
      return { error: 'Bracket not found' }
    }

    const distribution = await getBracketVoteDistribution(bracketId)

    // Transform to flat export rows sorted by round asc, position asc
    const rows: Record<string, unknown>[] = Object.values(distribution)
      .sort((a, b) => a.round - b.round || a.position - b.position)
      .map((m) => ({
        Round: m.round,
        Position: m.position,
        'Entrant 1': m.entrant1.name,
        'Entrant 2': m.entrant2.name ?? '',
        Winner:
          m.winnerId === m.entrant1.id
            ? m.entrant1.name
            : m.winnerId === m.entrant2.id
              ? (m.entrant2.name ?? '')
              : '',
        'Entrant 1 Votes': m.entrant1.votes,
        'Entrant 2 Votes': m.entrant2.votes,
        'Total Votes': m.totalVotes,
      }))

    const filename = bracket.name.replace(/[^a-z0-9]/gi, '_')

    return { data: rows, filename }
  } catch {
    return { error: 'Failed to export data' }
  }
}

// ---------------------------------------------------------------------------
// Poll CSV Export
// ---------------------------------------------------------------------------

/**
 * Fetch poll vote data for CSV export with tier verification.
 *
 * For simple polls: Option, Votes, Percentage.
 * For ranked polls: Option, Borda Score, Percentage.
 */
export async function getPollExportData(pollId: string): Promise<
  | {
      data: Record<string, unknown>[]
      filename: string
    }
  | { error: string }
> {
  try {
    const teacher = await getAuthenticatedTeacher()
    if (!teacher) {
      return { error: 'Not authenticated' }
    }

    const tier = (teacher.subscriptionTier ?? 'free') as SubscriptionTier
    const csvAccess = canAccess(tier, 'csvExport')
    if (!csvAccess.allowed) {
      return {
        error: `CSV export requires ${csvAccess.upgradeTarget} plan`,
      }
    }

    const poll = await getPollByIdDAL(pollId)
    if (!poll || poll.teacherId !== teacher.id) {
      return { error: 'Poll not found' }
    }

    const distribution = await getPollVoteDistribution(pollId, poll.pollType)

    const isRanked = poll.pollType === 'ranked'

    const rows: Record<string, unknown>[] = distribution.options.map((opt) => {
      if (isRanked) {
        return {
          Option: opt.optionText,
          'Borda Score': opt.votes,
          Percentage: `${opt.percentage}%`,
        }
      }
      return {
        Option: opt.optionText,
        Votes: opt.votes,
        Percentage: `${opt.percentage}%`,
      }
    })

    const filename = poll.question.replace(/[^a-z0-9]/gi, '_')

    return { data: rows, filename }
  } catch {
    return { error: 'Failed to export data' }
  }
}

// ---------------------------------------------------------------------------
// Predictive Bracket CSV Export
// ---------------------------------------------------------------------------

/**
 * Fetch predictive bracket scoring data for CSV export.
 *
 * Requires Pro Plus tier (predictive brackets are Pro Plus only).
 * Returns per-student scoring breakdown with per-round point columns.
 */
export async function getPredictiveExportData(bracketId: string): Promise<
  | {
      data: Record<string, unknown>[]
      filename: string
    }
  | { error: string }
> {
  try {
    const teacher = await getAuthenticatedTeacher()
    if (!teacher) {
      return { error: 'Not authenticated' }
    }

    const tier = (teacher.subscriptionTier ?? 'free') as SubscriptionTier
    if (tier !== 'pro_plus') {
      return {
        error: 'Predictive bracket export requires Pro Plus plan',
      }
    }

    const bracket = await getBracketWithDetails(bracketId, teacher.id)
    if (!bracket) {
      return { error: 'Bracket not found' }
    }

    if (bracket.bracketType !== 'predictive') {
      return { error: 'Bracket is not a predictive bracket' }
    }

    const scores = await scoreBracketPredictions(bracketId)

    // Calculate totalRounds from bracket size
    const effectiveSize = bracket.maxEntrants ?? bracket.size
    const totalRounds = Math.ceil(Math.log2(effectiveSize))

    // Transform to flat rows with per-round scoring columns
    const rows: Record<string, unknown>[] = scores.map((score, index) => {
      const row: Record<string, unknown> = {
        Rank: index + 1,
        'Student Name': score.participantName,
        'Total Points': score.totalPoints,
        'Correct Picks': score.correctPicks,
        'Total Picks': score.totalPicks,
        Accuracy:
          score.totalPicks > 0
            ? `${Math.round((score.correctPicks / score.totalPicks) * 100)}%`
            : '0%',
      }

      // Add per-round columns: R1 (1pt), R2 (2pts), etc.
      for (let r = 1; r <= totalRounds; r++) {
        const pts = getPointsForRound(r)
        const roundData = score.pointsByRound[r]
        row[`R${r} (${pts}pts)`] = roundData?.points ?? 0
      }

      return row
    })

    const filename =
      bracket.name.replace(/[^a-z0-9]/gi, '_') + '_predictions'

    return { data: rows, filename }
  } catch {
    return { error: 'Failed to export data' }
  }
}
