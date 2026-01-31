import { prisma } from '@/lib/prisma'

/**
 * Advance a matchup winner and propagate to the next round.
 * Sets winnerId, updates status to "decided", and places the winner
 * into the correct slot of the next matchup.
 */
export async function advanceMatchupWinner(
  _matchupId: string,
  _winnerId: string,
  _bracketId: string
): Promise<{ winnerId: string | null; status: string }> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * Undo a matchup advancement. Clears winnerId, restores status to "voting",
 * and removes the propagated entrant from the next matchup.
 * Blocked if the next matchup already has votes.
 */
export async function undoMatchupAdvancement(
  _matchupId: string,
  _bracketId: string
): Promise<{ winnerId: string | null; status: string }> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * Batch advance all decided matchups in a round.
 * Propagates all winners to their respective next matchups.
 * Returns the count of matchups advanced.
 */
export async function batchAdvanceRound(
  _bracketId: string,
  _round: number
): Promise<number> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * Check if all matchups in a round are decided.
 */
export async function checkRoundComplete(
  _bracketId: string,
  _round: number
): Promise<boolean> {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * Check if the bracket is complete (final matchup has a winner).
 * Returns the winnerId if complete, null otherwise.
 */
export async function isBracketComplete(
  _bracketId: string
): Promise<string | null> {
  // TODO: implement
  throw new Error('Not implemented')
}

// Suppress unused import warning -- prisma will be used in implementation
void prisma
