'use client'

import { useState, useEffect, useCallback, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Trophy, Check, Edit3, Lock, ChevronRight, Loader2, Maximize2, Minimize2 } from 'lucide-react'
import type { BracketWithDetails, MatchupData, PredictionData, PredictionScore, TabulationResult } from '@/lib/bracket/types'
import {
  submitPrediction,
  updatePredictionStatus,
  prepareResults,
  overrideWinner,
  releaseResults,
  revealNextRound,
  reopenPredictions,
} from '@/actions/prediction'
import { usePredictions } from '@/hooks/use-predictions'
import { usePredictionCascade } from '@/hooks/use-prediction-cascade'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'
import { RegionBracketView } from '@/components/bracket/region-bracket-view'
import { PredictionPreview } from '@/components/bracket/prediction-preview'
import { PredictionLeaderboard } from '@/components/bracket/prediction-leaderboard'

interface PredictiveBracketProps {
  bracket: BracketWithDetails
  participantId: string
  isTeacher: boolean
  effectivePredictionStatus?: string
}

/**
 * Predictive bracket component supporting simple (form) and advanced (bracket click) modes.
 *
 * Students: Submit/edit predictions during predictions_open phase.
 * Teachers: Manage prediction lifecycle + view aggregate prediction stats.
 */
export function PredictiveBracket({ bracket, participantId, isTeacher, effectivePredictionStatus }: PredictiveBracketProps) {
  const predictiveMode = bracket.predictiveMode ?? 'simple'
  const predictionStatus = effectivePredictionStatus ?? bracket.predictionStatus ?? 'draft'

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
  const router = useRouter()
  const isAutoMode = bracket.predictiveResolutionMode === 'auto'

  // Auto-mode state
  const [tabulationResults, setTabulationResults] = useState<TabulationResult[]>([])
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [revealTab, setRevealTab] = useState<'bracket' | 'leaderboard'>('bracket')
  const [presentationMode, setPresentationMode] = useState(false)
  const [presentationView, setPresentationView] = useState<'bracket' | 'leaderboard'>('bracket')

  const totalRounds = Math.ceil(Math.log2(bracket.maxEntrants ?? bracket.size))
  const revealedUpToRound = bracket.revealedUpToRound ?? 0

  // F key shortcut for presentation mode toggle, Escape to exit
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPresentationMode(false)
        return
      }
      if (e.key === 'f' || e.key === 'F') {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
        setPresentationMode((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      await updatePredictionStatus({
        bracketId: bracket.id,
        status: newStatus,
      })
    })
  }

  // Auto-mode: Prepare Results
  function handlePrepareResults() {
    startTransition(async () => {
      const result = await prepareResults({ bracketId: bracket.id })
      if (result && 'results' in result && result.results) {
        setTabulationResults(result.results as TabulationResult[])
        setUnresolvedCount(result.unresolvedCount ?? 0)
      }
    })
  }

  // Auto-mode: Override Winner (uses results returned directly from override)
  function handleOverrideWinner(matchupId: string, winnerId: string) {
    startTransition(async () => {
      const result = await overrideWinner({ bracketId: bracket.id, matchupId, winnerId })
      if (result && 'results' in result && result.results) {
        setTabulationResults(result.results as TabulationResult[])
        setUnresolvedCount(
          (result.results as TabulationResult[]).filter(
            (r: TabulationResult) => !r.winnerId
          ).length
        )
      }
    })
  }

  // Auto-mode: Release Results
  function handleReleaseResults() {
    startTransition(async () => {
      await releaseResults({ bracketId: bracket.id })
    })
  }

  // Auto-mode: Reveal Next Round
  function handleRevealNextRound() {
    startTransition(async () => {
      await revealNextRound({ bracketId: bracket.id, round: revealedUpToRound + 1 })
    })
  }

  // Auto-mode: Reopen Predictions
  function handleReopenPredictions() {
    startTransition(async () => {
      await reopenPredictions({ bracketId: bracket.id })
    })
  }

  // -------------------------------------------------------------------------
  // Auto mode: render by predictionStatus
  // -------------------------------------------------------------------------
  if (isAutoMode) {
    // --- predictions_open ---
    if (predictionStatus === 'predictions_open' || predictionStatus === 'draft') {
      return (
        <div className="space-y-4">
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
                onClick={handlePrepareResults}
                disabled={isPending}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {isPending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Tabulating...
                  </span>
                ) : (
                  'Close Predictions & Prepare Results'
                )}
              </button>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <PredictiveDiagram
              matchups={bracket.matchups}
              totalRounds={totalRounds}
              bracketSize={bracket.maxEntrants ?? bracket.size}
              showSeedNumbers={bracket.showSeedNumbers}
            />
          </div>
        </div>
      )
    }

    // --- tabulating ---
    if (predictionStatus === 'tabulating') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Predictions
            </span>
            <PredictionStatusBadge status={predictionStatus} />
          </div>
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Tabulating predictions...</p>
          </div>
        </div>
      )
    }

    // --- previewing ---
    if (predictionStatus === 'previewing') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Predictions
            </span>
            <PredictionStatusBadge status={predictionStatus} />
          </div>
          <PredictionPreview
            bracket={bracket}
            tabulationResults={tabulationResults}
            onOverride={handleOverrideWinner}
            onRelease={handleReleaseResults}
            onReopen={handleReopenPredictions}
            unresolvedCount={unresolvedCount}
            isPending={isPending}
          />
        </div>
      )
    }

    // --- revealing ---
    if (predictionStatus === 'revealing') {
      const allRevealed = revealedUpToRound >= totalRounds

      // Presentation mode overlay
      if (presentationMode) {
        return (
          <div className="fixed inset-0 z-40 flex flex-col bg-gray-950">
            {/* Presentation toolbar */}
            <div className="flex items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 py-2">
              <h1 className="text-sm font-bold text-white">{bracket.name}</h1>
              <div className="flex-1" />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPresentationView('bracket')}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    presentationView === 'bracket'
                      ? 'bg-white text-gray-900'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Show Bracket
                </button>
                <button
                  type="button"
                  onClick={() => setPresentationView('leaderboard')}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    presentationView === 'leaderboard'
                      ? 'bg-white text-gray-900'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Show Leaderboard
                </button>
              </div>
              <span className="text-xs text-gray-400">
                Round {revealedUpToRound} of {totalRounds} revealed
              </span>
              {!allRevealed && (
                <button
                  type="button"
                  onClick={handleRevealNextRound}
                  disabled={isPending}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? 'Revealing...' : 'Reveal Next Round'}
                </button>
              )}
              {allRevealed && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('completed')}
                  disabled={isPending}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Complete Bracket
                </button>
              )}
              <button
                type="button"
                onClick={() => setPresentationMode(false)}
                className="rounded p-1 text-gray-400 hover:text-white"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
            {/* Presentation content */}
            <div className="flex-1 overflow-auto p-6">
              {presentationView === 'bracket' ? (
                <div className="rounded-lg bg-gray-900 p-4">
                  <PredictiveDiagram
                    matchups={bracket.matchups}
                    totalRounds={totalRounds}
                    bracketSize={bracket.maxEntrants ?? bracket.size}
                    showSeedNumbers={bracket.showSeedNumbers}
                  />
                </div>
              ) : (
                <div className="mx-auto max-w-2xl [&_*]:text-white">
                  <PredictionLeaderboard
                    bracketId={bracket.id}
                    initialScores={leaderboard}
                    totalRounds={totalRounds}
                    isTeacher={true}
                  />
                </div>
              )}
            </div>
          </div>
        )
      }

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Predictions
            </span>
            <PredictionStatusBadge status={predictionStatus} />
            <span className="text-xs text-muted-foreground">
              Round {revealedUpToRound} of {totalRounds} revealed
            </span>
            <div className="flex-1" />
            {!allRevealed && (
              <button
                type="button"
                onClick={handleRevealNextRound}
                disabled={isPending}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? 'Revealing...' : 'Reveal Next Round'}
              </button>
            )}
            {allRevealed && (
              <button
                type="button"
                onClick={() => handleStatusChange('completed')}
                disabled={isPending}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                Complete Bracket
              </button>
            )}
            <button
              type="button"
              onClick={() => setPresentationMode(true)}
              className="rounded-md border border-input px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title="Presentation mode (F)"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Bracket + Leaderboard tabs */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setRevealTab('bracket')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                revealTab === 'bracket'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Bracket
            </button>
            <button
              type="button"
              onClick={() => setRevealTab('leaderboard')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                revealTab === 'leaderboard'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Leaderboard
            </button>
          </div>

          {revealTab === 'bracket' ? (
            <div className="rounded-lg border p-3">
              <PredictiveDiagram
                matchups={bracket.matchups}
                totalRounds={totalRounds}
                bracketSize={bracket.maxEntrants ?? bracket.size}
                showSeedNumbers={bracket.showSeedNumbers}
              />
            </div>
          ) : (
            <PredictionLeaderboard
              bracketId={bracket.id}
              initialScores={leaderboard}
              totalRounds={totalRounds}
              isTeacher={true}
            />
          )}
        </div>
      )
    }

    // --- completed ---
    if (predictionStatus === 'completed') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Predictions
            </span>
            <PredictionStatusBadge status={predictionStatus} />
            <span className="text-xs text-green-600">All rounds revealed</span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setPresentationMode(true)}
              className="rounded-md border border-input px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title="Presentation mode (F)"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {presentationMode && (
            <div className="fixed inset-0 z-40 flex flex-col bg-gray-950">
              {/* Presentation toolbar */}
              <div className="flex items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 py-2">
                <h1 className="text-sm font-bold text-white">{bracket.name} — Results</h1>
                <div className="flex-1" />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPresentationView('bracket')}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      presentationView === 'bracket'
                        ? 'bg-white text-gray-900'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Bracket
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresentationView('leaderboard')}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      presentationView === 'leaderboard'
                        ? 'bg-white text-gray-900'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Leaderboard
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPresentationMode(false)}
                  className="rounded p-1 text-gray-400 hover:text-white"
                  title="Exit (Esc)"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>
              {/* Presentation content */}
              <div className="flex-1 overflow-auto p-6">
                {presentationView === 'bracket' ? (
                  <div className="rounded-lg bg-gray-900 p-4">
                    <PredictiveDiagram
                      matchups={bracket.matchups}
                      totalRounds={totalRounds}
                      bracketSize={bracket.maxEntrants ?? bracket.size}
                      showSeedNumbers={bracket.showSeedNumbers}
                    />
                  </div>
                ) : (
                  <div className="mx-auto max-w-2xl [&_*]:text-white">
                    <PredictionLeaderboard
                      bracketId={bracket.id}
                      initialScores={leaderboard}
                      totalRounds={totalRounds}
                      isTeacher={true}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border p-3">
            <PredictiveDiagram
              matchups={bracket.matchups}
              totalRounds={totalRounds}
              bracketSize={bracket.maxEntrants ?? bracket.size}
              showSeedNumbers={bracket.showSeedNumbers}
            />
          </div>

          <PredictionLeaderboard
            bracketId={bracket.id}
            initialScores={leaderboard}
            totalRounds={totalRounds}
            isTeacher={true}
          />
        </div>
      )
    }

    // --- active (auto mode, after predictions closed) ---
    // This state is transitional -- teacher should prepare results
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Predictions
          </span>
          <PredictionStatusBadge status={predictionStatus} />
          <div className="flex-1" />
          <button
            type="button"
            onClick={handlePrepareResults}
            disabled={isPending}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Tabulating...
              </span>
            ) : (
              'Prepare Results'
            )}
          </button>
        </div>

        <div className="rounded-lg border p-3">
          <PredictiveDiagram
            matchups={bracket.matchups}
            totalRounds={totalRounds}
            bracketSize={bracket.maxEntrants ?? bracket.size}
            showSeedNumbers={bracket.showSeedNumbers}
          />
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Manual / vote_based mode (existing behavior, unchanged)
  // -------------------------------------------------------------------------
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
            onClick={() => {
              startTransition(async () => {
                const result = await updatePredictionStatus({
                  bracketId: bracket.id,
                  status: 'active',
                })
                if (!result || !('error' in result)) {
                  router.push(`/brackets/${bracket.id}/live`)
                }
              })
            }}
            disabled={isPending}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            Close Predictions & Start
          </button>
        )}
      </div>

      {/* Bracket diagram */}
      <div className="rounded-lg border p-3">
        <PredictiveDiagram
          matchups={bracket.matchups}
          totalRounds={totalRounds}
          bracketSize={bracket.maxEntrants ?? bracket.size}
          showSeedNumbers={bracket.showSeedNumbers}
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
  const isPredictionsOpen = predictionStatus === 'predictions_open'
  const hasSubmitted = myPredictions.length > 0
  const [isEditing, setIsEditing] = useState(myPredictions.length === 0)
  const [isPending, startTransition] = useTransition()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const initialSelections = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of myPredictions) {
      map[p.matchupId] = p.predictedWinnerId
    }
    return map
  }, [myPredictions])

  const {
    augmentedMatchups,
    selectableMatchups,
    selections,
    handleSelect,
    totalSelectableCount,
    selectedCount,
    allSelected,
  } = usePredictionCascade({
    matchups: bracket.matchups,
    initialSelections,
    enabled: isPredictionsOpen && (isEditing || !hasSubmitted),
  })

  // Build a Map for ReadOnlyPredictions from augmented matchups + selections
  const readOnlyMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const [matchupId, entrantId] of Object.entries(selections)) {
      map.set(matchupId, entrantId)
    }
    return map
  }, [selections])

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
      } else if (result && 'error' in result) {
        // Server rejected (e.g., predictions closed)
        alert(result.error as string)
        setIsEditing(false)
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
          <ReadOnlyPredictions matchups={augmentedMatchups.filter((m) => !m.isBye && m.entrant1Id && m.entrant2Id)} selections={readOnlyMap} />
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
            Predictions submitted ({Object.keys(selections).length} picks)
          </span>
          <div className="flex-1" />
          {isPredictionsOpen && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
            >
              <Edit3 className="h-3 w-3" />
              Edit Predictions
            </button>
          )}
        </div>
        <ReadOnlyPredictions matchups={augmentedMatchups.filter((m) => !m.isBye && m.entrant1Id && m.entrant2Id)} selections={readOnlyMap} />
      </div>
    )
  }

  // -- One-at-a-time prediction form (matches SimpleVotingView pattern) --
  const safeIndex = Math.max(0, Math.min(currentIndex, selectableMatchups.length - 1))
  const currentMatchup = selectableMatchups[safeIndex]

  // All predictions made: only true when index has advanced past end AND cascade is complete
  const allPicked = currentIndex >= selectableMatchups.length && allSelected

  return (
    <div className="mx-auto max-w-md px-2 py-4 sm:px-4 sm:py-6">
      <h2 className="mb-4 text-center text-xl font-bold sm:text-2xl">{bracket.name}</h2>

      {/* Progress indicator (hidden when showing confirmation or all picked) */}
      {!allPicked && !showConfirmation && (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Prediction {safeIndex + 1} of {totalSelectableCount}
        </p>
      )}

      {/* Back button (hidden when at first or showing confirmation or all picked) */}
      {!allPicked && !showConfirmation && currentIndex > 0 && (
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          className="mb-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-3 w-3 rotate-180" />
          Previous
        </button>
      )}

      {/* Animated card area */}
      <div className="flex justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {allPicked ? (
            /* All predictions made: show submit card */
            <motion.div
              key="all-done"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full max-w-md"
            >
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-8 w-8 text-green-600 dark:text-green-400">
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-foreground">All predictions made!</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{selectedCount} of {totalSelectableCount} predictions</span>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!allSelected || isPending}
                  className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? 'Submitting...' : hasSubmitted ? 'Update Predictions' : 'Submit All Predictions'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Review predictions
                </button>
              </div>
            </motion.div>
          ) : showConfirmation ? (
            <motion.div
              key={`confirm-${safeIndex}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full max-w-md"
            >
              <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border bg-card p-8 shadow-sm">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-primary">
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-foreground">Vote Submitted!</p>
              </div>
            </motion.div>
          ) : currentMatchup ? (
            <motion.div
              key={`matchup-${currentMatchup.id}`}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full"
            >
              <MatchupPredictionCard
                matchup={currentMatchup}
                selectedWinnerId={selections[currentMatchup.id] ?? null}
                onSelect={(entrantId) => {
                  handleSelect(currentMatchup.id, entrantId)
                  setShowConfirmation(true)
                  setTimeout(() => {
                    setShowConfirmation(false)
                    setCurrentIndex((i) => i + 1)
                  }, 1200)
                }}
                isSpeculative={currentMatchup.round > 1}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
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
  const isPredictionsOpen = predictionStatus === 'predictions_open'
  const hasSubmitted = myPredictions.length > 0
  const [isEditing, setIsEditing] = useState(myPredictions.length === 0)
  const [isPending, startTransition] = useTransition()

  const totalRounds = Math.ceil(Math.log2(bracket.maxEntrants ?? bracket.size))

  const initialSelections = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of myPredictions) {
      map[p.matchupId] = p.predictedWinnerId
    }
    return map
  }, [myPredictions])

  const {
    augmentedMatchups,
    selections,
    handleSelect,
    totalSelectableCount,
    selectedCount,
    allSelected,
  } = usePredictionCascade({
    matchups: bracket.matchups,
    initialSelections,
    enabled: isPredictionsOpen && (isEditing || !hasSubmitted),
  })

  // Build votedEntrantIds map for the bracket diagram (reuse its highlight system)
  const votedEntrantIds = useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const [matchupId, entrantId] of Object.entries(selections)) {
      map[matchupId] = entrantId
    }
    return map
  }, [selections])

  // Build existing prediction map for read-only views
  const existingMap = useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const p of myPredictions) {
      map[p.matchupId] = p.predictedWinnerId
    }
    return map
  }, [myPredictions])

  // Matchup IDs still needing predictions (for region nav counts)
  const pendingPredictionIds = useMemo(() => {
    const ids = new Set<string>()
    for (const m of augmentedMatchups) {
      if (m.entrant1Id && m.entrant2Id && !m.isBye && !selections[m.id]) {
        ids.add(m.id)
      }
    }
    return ids
  }, [augmentedMatchups, selections])

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
      } else if (result && 'error' in result) {
        // Server rejected (e.g., predictions closed)
        alert(result.error as string)
        setIsEditing(false)
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
            <PredictiveDiagram
              matchups={bracket.matchups}
              totalRounds={totalRounds}
              bracketSize={bracket.maxEntrants ?? bracket.size}
              votedEntrantIds={existingMap}
              showSeedNumbers={bracket.showSeedNumbers}
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
            Predictions submitted ({Object.keys(selections).length} picks)
          </span>
          <div className="flex-1" />
          {isPredictionsOpen && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
            >
              <Edit3 className="h-3 w-3" />
              Edit Predictions
            </button>
          )}
        </div>
        <div className="rounded-lg border p-3">
          <PredictiveDiagram
            matchups={augmentedMatchups}
            totalRounds={totalRounds}
            bracketSize={bracket.maxEntrants ?? bracket.size}
            votedEntrantIds={votedEntrantIds}
            showSeedNumbers={bracket.showSeedNumbers}
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
          Click an entrant to predict the winner. {selectedCount} of {totalSelectableCount} picks made.
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${totalSelectableCount > 0 ? (selectedCount / totalSelectableCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Interactive bracket diagram -- uses augmentedMatchups to show speculative entrants */}
      <div className="rounded-lg border p-3">
        <PredictiveDiagram
          matchups={augmentedMatchups}
          totalRounds={totalRounds}
          bracketSize={bracket.maxEntrants ?? bracket.size}
          onEntrantClick={(matchupId, entrantId) => handleSelect(matchupId, entrantId)}
          votedEntrantIds={votedEntrantIds}
          allowPendingClick
          pendingPredictionIds={pendingPredictionIds}
          showSeedNumbers={bracket.showSeedNumbers}
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

/** Renders RegionBracketView for 32+ entrants, BracketDiagram otherwise */
function PredictiveDiagram(props: {
  matchups: MatchupData[]
  totalRounds: number
  bracketSize: number
  votedEntrantIds?: Record<string, string | null>
  onEntrantClick?: (matchupId: string, entrantId: string) => void
  allowPendingClick?: boolean
  pendingPredictionIds?: Set<string>
  showSeedNumbers?: boolean
}) {
  if (props.bracketSize >= 32) {
    return <RegionBracketView {...props} />
  }
  const { pendingPredictionIds, ...diagramProps } = props
  return <BracketDiagram {...diagramProps} />
}

function PredictionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    predictions_open: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    tabulating: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    previewing: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
    revealing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    completed: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  }

  const labels: Record<string, string> = {
    draft: 'Draft',
    predictions_open: 'Predictions Open',
    active: 'Active',
    tabulating: 'Tabulating',
    previewing: 'Previewing',
    revealing: 'Revealing',
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
  isSpeculative = false,
}: {
  matchup: MatchupData
  selectedWinnerId: string | null
  onSelect: (entrantId: string) => void
  isSpeculative?: boolean
}) {
  const entrant1 = matchup.entrant1
  const entrant2 = matchup.entrant2
  const hasVoted = selectedWinnerId !== null

  function renderEntrantButton(
    entrant: MatchupData['entrant1'],
    entrantId: string | null
  ) {
    if (!entrant || !entrantId) {
      return (
        <div className="flex min-h-20 flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/50 px-6 py-6">
          <span className="text-2xl font-medium text-muted-foreground italic sm:text-3xl">TBD</span>
        </div>
      )
    }

    const isSelected = selectedWinnerId === entrantId
    const isNotChosen = hasVoted && !isSelected
    const isInteractive = !hasVoted

    return (
      <button
        type="button"
        onClick={() => onSelect(entrantId)}
        disabled={!isInteractive}
        className={`
          relative flex min-h-20 flex-1 flex-col items-center justify-center rounded-xl border-2 px-6 py-6
          transition-all duration-200
          ${isInteractive ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
          ${isSelected
            ? 'border-primary bg-primary/10 shadow-md'
            : isNotChosen
              ? 'border-border bg-muted/50 opacity-50'
              : 'border-border bg-card hover:border-primary/50'
          }
          disabled:opacity-70
        `}
      >
        {entrant.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <div className="mb-2 h-28 w-28 overflow-hidden rounded-lg sm:h-36 sm:w-36">
            <img src={entrant.logoUrl} alt={entrant.name} className="h-full w-full object-cover" />
          </div>
        )}
        <span className={`text-center text-2xl font-semibold sm:text-3xl ${isNotChosen ? 'text-muted-foreground' : ''}`}>
          {entrant.name}
        </span>

        {/* Checkmark for selected entrant */}
        {isSelected && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
      </button>
    )
  }

  return (
    <div className={`w-full max-w-2xl rounded-xl border border-gray-300 dark:border-border bg-card p-6 shadow-sm ${hasVoted ? 'bg-green-50 dark:bg-green-950/30' : ''} ${isSpeculative ? 'border-dashed !border-blue-300 dark:!border-blue-700' : ''}`}>
      {/* Round/match label */}
      <div className="mb-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Round {matchup.round}, Match {matchup.position}</span>
        {isSpeculative && (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            predicted matchup
          </span>
        )}
      </div>

      {/* Entrant buttons with VS divider */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {renderEntrantButton(entrant1, entrant1?.id ?? null)}

        <span className="flex-shrink-0 text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
          VS
        </span>

        {renderEntrantButton(entrant2, entrant2?.id ?? null)}
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
            {selectedEntrant?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedEntrant.logoUrl} alt="" className="h-4 w-4 shrink-0 rounded-md object-cover" />
            )}
            <span className={selectedEntrant ? 'font-medium' : 'italic text-muted-foreground'}>
              {selectedEntrant?.name ?? 'No prediction'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
