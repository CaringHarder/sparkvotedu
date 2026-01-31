'use client'

import { useState, useMemo, useTransition } from 'react'
import { advanceMatchup, undoAdvancement, openMatchupsForVoting, batchAdvanceRound } from '@/actions/bracket-advance'
import type { MatchupData } from '@/lib/bracket/types'
import type { VoteCounts } from '@/types/vote'

interface RoundAdvancementControlsProps {
  bracketId: string
  matchups: MatchupData[]
  selectedMatchupId: string | null
  voteCounts: Record<string, VoteCounts>
  currentRound: number
  onSelectMatchup: (id: string | null) => void
}

// Round label mapping
function getRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return 'Final'
  if (round === totalRounds - 1) return 'Semifinals'
  if (round === totalRounds - 2) return 'Quarterfinals'
  return `Round ${round}`
}

export function RoundAdvancementControls({
  bracketId,
  matchups,
  selectedMatchupId,
  voteCounts,
  currentRound,
  onSelectMatchup,
}: RoundAdvancementControlsProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showUndoConfirm, setShowUndoConfirm] = useState(false)
  const [tieBreakMatchupId, setTieBreakMatchupId] = useState<string | null>(null)

  const totalRounds = useMemo(() => {
    if (matchups.length === 0) return 1
    return Math.max(...matchups.map((m) => m.round))
  }, [matchups])

  // Group matchups by round
  const matchupsByRound = useMemo(() => {
    const byRound: Record<number, MatchupData[]> = {}
    for (const m of matchups) {
      if (!byRound[m.round]) byRound[m.round] = []
      byRound[m.round].push(m)
    }
    return byRound
  }, [matchups])

  // Round-level status
  const roundStatus = useMemo(() => {
    const status: Record<number, { pending: number; voting: number; decided: number }> = {}
    for (let r = 1; r <= totalRounds; r++) {
      const roundMatchups = matchupsByRound[r] ?? []
      status[r] = {
        pending: roundMatchups.filter((m) => m.status === 'pending').length,
        voting: roundMatchups.filter((m) => m.status === 'voting').length,
        decided: roundMatchups.filter((m) => m.status === 'decided').length,
      }
    }
    return status
  }, [matchupsByRound, totalRounds])

  const selectedMatchup = matchups.find((m) => m.id === selectedMatchupId) ?? null

  // Get vote counts for selected matchup
  const selectedVoteCounts = selectedMatchupId ? voteCounts[selectedMatchupId] ?? {} : {}
  const selectedEntrant1Votes = selectedMatchup?.entrant1Id
    ? selectedVoteCounts[selectedMatchup.entrant1Id] ?? 0
    : 0
  const selectedEntrant2Votes = selectedMatchup?.entrant2Id
    ? selectedVoteCounts[selectedMatchup.entrant2Id] ?? 0
    : 0
  const isTied = selectedEntrant1Votes === selectedEntrant2Votes && selectedEntrant1Votes > 0

  // Determine winner based on votes
  const voteWinnerId =
    selectedMatchup && !isTied
      ? selectedEntrant1Votes > selectedEntrant2Votes
        ? selectedMatchup.entrant1Id
        : selectedMatchup.entrant2Id
      : null

  const handleOpenVoting = (round: number) => {
    setError(null)
    const pendingMatchups = (matchupsByRound[round] ?? [])
      .filter((m) => m.status === 'pending')
      .map((m) => m.id)

    if (pendingMatchups.length === 0) return

    startTransition(async () => {
      const result = await openMatchupsForVoting({
        bracketId,
        matchupIds: pendingMatchups,
      })
      if (result && 'error' in result) {
        setError(result.error as string)
      }
    })
  }

  const handleAdvanceMatchup = (matchupId: string, winnerId: string) => {
    setError(null)
    setTieBreakMatchupId(null)
    startTransition(async () => {
      const result = await advanceMatchup({
        bracketId,
        matchupId,
        winnerId,
      })
      if (result && 'error' in result) {
        setError(result.error as string)
      }
    })
  }

  const handleBatchAdvance = (round: number) => {
    setError(null)
    startTransition(async () => {
      const result = await batchAdvanceRound({
        bracketId,
        round,
      })
      if (result && 'error' in result) {
        setError(result.error as string)
      }
    })
  }

  const handleUndo = (matchupId: string) => {
    setError(null)
    setShowUndoConfirm(false)
    startTransition(async () => {
      const result = await undoAdvancement({
        bracketId,
        matchupId,
      })
      if (result && 'error' in result) {
        setError(result.error as string)
      }
    })
  }

  const handleOpenSingleMatchup = (matchupId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await openMatchupsForVoting({
        bracketId,
        matchupIds: [matchupId],
      })
      if (result && 'error' in result) {
        setError(result.error as string)
      }
    })
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Error display */}
      {error && (
        <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Round selector tabs */}
      <div className="mb-4 flex gap-2">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
          const status = roundStatus[round]
          const isActive = round === currentRound
          const isComplete = status && status.decided === (matchupsByRound[round]?.length ?? 0)

          return (
            <button
              key={round}
              onClick={() => {
                // Select first matchup in round or deselect
                const firstInRound = matchupsByRound[round]?.[0]
                if (firstInRound) onSelectMatchup(firstInRound.id)
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isComplete
                    ? 'bg-green-100 text-green-700'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {getRoundLabel(round, totalRounds)}
              {isComplete && (
                <svg
                  className="ml-1 inline h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex gap-4">
        {/* Per-round actions */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">
            {getRoundLabel(currentRound, totalRounds)} Actions
          </h3>

          {/* Open Voting button */}
          {roundStatus[currentRound]?.pending > 0 && (
            <button
              onClick={() => handleOpenVoting(currentRound)}
              disabled={isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Opening...' : `Open Voting (${roundStatus[currentRound]?.pending} matchups)`}
            </button>
          )}

          {/* Advance Round button */}
          {roundStatus[currentRound]?.decided === (matchupsByRound[currentRound]?.length ?? 0) &&
           roundStatus[currentRound]?.decided > 0 && (
            <button
              onClick={() => handleBatchAdvance(currentRound)}
              disabled={isPending}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {isPending
                ? 'Advancing...'
                : `Advance ${roundStatus[currentRound]?.decided} matchup${
                    roundStatus[currentRound]?.decided !== 1 ? 's' : ''
                  }`}
            </button>
          )}

          {roundStatus[currentRound]?.voting > 0 && (
            <p className="text-xs text-muted-foreground">
              {roundStatus[currentRound]?.voting} matchup{roundStatus[currentRound]?.voting !== 1 ? 's' : ''} currently voting
            </p>
          )}
        </div>

        {/* Per-matchup actions (when selected) */}
        {selectedMatchup && (
          <div className="flex-1 rounded-md border-l pl-4">
            <h3 className="mb-2 text-sm font-semibold">
              R{selectedMatchup.round} M{selectedMatchup.position}:{' '}
              {selectedMatchup.entrant1?.name ?? 'TBD'} vs{' '}
              {selectedMatchup.entrant2?.name ?? 'TBD'}
            </h3>

            {/* Pending matchup */}
            {selectedMatchup.status === 'pending' && (
              <button
                onClick={() => handleOpenSingleMatchup(selectedMatchup.id)}
                disabled={isPending}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Open for Voting
              </button>
            )}

            {/* Voting matchup */}
            {selectedMatchup.status === 'voting' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{selectedMatchup.entrant1?.name ?? 'TBD'}</span>
                  <span className="text-lg font-bold">{selectedEntrant1Votes}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-lg font-bold">{selectedEntrant2Votes}</span>
                  <span className="font-medium">{selectedMatchup.entrant2?.name ?? 'TBD'}</span>
                </div>

                {/* Tie handling */}
                {isTied && (
                  <div className="rounded-md bg-yellow-50 p-2">
                    <p className="text-sm font-medium text-yellow-800">
                      It&apos;s a tie! ({selectedEntrant1Votes} - {selectedEntrant2Votes})
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setTieBreakMatchupId(selectedMatchup.id)}
                        className="rounded-md bg-yellow-600 px-3 py-1 text-xs font-medium text-white hover:bg-yellow-700"
                      >
                        Break Tie
                      </button>
                      <button
                        onClick={() => setTieBreakMatchupId(null)}
                        className="rounded-md border border-yellow-600 px-3 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-50"
                      >
                        Extend Voting
                      </button>
                    </div>
                    {tieBreakMatchupId === selectedMatchup.id && (
                      <div className="mt-2 flex gap-2">
                        {selectedMatchup.entrant1Id && (
                          <button
                            onClick={() =>
                              handleAdvanceMatchup(selectedMatchup.id, selectedMatchup.entrant1Id!)
                            }
                            disabled={isPending}
                            className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                          >
                            {selectedMatchup.entrant1?.name ?? 'Entrant 1'}
                          </button>
                        )}
                        {selectedMatchup.entrant2Id && (
                          <button
                            onClick={() =>
                              handleAdvanceMatchup(selectedMatchup.id, selectedMatchup.entrant2Id!)
                            }
                            disabled={isPending}
                            className="rounded-md bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                          >
                            {selectedMatchup.entrant2?.name ?? 'Entrant 2'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Non-tied: accept result or override */}
                {!isTied && (
                  <div className="flex flex-wrap gap-2">
                    {voteWinnerId && (
                      <button
                        onClick={() => handleAdvanceMatchup(selectedMatchup.id, voteWinnerId)}
                        disabled={isPending}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {isPending ? 'Closing...' : 'Close Voting & Accept Result'}
                      </button>
                    )}
                    {/* Override dropdown */}
                    <div className="relative">
                      <details className="group">
                        <summary className="cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/50">
                          Override: Choose Winner
                        </summary>
                        <div className="absolute left-0 top-full z-10 mt-1 rounded-md border bg-card p-1 shadow-md">
                          {selectedMatchup.entrant1Id && (
                            <button
                              onClick={() =>
                                handleAdvanceMatchup(
                                  selectedMatchup.id,
                                  selectedMatchup.entrant1Id!
                                )
                              }
                              disabled={isPending}
                              className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                            >
                              {selectedMatchup.entrant1?.name ?? 'Entrant 1'}
                            </button>
                          )}
                          {selectedMatchup.entrant2Id && (
                            <button
                              onClick={() =>
                                handleAdvanceMatchup(
                                  selectedMatchup.id,
                                  selectedMatchup.entrant2Id!
                                )
                              }
                              disabled={isPending}
                              className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                            >
                              {selectedMatchup.entrant2?.name ?? 'Entrant 2'}
                            </button>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Decided matchup */}
            {selectedMatchup.status === 'decided' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm font-medium">
                    Winner: {selectedMatchup.winner?.name ?? 'Unknown'}
                  </span>
                </div>
                {!showUndoConfirm ? (
                  <button
                    onClick={() => setShowUndoConfirm(true)}
                    className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Undo
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-md bg-red-50 p-2">
                    <span className="text-xs text-red-700">
                      Undo this result? This will reopen voting.
                    </span>
                    <button
                      onClick={() => handleUndo(selectedMatchup.id)}
                      disabled={isPending}
                      className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Confirm Undo
                    </button>
                    <button
                      onClick={() => setShowUndoConfirm(false)}
                      className="rounded-md border px-2 py-0.5 text-xs hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* No matchup selected hint */}
        {!selectedMatchup && (
          <div className="flex-1 flex items-center justify-center border-l pl-4">
            <p className="text-sm text-muted-foreground">
              Select a matchup above for detailed controls
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
