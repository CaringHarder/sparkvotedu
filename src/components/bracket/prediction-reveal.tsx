'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Check, X } from 'lucide-react'
import type { BracketWithDetails, MatchupData, PredictionData, PredictionScore } from '@/lib/bracket/types'
import { usePredictions } from '@/hooks/use-predictions'
import { PredictionLeaderboard } from '@/components/bracket/prediction-leaderboard'
import { CountdownOverlay } from '@/components/bracket/countdown-overlay'
import { PodiumCelebration } from '@/components/bracket/podium-celebration'
import {
  BracketDiagram,
  MATCH_WIDTH,
  MATCH_HEIGHT,
  ROUND_GAP,
  MATCH_V_GAP,
  PADDING,
  LABEL_HEIGHT,
  getMatchPosition,
} from '@/components/bracket/bracket-diagram'

interface PredictionRevealProps {
  bracket: BracketWithDetails
  participantId: string
  myPredictions: PredictionData[]
  initialScores: PredictionScore[]
}

/**
 * Student reveal experience for auto-resolution predictive brackets.
 *
 * Two tabs: "Leaderboard" (default) and "Bracket".
 * - Leaderboard: live-updating prediction scores with animated rank changes
 * - Bracket: accuracy overlay showing green (correct) / red (wrong) predictions
 *
 * Progressive reveal:
 * - 3-2-1 countdown between rounds (not for Round 1)
 * - Bracket fills in as rounds are revealed
 * - Top-3 podium celebration after final reveal
 *
 * Locked decisions honored:
 * - Prediction vote counts NEVER shown to students
 * - Leaderboard shows rank + total points only
 * - Default tab is Leaderboard
 * - Top 3 celebration is the finale
 */
export function PredictionReveal({
  bracket,
  participantId,
  myPredictions: initialPredictions,
  initialScores,
}: PredictionRevealProps) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'bracket'>('leaderboard')
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownRound, setCountdownRound] = useState(0)
  const [showPodium, setShowPodium] = useState(false)
  const [podiumDismissed, setPodiumDismissed] = useState(false)

  const totalRounds = Math.ceil(Math.log2(bracket.maxEntrants ?? bracket.size))

  // Real-time updates
  const {
    leaderboard,
    myPredictions: realtimePredictions,
    revealedUpToRound,
    revealComplete,
  } = usePredictions(bracket.id, participantId)

  // Use real-time predictions or initial
  const currentPredictions = realtimePredictions.length > 0 ? realtimePredictions : initialPredictions
  const currentScores = leaderboard.length > 0 ? leaderboard : initialScores

  // Track previous revealed round for countdown trigger
  const prevRevealedRoundRef = useRef<number | null>(bracket.revealedUpToRound ?? null)

  // Effective revealedUpToRound (from hook or initial bracket data)
  const effectiveRevealedRound = revealedUpToRound ?? bracket.revealedUpToRound ?? null

  // Trigger countdown when a new round is revealed (not for Round 1)
  useEffect(() => {
    if (effectiveRevealedRound == null) return
    const prevRound = prevRevealedRoundRef.current

    if (prevRound != null && effectiveRevealedRound > prevRound && effectiveRevealedRound > 1) {
      setCountdownRound(effectiveRevealedRound)
      setShowCountdown(true)
    }

    prevRevealedRoundRef.current = effectiveRevealedRound
  }, [effectiveRevealedRound])

  // Show podium when reveal completes
  useEffect(() => {
    if (revealComplete && !podiumDismissed) {
      // Small delay after final reveal for dramatic effect
      const timer = setTimeout(() => setShowPodium(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [revealComplete, podiumDismissed])

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false)
  }, [])

  const handlePodiumDismiss = useCallback(() => {
    setShowPodium(false)
    setPodiumDismissed(true)
    setActiveTab('leaderboard')
  }, [])

  // Build prediction lookup: matchupId -> predictedWinnerId
  const predictionMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of currentPredictions) {
      map.set(p.matchupId, p.predictedWinnerId)
    }
    return map
  }, [currentPredictions])

  // Compute accuracy stats
  const { correctCount, totalRevealed } = useMemo(() => {
    let correct = 0
    let total = 0

    for (const matchup of bracket.matchups) {
      if (matchup.status !== 'decided' || !matchup.winnerId) continue
      // Only count revealed matchups (up to revealedUpToRound)
      if (effectiveRevealedRound != null && matchup.round > effectiveRevealedRound) continue

      const predicted = predictionMap.get(matchup.id)
      if (predicted) {
        total++
        if (predicted === matchup.winnerId) {
          correct++
        }
      }
    }

    return { correctCount: correct, totalRevealed: total }
  }, [bracket.matchups, predictionMap, effectiveRevealedRound])

  // Build top 3 for podium from current scores
  const top3 = useMemo(() => {
    return currentScores.slice(0, 3).map((score, index) => ({
      rank: (index + 1) as 1 | 2 | 3,
      name: score.participantName || 'Student',
      points: score.totalPoints,
      correctPicks: score.correctPicks,
    }))
  }, [currentScores])

  // Determine if bracket is in completed state (predictionStatus='completed' or podium dismissed)
  const isCompleted = bracket.predictionStatus === 'completed' || podiumDismissed

  return (
    <div className="space-y-3">
      {/* Countdown overlay */}
      {showCountdown && (
        <CountdownOverlay
          roundNumber={countdownRound}
          onComplete={handleCountdownComplete}
        />
      )}

      {/* Podium celebration */}
      {showPodium && top3.length > 0 && (
        <PodiumCelebration
          top3={top3}
          bracketName={bracket.name}
          onDismiss={handlePodiumDismiss}
        />
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">{bracket.name}</h1>
        {isCompleted && (
          <p className="mt-1 text-sm text-muted-foreground">Results are final</p>
        )}
        {!isCompleted && effectiveRevealedRound != null && (
          <p className="mt-1 text-sm text-muted-foreground">
            Revealing round {effectiveRevealedRound} of {totalRounds}
          </p>
        )}
      </div>

      {/* Tab bar - segmented control style matching PredictiveBracket */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'leaderboard'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Leaderboard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bracket')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'bracket'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Bracket
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'leaderboard' ? (
        <PredictionLeaderboard
          bracketId={bracket.id}
          initialScores={initialScores}
          totalRounds={totalRounds}
          isTeacher={false}
          isStudent={true}
          currentParticipantId={participantId}
        />
      ) : (
        <BracketAccuracyView
          bracket={bracket}
          predictionMap={predictionMap}
          correctCount={correctCount}
          totalRevealed={totalRevealed}
          totalRounds={totalRounds}
          revealedUpToRound={effectiveRevealedRound}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bracket tab: accuracy overlay showing green/red predictions
// ---------------------------------------------------------------------------

function BracketAccuracyView({
  bracket,
  predictionMap,
  correctCount,
  totalRevealed,
  totalRounds,
  revealedUpToRound,
}: {
  bracket: BracketWithDetails
  predictionMap: Map<string, string>
  correctCount: number
  totalRevealed: number
  totalRounds: number
  revealedUpToRound: number | null
}) {
  // Compute SVG dimensions (same as BracketDiagram)
  const svgWidth = PADDING * 2 + totalRounds * MATCH_WIDTH + (totalRounds - 1) * ROUND_GAP
  const round1Matches = Math.pow(2, totalRounds - 1)
  const svgHeight =
    PADDING * 2 +
    LABEL_HEIGHT +
    round1Matches * MATCH_HEIGHT +
    (round1Matches - 1) * MATCH_V_GAP

  // Build accuracy data for each matchup
  const accuracyData = useMemo(() => {
    const data: Array<{
      matchup: MatchupData
      pos: { x: number; y: number }
      isCorrect: boolean | null // null = not revealed/no prediction
      predictedName: string | null // wrong prediction's entrant name
    }> = []

    for (const matchup of bracket.matchups) {
      // Skip bye matchups
      if (matchup.isBye) continue

      const pos = getMatchPosition(matchup.round, matchup.position, totalRounds)

      // Only show accuracy for revealed, decided matchups
      if (matchup.status !== 'decided' || !matchup.winnerId) {
        data.push({ matchup, pos, isCorrect: null, predictedName: null })
        continue
      }

      // Check if matchup round is within revealed range
      if (revealedUpToRound != null && matchup.round > revealedUpToRound) {
        data.push({ matchup, pos, isCorrect: null, predictedName: null })
        continue
      }

      const predicted = predictionMap.get(matchup.id)
      if (!predicted) {
        data.push({ matchup, pos, isCorrect: null, predictedName: null })
        continue
      }

      const isCorrect = predicted === matchup.winnerId

      // For wrong predictions, find the entrant name the student picked
      let predictedName: string | null = null
      if (!isCorrect) {
        if (predicted === matchup.entrant1Id) {
          predictedName = matchup.entrant1?.name ?? null
        } else if (predicted === matchup.entrant2Id) {
          predictedName = matchup.entrant2?.name ?? null
        }
      }

      data.push({ matchup, pos, isCorrect, predictedName })
    }

    return data
  }, [bracket.matchups, predictionMap, totalRounds, revealedUpToRound])

  return (
    <div>
      {/* X/Y correct counter */}
      <div className="mb-3 flex items-center justify-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-semibold">
            {correctCount}/{totalRevealed} correct
          </span>
        </div>
      </div>

      {/* Bracket diagram with accuracy overlay */}
      <div className="relative" style={{ width: '100%' }}>
        {/* Base bracket diagram */}
        <BracketDiagram
          matchups={bracket.matchups}
          totalRounds={totalRounds}
          bracketSize={bracket.maxEntrants ?? bracket.size}
        />

        {/* SVG accuracy overlay (positioned on top) */}
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMinYMin meet"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 'auto',
            pointerEvents: 'none',
          }}
        >
          {accuracyData.map(({ matchup, pos, isCorrect, predictedName }) => {
            if (isCorrect === null) return null

            return (
              <g key={`accuracy-${matchup.id}`}>
                {/* Green/red background overlay */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={MATCH_WIDTH}
                  height={MATCH_HEIGHT}
                  rx={6}
                  ry={6}
                  style={{
                    fill: isCorrect
                      ? 'rgba(34, 197, 94, 0.15)' // green-500 at 15%
                      : 'rgba(239, 68, 68, 0.15)', // red-500 at 15%
                    stroke: isCorrect
                      ? 'rgba(34, 197, 94, 0.5)' // green-500 at 50%
                      : 'rgba(239, 68, 68, 0.5)', // red-500 at 50%
                    strokeWidth: 1.5,
                  }}
                />

                {/* Correct: checkmark badge */}
                {isCorrect && (
                  <g>
                    <circle
                      cx={pos.x + MATCH_WIDTH - 8}
                      cy={pos.y + 8}
                      r={6}
                      style={{ fill: 'rgba(34, 197, 94, 0.9)' }}
                    />
                    <text
                      x={pos.x + MATCH_WIDTH - 8}
                      y={pos.y + 11.5}
                      textAnchor="middle"
                      style={{
                        fill: 'white',
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    >
                      {'\\u2713'}
                    </text>
                  </g>
                )}

                {/* Wrong: X badge + predicted name with strikethrough */}
                {!isCorrect && (
                  <g>
                    <circle
                      cx={pos.x + MATCH_WIDTH - 8}
                      cy={pos.y + 8}
                      r={6}
                      style={{ fill: 'rgba(239, 68, 68, 0.9)' }}
                    />
                    <text
                      x={pos.x + MATCH_WIDTH - 8}
                      y={pos.y + 11.5}
                      textAnchor="middle"
                      style={{
                        fill: 'white',
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    >
                      {'\\u2717'}
                    </text>

                    {/* Strikethrough predicted name below the matchup box */}
                    {predictedName && (
                      <text
                        x={pos.x + MATCH_WIDTH / 2}
                        y={pos.y + MATCH_HEIGHT + 11}
                        textAnchor="middle"
                        style={{
                          fill: 'rgba(239, 68, 68, 0.7)',
                          fontSize: 9,
                          fontFamily: 'inherit',
                          textDecoration: 'line-through',
                        }}
                      >
                        You picked: {predictedName}
                      </text>
                    )}
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
