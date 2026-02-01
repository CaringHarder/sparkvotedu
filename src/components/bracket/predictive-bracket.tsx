'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import { Trophy, Check, Edit3, Lock, ChevronRight } from 'lucide-react'
import type { BracketWithDetails, MatchupData, PredictionData, PredictionScore } from '@/lib/bracket/types'
import { submitPrediction, updatePredictionStatus } from '@/actions/prediction'
import { usePredictions } from '@/hooks/use-predictions'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'

interface PredictiveBracketProps {
  bracket: BracketWithDetails
  participantId: string
  isTeacher: boolean
}

/**
 * Predictive bracket component supporting simple (form) and advanced (bracket click) modes.
 *
 * Students: Submit/edit predictions during predictions_open phase.
 * Teachers: Manage prediction lifecycle + view aggregate prediction stats.
 */
export function PredictiveBracket({ bracket, participantId, isTeacher }: PredictiveBracketProps) {
  const predictiveMode = bracket.predictiveMode ?? 'simple'
  const predictionStatus = bracket.predictionStatus ?? 'draft'

  const { myPredictions, leaderboard, isLoading, refetch } = usePredictions(
    bracket.id,
    isTeacher ? undefined : participantId
  )

  if (isTeacher) {
    return (
      <TeacherPredictiveView
        bracket={bracket}
        predictionStatus={predictionStatus}
        leaderboard={leaderboard}
      />
    )
  }

  if (predictiveMode === 'advanced') {
    return (
      <AdvancedPredictionMode
        bracket={bracket}
        participantId={participantId}
        predictionStatus={predictionStatus}
        myPredictions={myPredictions}
        isLoading={isLoading}
        onRefetch={refetch}
      />
    )
  }

  return (
    <SimplePredictionMode
      bracket={bracket}
      participantId={participantId}
      predictionStatus={predictionStatus}
      myPredictions={myPredictions}
      isLoading={isLoading}
      onRefetch={refetch}
    />
  )
}

// ---------------------------------------------------------------------------
// Teacher View
// ---------------------------------------------------------------------------

function TeacherPredictiveView({
  bracket,
  predictionStatus,
  leaderboard,
}: {
  bracket: BracketWithDetails
  predictionStatus: string
  leaderboard: PredictionScore[]
}) {
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      await updatePredictionStatus({
        bracketId: bracket.id,
        status: newStatus,
      })
    })
  }

  return (
    <div className="space-y-4">
      {/* Prediction lifecycle controls */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Predictions
        </span>
        <PredictionStatusBadge status={predictionStatus} />
        <div className="flex-1" />
        {predictionStatus === 'draft' && (
          <button
            type="button"
            onClick={() => handleStatusChange('predictions_open')}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            Open Predictions
          </button>
        )}
        {predictionStatus === 'predictions_open' && (
          <button
            type="button"
            onClick={() => handleStatusChange('active')}
            disabled={isPending}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            Close Predictions & Start
          </button>
        )}
        {predictionStatus === 'active' && (
          <button
            type="button"
            onClick={() => handleStatusChange('completed')}
            disabled={isPending}
            className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-orange-700 disabled:opacity-50"
          >
            Complete
          </button>
        )}
      </div>

      {/* Bracket diagram */}
      <div className="rounded-lg border p-3">
        <BracketDiagram
          matchups={bracket.matchups}
          totalRounds={Math.ceil(Math.log2(bracket.maxEntrants ?? bracket.size))}
          bracketSize={bracket.maxEntrants ?? bracket.size}
        />
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Prediction Leaderboard
          </h2>
          <div className="rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Student</th>
                  <th className="px-3 py-2 text-right font-semibold">Points</th>
                  <th className="px-3 py-2 text-right font-semibold">Correct</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((score, index) => (
                  <tr key={score.participantId} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">
                      {index === 0 ? (
                        <Trophy className="inline h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        index + 1
                      )}
                    </td>
                    <td className="px-3 py-2">{score.participantName || 'Student'}</td>
                    <td className="px-3 py-2 text-right font-semibold">{score.totalPoints}</td>
                    <td className="px-3 py-2 text-right">{score.correctPicks}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{score.totalPicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Student: Simple Prediction Mode (form-based)
// ---------------------------------------------------------------------------

function SimplePredictionMode({
  bracket,
  participantId,
  predictionStatus,
  myPredictions,
  isLoading,
  onRefetch,
}: {
  bracket: BracketWithDetails
  participantId: string
  predictionStatus: string
  myPredictions: PredictionData[]
  isLoading: boolean
  onRefetch: () => void
}) {
  const nonByeMatchups = useMemo(
    () => bracket.matchups.filter((m) => !m.isBye && m.entrant1Id && m.entrant2Id),
    [bracket.matchups]
  )

  // Build existing prediction map: matchupId -> predictedWinnerId
  const existingMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of myPredictions) {
      map.set(p.matchupId, p.predictedWinnerId)
    }
    return map
  }, [myPredictions])

  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const p of myPredictions) {
      initial[p.matchupId] = p.predictedWinnerId
    }
    return initial
  })

  // Sync selections when myPredictions changes (after fetch)
  const [lastPredictionCount, setLastPredictionCount] = useState(0)
  if (myPredictions.length !== lastPredictionCount) {
    const updated: Record<string, string> = {}
    for (const p of myPredictions) {
      updated[p.matchupId] = p.predictedWinnerId
    }
    setSelections(updated)
    setLastPredictionCount(myPredictions.length)
  }

  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(myPredictions.length === 0)

  const madeCount = Object.keys(selections).length
  const totalCount = nonByeMatchups.length
  const allSelected = madeCount === totalCount

  const isPredictionsOpen = predictionStatus === 'predictions_open'
  const hasSubmitted = myPredictions.length > 0

  function handleSelect(matchupId: string, entrantId: string) {
    if (!isPredictionsOpen || (!isEditing && hasSubmitted)) return
    setSelections((prev) => ({ ...prev, [matchupId]: entrantId }))
  }

  function handleSubmit() {
    startTransition(async () => {
      const predictions = Object.entries(selections).map(([matchupId, predictedWinnerId]) => ({
        matchupId,
        predictedWinnerId,
      }))

      const result = await submitPrediction({
        bracketId: bracket.id,
        participantId,
        predictions,
      })

      if (result && 'success' in result) {
        setIsEditing(false)
        onRefetch()
      }
    })
  }

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading predictions...</div>
  }

  // Predictions are closed
  if (!isPredictionsOpen) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
          <Lock className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-800 dark:text-amber-200">
            {predictionStatus === 'draft'
              ? 'Predictions have not opened yet.'
              : 'Predictions are closed.'}
          </span>
        </div>
        {hasSubmitted && (
          <ReadOnlyPredictions matchups={nonByeMatchups} selections={existingMap} />
        )}
      </div>
    )
  }

  // Read-only view after submission (not editing)
  if (hasSubmitted && !isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-800 dark:text-green-200">
            Predictions submitted ({myPredictions.length} picks)
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
          >
            <Edit3 className="h-3 w-3" />
            Edit Predictions
          </button>
        </div>
        <ReadOnlyPredictions matchups={nonByeMatchups} selections={existingMap} />
      </div>
    )
  }

  // Prediction form
  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {madeCount} of {totalCount} predictions made
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${totalCount > 0 ? (madeCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Matchup list */}
      <div className="space-y-2">
        {nonByeMatchups.map((matchup) => (
          <MatchupPredictionCard
            key={matchup.id}
            matchup={matchup}
            selectedWinnerId={selections[matchup.id] ?? null}
            onSelect={(entrantId) => handleSelect(matchup.id, entrantId)}
          />
        ))}
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!allSelected || isPending}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Submitting...' : hasSubmitted ? 'Update Predictions' : 'Submit All Predictions'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Student: Advanced Prediction Mode (bracket diagram click)
// ---------------------------------------------------------------------------

function AdvancedPredictionMode({
  bracket,
  participantId,
  predictionStatus,
  myPredictions,
  isLoading,
  onRefetch,
}: {
  bracket: BracketWithDetails
  participantId: string
  predictionStatus: string
  myPredictions: PredictionData[]
  isLoading: boolean
  onRefetch: () => void
}) {
  const nonByeMatchups = useMemo(
    () => bracket.matchups.filter((m) => !m.isBye && m.entrant1Id && m.entrant2Id),
    [bracket.matchups]
  )

  const existingMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of myPredictions) {
      map.set(p.matchupId, p.predictedWinnerId)
    }
    return map
  }, [myPredictions])

  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const p of myPredictions) {
      initial[p.matchupId] = p.predictedWinnerId
    }
    return initial
  })

  const [lastPredictionCount, setLastPredictionCount] = useState(0)
  if (myPredictions.length !== lastPredictionCount) {
    const updated: Record<string, string> = {}
    for (const p of myPredictions) {
      updated[p.matchupId] = p.predictedWinnerId
    }
    setSelections(updated)
    setLastPredictionCount(myPredictions.length)
  }

  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(myPredictions.length === 0)

  const madeCount = Object.keys(selections).length
  const totalCount = nonByeMatchups.length
  const allSelected = madeCount === totalCount
  const isPredictionsOpen = predictionStatus === 'predictions_open'
  const hasSubmitted = myPredictions.length > 0

  const totalRounds = Math.ceil(Math.log2(bracket.maxEntrants ?? bracket.size))

  // Build votedEntrantIds map for the bracket diagram (reuse its highlight system)
  const votedEntrantIds = useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const [matchupId, entrantId] of Object.entries(selections)) {
      map[matchupId] = entrantId
    }
    return map
  }, [selections])

  const handleEntrantClick = useCallback(
    (matchupId: string, entrantId: string) => {
      if (!isPredictionsOpen || (!isEditing && hasSubmitted)) return
      // Only allow clicks on non-bye matchups
      const matchup = bracket.matchups.find((m) => m.id === matchupId)
      if (!matchup || matchup.isBye) return
      setSelections((prev) => ({ ...prev, [matchupId]: entrantId }))
    },
    [isPredictionsOpen, isEditing, hasSubmitted, bracket.matchups]
  )

  function handleSubmit() {
    startTransition(async () => {
      const predictions = Object.entries(selections).map(([matchupId, predictedWinnerId]) => ({
        matchupId,
        predictedWinnerId,
      }))

      const result = await submitPrediction({
        bracketId: bracket.id,
        participantId,
        predictions,
      })

      if (result && 'success' in result) {
        setIsEditing(false)
        onRefetch()
      }
    })
  }

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading predictions...</div>
  }

  if (!isPredictionsOpen) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
          <Lock className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-800 dark:text-amber-200">
            {predictionStatus === 'draft'
              ? 'Predictions have not opened yet.'
              : 'Predictions are closed.'}
          </span>
        </div>
        {hasSubmitted && (
          <div className="rounded-lg border p-3">
            <BracketDiagram
              matchups={bracket.matchups}
              totalRounds={totalRounds}
              bracketSize={bracket.maxEntrants ?? bracket.size}
              votedEntrantIds={Object.fromEntries(existingMap)}
            />
          </div>
        )}
      </div>
    )
  }

  if (hasSubmitted && !isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-800 dark:text-green-200">
            Predictions submitted ({myPredictions.length} picks)
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
          >
            <Edit3 className="h-3 w-3" />
            Edit Predictions
          </button>
        </div>
        <div className="rounded-lg border p-3">
          <BracketDiagram
            matchups={bracket.matchups}
            totalRounds={totalRounds}
            bracketSize={bracket.maxEntrants ?? bracket.size}
            votedEntrantIds={Object.fromEntries(existingMap)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Click an entrant to predict the winner. {madeCount} of {totalCount} picks made.
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${totalCount > 0 ? (madeCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Interactive bracket diagram */}
      <div className="rounded-lg border p-3">
        <BracketDiagram
          matchups={bracket.matchups}
          totalRounds={totalRounds}
          bracketSize={bracket.maxEntrants ?? bracket.size}
          onEntrantClick={handleEntrantClick}
          votedEntrantIds={votedEntrantIds}
        />
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!allSelected || isPending}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Submitting...' : hasSubmitted ? 'Update Predictions' : 'Submit All Predictions'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared Components
// ---------------------------------------------------------------------------

function PredictionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    predictions_open: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    completed: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  }

  const labels: Record<string, string> = {
    draft: 'Draft',
    predictions_open: 'Predictions Open',
    active: 'Active',
    completed: 'Completed',
  }

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.draft}`}>
      {labels[status] ?? status}
    </span>
  )
}

function MatchupPredictionCard({
  matchup,
  selectedWinnerId,
  onSelect,
}: {
  matchup: MatchupData
  selectedWinnerId: string | null
  onSelect: (entrantId: string) => void
}) {
  const entrant1 = matchup.entrant1
  const entrant2 = matchup.entrant2

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1.5 text-xs text-muted-foreground">
        Round {matchup.round}, Match {matchup.position}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Entrant 1 */}
        <button
          type="button"
          onClick={() => entrant1 && onSelect(entrant1.id)}
          className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
            selectedWinnerId === entrant1?.id
              ? 'border-primary bg-primary/10 font-semibold text-primary'
              : 'hover:border-primary/50 hover:bg-accent'
          }`}
        >
          {entrant1?.name ?? 'TBD'}
          {selectedWinnerId === entrant1?.id && (
            <Check className="ml-1 inline h-3.5 w-3.5" />
          )}
        </button>

        <span className="text-xs font-medium text-muted-foreground">vs</span>

        {/* Entrant 2 */}
        <button
          type="button"
          onClick={() => entrant2 && onSelect(entrant2.id)}
          className={`rounded-md border px-3 py-2 text-right text-sm transition-colors ${
            selectedWinnerId === entrant2?.id
              ? 'border-primary bg-primary/10 font-semibold text-primary'
              : 'hover:border-primary/50 hover:bg-accent'
          }`}
        >
          {selectedWinnerId === entrant2?.id && (
            <Check className="mr-1 inline h-3.5 w-3.5" />
          )}
          {entrant2?.name ?? 'TBD'}
        </button>
      </div>
    </div>
  )
}

function ReadOnlyPredictions({
  matchups,
  selections,
}: {
  matchups: MatchupData[]
  selections: Map<string, string>
}) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Your Predictions
      </h3>
      {matchups.map((matchup) => {
        const selectedId = selections.get(matchup.id)
        const selectedEntrant =
          selectedId === matchup.entrant1Id
            ? matchup.entrant1
            : selectedId === matchup.entrant2Id
              ? matchup.entrant2
              : null

        return (
          <div key={matchup.id} className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              R{matchup.round}M{matchup.position}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className={selectedEntrant ? 'font-medium' : 'italic text-muted-foreground'}>
              {selectedEntrant?.name ?? 'No prediction'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
