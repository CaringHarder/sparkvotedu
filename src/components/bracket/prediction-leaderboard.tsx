'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Trophy, ChevronDown, ChevronRight, Check, X, BarChart3, Users } from 'lucide-react'
import type { PredictionScore } from '@/lib/bracket/types'
import { getPointsForRound } from '@/lib/bracket/predictive'
import { usePredictions } from '@/hooks/use-predictions'
import { getMatchupStats } from '@/actions/prediction'

// Per-matchup stats shape (from server action)
type MatchupStatsMap = Record<
  string,
  {
    entrant1Id: string | null
    entrant2Id: string | null
    entrant1Name: string | null
    entrant2Name: string | null
    winnerId: string | null
    entrant1Predictions: number
    entrant2Predictions: number
    totalPredictions: number
  }
>

interface PredictionLeaderboardProps {
  bracketId: string
  initialScores: PredictionScore[]
  totalRounds: number
  isTeacher: boolean
  participantId?: string
}

/**
 * Predictive bracket leaderboard with dual views:
 * - Student: Rank, Name, Score (current student highlighted, top 3 medals)
 * - Teacher: Rank, Name, Score, Correct Picks, Accuracy % with expandable per-round breakdown
 *
 * Includes per-matchup prediction stats for resolved matchups.
 * Live updates via usePredictions hook.
 */
export function PredictionLeaderboard({
  bracketId,
  initialScores,
  totalRounds,
  isTeacher,
  participantId,
}: PredictionLeaderboardProps) {
  const { leaderboard, isLoading } = usePredictions(bracketId, participantId)
  const [matchupStats, setMatchupStats] = useState<MatchupStatsMap>({})
  const [statsLoading, setStatsLoading] = useState(false)

  // Use real-time leaderboard if available, otherwise initial scores
  const scores = leaderboard.length > 0 ? leaderboard : initialScores

  // Fetch matchup stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const result = await getMatchupStats(bracketId)
      if ('stats' in result && result.stats) {
        setMatchupStats(result.stats)
      }
    } catch {
      // Non-fatal
    } finally {
      setStatsLoading(false)
    }
  }, [bracketId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats, scores]) // Re-fetch when scores update (new matchups resolved)

  // Empty state: no predictions submitted
  if (!isLoading && scores.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No predictions submitted yet.
        </p>
      </div>
    )
  }

  // Check if any matchups have been resolved
  const hasResolvedMatchups = scores.some((s) => s.totalPicks > 0)

  if (!isLoading && !hasResolvedMatchups && scores.length > 0) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No matchups resolved yet. Leaderboard will appear as matches are decided.
        </p>
      </div>
    )
  }

  if (isTeacher) {
    return (
      <div className="space-y-4">
        <TeacherLeaderboard scores={scores} totalRounds={totalRounds} />
        <MatchupPredictionStats stats={matchupStats} loading={statsLoading} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <StudentLeaderboard scores={scores} participantId={participantId} />
      <MatchupPredictionStats stats={matchupStats} loading={statsLoading} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rank badge with gold/silver/bronze styling (matching 05-04 poll leaderboard)
// ---------------------------------------------------------------------------

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white">
        <Trophy className="h-3.5 w-3.5" />
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-white dark:bg-gray-500">
        2
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
        3
      </span>
    )
  }
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center text-xs font-medium text-muted-foreground">
      {rank}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Student Leaderboard: Rank + Name + Score (current student highlighted)
// ---------------------------------------------------------------------------

function StudentLeaderboard({
  scores,
  participantId,
}: {
  scores: PredictionScore[]
  participantId?: string
}) {
  // Find current student's score for summary
  const myScore = participantId
    ? scores.find((s) => s.participantId === participantId)
    : null
  const myRank = myScore
    ? scores.indexOf(myScore) + 1
    : null

  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Prediction Leaderboard
      </h2>

      {/* Own score summary */}
      {myScore && myRank && (
        <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RankBadge rank={myRank} />
              <span className="text-sm font-semibold">Your Score</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold">{myScore.totalPoints}</span>
              <span className="ml-1 text-xs text-muted-foreground">pts</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {myScore.correctPicks}/{myScore.totalPicks} correct predictions
          </p>
        </div>
      )}

      {/* Leaderboard table */}
      <div className="rounded-lg border">
        {/* Desktop table */}
        <table className="hidden w-full text-sm sm:table">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="w-12 px-3 py-2 font-semibold">Rank</th>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 text-right font-semibold">Score</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, index) => {
              const rank = index + 1
              const isCurrentStudent = score.participantId === participantId
              return (
                <tr
                  key={score.participantId}
                  className={`border-b last:border-0 transition-colors ${
                    isCurrentStudent
                      ? 'bg-primary/5 font-medium'
                      : ''
                  }`}
                >
                  <td className="px-3 py-2">
                    <RankBadge rank={rank} />
                  </td>
                  <td className="px-3 py-2">
                    {score.participantName || 'Student'}
                    {isCurrentStudent && (
                      <span className="ml-1.5 text-xs text-primary">(you)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {score.totalPoints}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Mobile stacked cards */}
        <div className="divide-y sm:hidden">
          {scores.map((score, index) => {
            const rank = index + 1
            const isCurrentStudent = score.participantId === participantId
            return (
              <div
                key={score.participantId}
                className={`flex items-center gap-3 px-3 py-2.5 ${
                  isCurrentStudent ? 'bg-primary/5' : ''
                }`}
              >
                <RankBadge rank={rank} />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {score.participantName || 'Student'}
                  {isCurrentStudent && (
                    <span className="ml-1 text-xs text-primary">(you)</span>
                  )}
                </span>
                <span className="text-sm font-semibold">{score.totalPoints} pts</span>
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {scores.length} participant{scores.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Teacher Leaderboard: Expandable rows with per-round breakdown
// ---------------------------------------------------------------------------

function TeacherLeaderboard({
  scores,
  totalRounds,
}: {
  scores: PredictionScore[]
  totalRounds: number
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Prediction Leaderboard
      </h2>

      <div className="rounded-lg border">
        {/* Desktop table */}
        <table className="hidden w-full text-sm sm:table">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="w-8 px-3 py-2"></th>
              <th className="w-12 px-3 py-2 font-semibold">Rank</th>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 text-right font-semibold">Score</th>
              <th className="px-3 py-2 text-right font-semibold">Correct</th>
              <th className="px-3 py-2 text-right font-semibold">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, index) => {
              const rank = index + 1
              const isExpanded = expandedId === score.participantId
              const accuracy =
                score.totalPicks > 0
                  ? Math.round((score.correctPicks / score.totalPicks) * 100)
                  : 0

              return (
                <TeacherRow
                  key={score.participantId}
                  score={score}
                  rank={rank}
                  accuracy={accuracy}
                  isExpanded={isExpanded}
                  totalRounds={totalRounds}
                  onToggle={() =>
                    setExpandedId(isExpanded ? null : score.participantId)
                  }
                />
              )
            })}
          </tbody>
        </table>

        {/* Mobile stacked cards */}
        <div className="divide-y sm:hidden">
          {scores.map((score, index) => {
            const rank = index + 1
            const isExpanded = expandedId === score.participantId
            const accuracy =
              score.totalPicks > 0
                ? Math.round((score.correctPicks / score.totalPicks) * 100)
                : 0

            return (
              <TeacherMobileRow
                key={score.participantId}
                score={score}
                rank={rank}
                accuracy={accuracy}
                isExpanded={isExpanded}
                totalRounds={totalRounds}
                onToggle={() =>
                  setExpandedId(isExpanded ? null : score.participantId)
                }
              />
            )
          })}
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {scores.length} participant{scores.length !== 1 ? 's' : ''} &middot;
        Click a row to see per-round breakdown
      </p>
    </div>
  )
}

// Teacher row (desktop) with expandable per-round breakdown
function TeacherRow({
  score,
  rank,
  accuracy,
  isExpanded,
  totalRounds,
  onToggle,
}: {
  score: PredictionScore
  rank: number
  accuracy: number
  isExpanded: boolean
  totalRounds: number
  onToggle: () => void
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b transition-colors hover:bg-accent/50"
        onClick={onToggle}
      >
        <td className="px-3 py-2">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </td>
        <td className="px-3 py-2">
          <RankBadge rank={rank} />
        </td>
        <td className="px-3 py-2">{score.participantName || 'Student'}</td>
        <td className="px-3 py-2 text-right font-semibold">{score.totalPoints}</td>
        <td className="px-3 py-2 text-right">
          {score.correctPicks}/{score.totalPicks}
        </td>
        <td className="px-3 py-2 text-right">{accuracy}%</td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="border-b bg-muted/30 px-6 py-3">
            <RoundBreakdown
              pointsByRound={score.pointsByRound}
              totalRounds={totalRounds}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// Teacher row (mobile) with expandable per-round breakdown
function TeacherMobileRow({
  score,
  rank,
  accuracy,
  isExpanded,
  totalRounds,
  onToggle,
}: {
  score: PredictionScore
  rank: number
  accuracy: number
  isExpanded: boolean
  totalRounds: number
  onToggle: () => void
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <RankBadge rank={rank} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{score.participantName || 'Student'}</div>
          <div className="text-xs text-muted-foreground">
            {score.correctPicks}/{score.totalPicks} correct &middot; {accuracy}%
          </div>
        </div>
        <span className="text-sm font-semibold">{score.totalPoints} pts</span>
      </button>
      {isExpanded && (
        <div className="border-t bg-muted/30 px-6 py-3">
          <RoundBreakdown
            pointsByRound={score.pointsByRound}
            totalRounds={totalRounds}
          />
        </div>
      )}
    </div>
  )
}

// Per-round scoring breakdown (shared by desktop and mobile)
function RoundBreakdown({
  pointsByRound,
  totalRounds,
}: {
  pointsByRound: Record<number, { correct: number; total: number; points: number }>
  totalRounds: number
}) {
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1)

  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold text-muted-foreground">Per-Round Breakdown</h4>
      {rounds.map((round) => {
        const data = pointsByRound[round]
        const ptsPerPick = getPointsForRound(round)

        if (!data) {
          return (
            <div
              key={round}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span className="w-36">
                Round {round} ({ptsPerPick}pt{ptsPerPick !== 1 ? 's' : ''} each)
              </span>
              <span className="italic">No resolved matchups</span>
            </div>
          )
        }

        const wrong = data.total - data.correct

        return (
          <div key={round} className="flex items-center gap-2 text-xs">
            <span className="w-36 text-muted-foreground">
              Round {round} ({ptsPerPick}pt{ptsPerPick !== 1 ? 's' : ''} each)
            </span>
            <span className="flex items-center gap-1">
              {data.correct > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded bg-green-50 px-1.5 py-0.5 text-green-700 dark:bg-green-950 dark:text-green-300">
                  <Check className="h-3 w-3" />
                  {data.correct}
                </span>
              )}
              {wrong > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-red-700 dark:bg-red-950 dark:text-red-300">
                  <X className="h-3 w-3" />
                  {wrong}
                </span>
              )}
            </span>
            <span className="font-medium">= {data.points} pts</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Per-matchup prediction stats (shown in both views for resolved matchups)
// ---------------------------------------------------------------------------

function MatchupPredictionStats({
  stats,
  loading,
}: {
  stats: MatchupStatsMap
  loading: boolean
}) {
  const matchupIds = Object.keys(stats)

  if (loading && matchupIds.length === 0) {
    return null
  }

  if (matchupIds.length === 0) {
    return null
  }

  return (
    <div>
      <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" />
        Prediction Stats
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {matchupIds.map((matchupId) => {
          const s = stats[matchupId]
          const total = s.totalPredictions
          if (total === 0) return null

          const e1Pct = Math.round((s.entrant1Predictions / total) * 100)
          const e2Pct = 100 - e1Pct
          const e1IsWinner = s.winnerId === s.entrant1Id
          const e2IsWinner = s.winnerId === s.entrant2Id

          return (
            <div key={matchupId} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className={e1IsWinner ? 'font-semibold text-green-700 dark:text-green-400' : 'text-muted-foreground'}>
                  {s.entrant1Name ?? 'Entrant 1'}
                </span>
                <span className="text-muted-foreground">vs</span>
                <span className={e2IsWinner ? 'font-semibold text-green-700 dark:text-green-400' : 'text-muted-foreground'}>
                  {s.entrant2Name ?? 'Entrant 2'}
                </span>
              </div>
              {/* Visual prediction bar */}
              <div className="mb-1.5 flex h-2 overflow-hidden rounded-full">
                <div
                  className={`transition-all ${
                    e1IsWinner ? 'bg-green-500' : 'bg-red-400'
                  }`}
                  style={{ width: `${e1Pct}%` }}
                />
                <div
                  className={`transition-all ${
                    e2IsWinner ? 'bg-green-500' : 'bg-red-400'
                  }`}
                  style={{ width: `${e2Pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {s.entrant1Predictions} ({e1Pct}%)
                </span>
                <span>{total} predictions</span>
                <span>
                  {s.entrant2Predictions} ({e2Pct}%)
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
