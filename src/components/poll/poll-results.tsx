'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, PieChart } from 'lucide-react'
import { AnimatedBarChart } from '@/components/poll/bar-chart'
import { DonutChart } from '@/components/poll/donut-chart'
import { RankedLeaderboard } from '@/components/poll/ranked-leaderboard'
import { PresentationResults } from '@/components/poll/presentation-results'
import { PresentationMode } from '@/components/poll/presentation-mode'
import { PollReveal } from '@/components/poll/poll-reveal'
import { WinnerReveal } from '@/components/bracket/winner-reveal'
import type { PollWithOptions, PollStatus } from '@/lib/poll/types'
import type { BordaLeaderboardEntry, BordaScore } from '@/lib/poll/borda'

/** Color palette matching bar-chart / donut-chart */
const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#f43f5e',
  '#0ea5e9', '#8b5cf6', '#f97316', '#14b8a6',
]

type ChartType = 'bar' | 'donut'

interface PollResultsProps {
  poll: PollWithOptions
  initialVoteCounts: Record<string, number>
  initialTotalVotes: number
  initialParticipantCount: number
  forceReveal?: boolean
  onRevealDismissed?: () => void
  presenting?: boolean
  pollTitle?: string
  onExitPresentation?: () => void
  /** Realtime data passed from parent (lifted from useRealtimePoll) */
  realtimeVoteCounts?: Record<string, number>
  realtimeTotalVotes?: number
  realtimePollStatus?: PollStatus
  realtimeBordaScores?: BordaScore[] | null
  realtimeTransport?: 'websocket' | 'polling'
  realtimeParticipantCount?: number
}

/**
 * Live-updating poll results container.
 *
 * For simple polls: toggleable bar chart / donut chart.
 * For ranked polls: Borda score leaderboard.
 * Shows participation rate and reveal animation on poll close.
 */
export function PollResults({
  poll,
  initialVoteCounts,
  initialTotalVotes,
  initialParticipantCount,
  forceReveal,
  onRevealDismissed,
  presenting,
  pollTitle,
  onExitPresentation,
  realtimeVoteCounts,
  realtimeTotalVotes,
  realtimePollStatus,
  realtimeBordaScores,
  realtimeTransport,
  realtimeParticipantCount,
}: PollResultsProps) {
  // Use realtime data from parent (single subscription in PollLiveClient)
  const voteCounts = realtimeVoteCounts ?? {}
  const totalVotes = realtimeTotalVotes ?? 0
  const pollStatus = realtimePollStatus ?? 'draft'
  const bordaScores = realtimeBordaScores ?? null
  const transport = realtimeTransport ?? 'websocket'
  const participantCount = realtimeParticipantCount ?? 0

  const [chartType, setChartType] = useState<ChartType>('bar')
  const [showReveal, setShowReveal] = useState(false)
  const [showCountdown, setShowCountdown] = useState(false)

  // Use real-time data if available, fall back to initial
  const liveVoteCounts = Object.keys(voteCounts).length > 0 ? voteCounts : initialVoteCounts
  const liveTotalVotes = totalVotes > 0 ? totalVotes : initialTotalVotes
  const liveStatus = pollStatus !== 'draft' ? pollStatus : poll.status
  const liveParticipantCount = participantCount > 0 ? participantCount : initialParticipantCount

  // Trigger countdown from parent's forceReveal prop, then chain to reveal
  useEffect(() => {
    if (forceReveal) {
      setShowCountdown(true)
    }
  }, [forceReveal])

  // Chain countdown -> reveal
  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false)
    setShowReveal(true)
  }, [])

  // Map options to chart data
  const chartData = poll.options.map((opt, i) => ({
    optionId: opt.id,
    label: opt.text,
    count: liveVoteCounts[opt.id] ?? 0,
    color: COLORS[i % COLORS.length],
  }))

  // Find winner for reveal (option with most votes for simple, highest Borda for ranked)
  const winnerText = (() => {
    if (poll.pollType === 'ranked' && bordaScores && bordaScores.length > 0) {
      const topId = bordaScores[0].optionId
      const opt = poll.options.find((o) => o.id === topId)
      return opt?.text ?? 'Unknown'
    }
    // Simple poll: highest vote count
    let maxCount = 0
    let winnerId = ''
    for (const opt of poll.options) {
      const c = liveVoteCounts[opt.id] ?? 0
      if (c > maxCount) {
        maxCount = c
        winnerId = opt.id
      }
    }
    const opt = poll.options.find((o) => o.id === winnerId)
    return opt?.text ?? 'No votes'
  })()

  // Stable callback for exiting presentation mode
  const handleExitPresentation = useCallback(() => {
    onExitPresentation?.()
  }, [onExitPresentation])

  // Participation rate
  const participationPct =
    liveParticipantCount > 0
      ? Math.round((liveTotalVotes / liveParticipantCount) * 100)
      : 0

  // Build BordaLeaderboardEntry[] from bordaScores (which are BordaScore[])
  // The real-time hook returns BordaScore[] from the state API, but the leaderboard
  // component expects BordaLeaderboardEntry[]. Derive the extra fields.
  const leaderboardEntries: BordaLeaderboardEntry[] = (() => {
    if (!bordaScores) return []
    const totalOptions = poll.options.length
    const rankingDepth = poll.rankingDepth
    const pointBase =
      rankingDepth != null && rankingDepth < totalOptions
        ? rankingDepth
        : totalOptions
    const maxPerVoter = pointBase - 1
    const maxPossible = maxPerVoter * liveTotalVotes

    return bordaScores.map((s) => ({
      optionId: s.optionId,
      totalPoints: s.points,
      maxPossiblePoints: maxPossible,
      voterCount: liveTotalVotes, // approximation from broadcast data
    }))
  })()

  return (
    <div className="space-y-4">
      {/* Participation rate */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              liveStatus === 'active' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-sm font-medium capitalize">{liveStatus}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground tabular-nums">
          {liveTotalVotes} of {liveParticipantCount} voted ({participationPct}%)
        </span>
        {transport === 'polling' && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Near-realtime
          </span>
        )}
      </div>

      {/* Participation bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${Math.min(participationPct, 100)}%` }}
        />
      </div>

      {/* Chart type toggle (simple polls only) */}
      {poll.pollType === 'simple' && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`rounded-md p-1.5 transition-colors ${
              chartType === 'bar'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            aria-label="Bar chart view"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setChartType('donut')}
            className={`rounded-md p-1.5 transition-colors ${
              chartType === 'donut'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            aria-label="Donut chart view"
          >
            <PieChart className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Chart / Leaderboard */}
      {poll.pollType === 'simple' ? (
        chartType === 'bar' ? (
          <AnimatedBarChart data={chartData} total={liveTotalVotes} />
        ) : (
          <DonutChart data={chartData} total={liveTotalVotes} />
        )
      ) : (
        <RankedLeaderboard
          options={poll.options}
          bordaScores={leaderboardEntries}
          totalVoters={liveTotalVotes}
        />
      )}

      {/* Countdown overlay (before reveal) */}
      {showCountdown && (
        <WinnerReveal
          entrant1Name="The votes are in"
          entrant2Name=""
          onComplete={handleCountdownComplete}
        />
      )}

      {/* Reveal overlay */}
      {showReveal && (
        <PollReveal
          winnerText={winnerText}
          onDismiss={() => {
            setShowReveal(false)
            onRevealDismissed?.()
          }}
        />
      )}

      {/* Presentation mode overlay -- rendered here so bordaScores is in scope */}
      {presenting && (
        <PresentationMode
          title={pollTitle ?? ''}
          onExit={handleExitPresentation}
        >
          {poll.pollType === 'ranked' ? (
            <PresentationResults
              options={poll.options}
              bordaScores={leaderboardEntries}
              totalVoters={liveTotalVotes}
            />
          ) : (
            <div className="space-y-4">
              {chartType === 'bar' ? (
                <AnimatedBarChart data={chartData} total={liveTotalVotes} large />
              ) : (
                <DonutChart data={chartData} total={liveTotalVotes} large />
              )}
            </div>
          )}
        </PresentationMode>
      )}
    </div>
  )
}
