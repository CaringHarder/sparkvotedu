'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle, Eye, RotateCcw, X } from 'lucide-react'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'
import type { BracketWithDetails, TabulationResult } from '@/lib/bracket/types'

interface PredictionPreviewProps {
  bracket: BracketWithDetails
  tabulationResults: TabulationResult[]
  onOverride: (matchupId: string, winnerId: string) => void
  onRelease: () => void
  onReopen: () => void
  unresolvedCount: number
  isPending: boolean
}

/**
 * Teacher preview component for auto-resolution predictive brackets.
 *
 * Shows the full bracket diagram with tabulated winners, highlights
 * ties and no-prediction matchups, and provides override controls.
 * Teacher confirms all winners before releasing results for reveal.
 */
export function PredictionPreview({
  bracket,
  tabulationResults,
  onOverride,
  onRelease,
  onReopen,
  unresolvedCount,
  isPending,
}: PredictionPreviewProps) {
  const [selectedMatchupId, setSelectedMatchupId] = useState<string | null>(null)
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false)

  const totalRounds = Math.ceil(Math.log2(bracket.maxEntrants ?? bracket.size))

  // Build a lookup of tabulation results by matchupId
  const resultsByMatchup = useMemo(() => {
    const map = new Map<string, TabulationResult>()
    for (const r of tabulationResults) {
      map.set(r.matchupId, r)
    }
    return map
  }, [tabulationResults])

  // Group unresolved matchups by round for quick navigation
  const unresolvedByRound = useMemo(() => {
    const groups: Record<number, TabulationResult[]> = {}
    for (const r of tabulationResults) {
      if (r.status === 'tie' || r.status === 'no_predictions') {
        if (!groups[r.round]) groups[r.round] = []
        groups[r.round].push(r)
      }
    }
    return groups
  }, [tabulationResults])

  const unresolvedRounds = Object.keys(unresolvedByRound)
    .map(Number)
    .sort((a, b) => a - b)

  // Get selected matchup's tabulation result
  const selectedResult = selectedMatchupId ? resultsByMatchup.get(selectedMatchupId) : null

  // Find entrant names from bracket matchups
  const getEntrantName = (entrantId: string | null): string => {
    if (!entrantId) return 'TBD'
    for (const m of bracket.matchups) {
      if (m.entrant1Id === entrantId && m.entrant1) return m.entrant1.name
      if (m.entrant2Id === entrantId && m.entrant2) return m.entrant2.name
    }
    for (const e of bracket.entrants) {
      if (e.id === entrantId) return e.name
    }
    return 'Unknown'
  }

  // Build matchup click handler -- opens override modal
  const handleMatchupClick = (matchupId: string) => {
    setSelectedMatchupId((prev) => (prev === matchupId ? null : matchupId))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Preview Results</h2>
        {unresolvedCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            {unresolvedCount} unresolved
          </span>
        )}
        <div className="flex-1" />
        {/* Reopen Predictions button */}
        <button
          type="button"
          onClick={onReopen}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" />
          Reopen Predictions
        </button>
        {/* Release Results button */}
        <button
          type="button"
          onClick={() => setShowReleaseConfirm(true)}
          disabled={unresolvedCount > 0 || isPending}
          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          Release Results
        </button>
      </div>

      {/* Unresolved alert */}
      {unresolvedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="text-sm text-amber-800 dark:text-amber-200">
            {unresolvedCount} matchup{unresolvedCount > 1 ? 's' : ''} need{unresolvedCount === 1 ? 's' : ''} a winner before release. Click to override.
          </span>
        </div>
      )}

      {/* Quick navigation for unresolved matchups by round */}
      {unresolvedRounds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Unresolved:</span>
          {unresolvedRounds.map((round) => (
            <button
              key={round}
              type="button"
              onClick={() => {
                const first = unresolvedByRound[round]?.[0]
                if (first) setSelectedMatchupId(first.matchupId)
              }}
              className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
            >
              Round {round} ({unresolvedByRound[round].length})
            </button>
          ))}
        </div>
      )}

      {/* Bracket diagram */}
      <div className="rounded-lg border p-3">
        <BracketDiagram
          matchups={bracket.matchups}
          totalRounds={totalRounds}
          bracketSize={bracket.maxEntrants ?? bracket.size}
          onMatchupClick={handleMatchupClick}
          selectedMatchupId={selectedMatchupId}
        />
      </div>

      {/* Override modal */}
      {selectedResult && (
        <OverrideModal
          result={selectedResult}
          getEntrantName={getEntrantName}
          onOverride={(winnerId) => {
            onOverride(selectedResult.matchupId, winnerId)
            setSelectedMatchupId(null)
          }}
          onClose={() => setSelectedMatchupId(null)}
          isPending={isPending}
        />
      )}

      {/* Release confirmation dialog */}
      {showReleaseConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowReleaseConfirm(false)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-base font-bold">Release Results?</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Are you sure? This will begin the round-by-round reveal to students. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowReleaseConfirm(false)}
                className="flex-1 rounded-md border border-input px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReleaseConfirm(false)
                  onRelease()
                }}
                disabled={isPending}
                className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                Yes, Release Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Override Modal
// ---------------------------------------------------------------------------

function OverrideModal({
  result,
  getEntrantName,
  onOverride,
  onClose,
  isPending,
}: {
  result: TabulationResult
  getEntrantName: (id: string | null) => string
  onOverride: (winnerId: string) => void
  onClose: () => void
  isPending: boolean
}) {
  const [selectedWinner, setSelectedWinner] = useState<string | null>(result.winnerId)

  const entrant1Name = getEntrantName(result.entrant1Id)
  const entrant2Name = getEntrantName(result.entrant2Id)

  const statusLabel =
    result.status === 'tie'
      ? 'Tied -- teacher decides'
      : result.status === 'no_predictions'
        ? 'No predictions -- teacher decides'
        : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">
            Round {result.round}, Match {result.position}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status label */}
        {statusLabel && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            {statusLabel}
          </div>
        )}

        {/* Entrant options */}
        <div className="mb-4 space-y-2">
          {result.entrant1Id && (
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                selectedWinner === result.entrant1Id
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:border-primary/50'
              }`}
            >
              <input
                type="radio"
                name="override-winner"
                checked={selectedWinner === result.entrant1Id}
                onChange={() => setSelectedWinner(result.entrant1Id)}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <span className="text-sm font-medium">{entrant1Name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {result.entrant1Votes} prediction{result.entrant1Votes !== 1 ? 's' : ''}
                </span>
              </div>
            </label>
          )}
          {result.entrant2Id && (
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                selectedWinner === result.entrant2Id
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:border-primary/50'
              }`}
            >
              <input
                type="radio"
                name="override-winner"
                checked={selectedWinner === result.entrant2Id}
                onChange={() => setSelectedWinner(result.entrant2Id)}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <span className="text-sm font-medium">{entrant2Name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {result.entrant2Votes} prediction{result.entrant2Votes !== 1 ? 's' : ''}
                </span>
              </div>
            </label>
          )}
        </div>

        {/* Warning */}
        <p className="mb-4 text-xs text-muted-foreground">
          Overriding will recalculate all downstream matchups.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-input px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedWinner) onOverride(selectedWinner)
            }}
            disabled={!selectedWinner || isPending}
            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Confirm Override
          </button>
        </div>
      </div>
    </div>
  )
}
