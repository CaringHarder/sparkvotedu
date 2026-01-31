'use client'

import { useState, useEffect, useCallback } from 'react'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'
import { MatchupVoteCard } from '@/components/bracket/matchup-vote-card'
import { CelebrationScreen } from '@/components/bracket/celebration-screen'
import { useRealtimeBracket } from '@/hooks/use-realtime-bracket'
import { useTransportFallback } from '@/hooks/use-transport-fallback'
import type { BracketWithDetails, MatchupData } from '@/lib/bracket/types'

interface AdvancedVotingViewProps {
  bracket: BracketWithDetails
  participantId: string
  initialVotes: Record<string, string | null>
}

/**
 * Advanced voting mode for older students.
 *
 * Shows the full bracket diagram with all matchups visible. Votable
 * matchups (status === "voting") are clickable -- clicking one opens
 * a voting modal with the MatchupVoteCard component.
 *
 * Real-time: subscribes to bracket updates for live diagram updates
 * as rounds advance and winners are selected.
 */
export function AdvancedVotingView({
  bracket,
  participantId,
  initialVotes,
}: AdvancedVotingViewProps) {
  const [selectedMatchupId, setSelectedMatchupId] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)

  // Real-time bracket updates
  const { matchups: realtimeMatchups, bracketCompleted } = useRealtimeBracket(bracket.id)

  // Use realtime matchups when available, otherwise initial
  const currentMatchups = (realtimeMatchups as MatchupData[] | null) ?? bracket.matchups

  // Calculate total rounds from bracket size
  const totalRounds = Math.log2(bracket.size)

  // Transport fallback for school networks
  const handlePollData = useCallback(() => {
    // Real-time bracket hook handles state
  }, [])
  const { transport } = useTransportFallback(bracket.id, handlePollData)

  // Show celebration when bracket is completed
  useEffect(() => {
    if (bracketCompleted) {
      setShowCelebration(true)
    }
  }, [bracketCompleted])

  // Derive champion name from final matchup
  const championName = (() => {
    const finalMatchup = currentMatchups.find(
      (m) => m.round === totalRounds && m.position === 1
    )
    return finalMatchup?.winner?.name ?? 'Champion'
  })()

  // Find the selected matchup
  const selectedMatchup = selectedMatchupId
    ? currentMatchups.find((m) => m.id === selectedMatchupId) ?? null
    : null

  // Get votable matchup IDs for highlighting
  const votableMatchupIds = new Set(
    currentMatchups.filter((m) => m.status === 'voting').map((m) => m.id)
  )

  // Get voted matchup IDs for checkmark badges
  const votedMatchupIds = new Set(
    Object.entries(initialVotes)
      .filter(([, v]) => v != null)
      .map(([k]) => k)
  )

  // Current voting round
  const votingRound = currentMatchups.find((m) => m.status === 'voting')?.round
  const roundLabel = votingRound
    ? `Round ${votingRound}`
    : bracketCompleted
      ? 'Complete'
      : 'Waiting'

  return (
    <div className="px-4 py-4">
      {/* Celebration overlay */}
      {showCelebration && (
        <CelebrationScreen
          championName={championName}
          bracketName={bracket.name}
          onDismiss={() => setShowCelebration(false)}
        />
      )}

      {/* Header */}
      <div className="mb-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <h1 className="text-xl font-bold">{bracket.name}</h1>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
            {roundLabel}
          </span>
          {transport === 'polling' && (
            <span className="text-xs text-muted-foreground">(polling)</span>
          )}
        </div>
      </div>

      {/* Instructions */}
      {votableMatchupIds.size > 0 && (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Tap a highlighted matchup to vote
        </p>
      )}

      {/* Interactive bracket diagram */}
      <BracketDiagramInteractive
        matchups={currentMatchups}
        totalRounds={totalRounds}
        votableMatchupIds={votableMatchupIds}
        votedMatchupIds={votedMatchupIds}
        onMatchupClick={(matchupId) => {
          if (votableMatchupIds.has(matchupId)) {
            setSelectedMatchupId(matchupId)
          }
        }}
      />

      {/* Voting modal overlay */}
      {selectedMatchup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedMatchupId(null)
          }}
        >
          <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setSelectedMatchupId(null)}
              className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-md transition-colors hover:bg-accent"
              aria-label="Close"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
            <MatchupVoteCard
              matchup={selectedMatchup}
              participantId={participantId}
              initialVote={initialVotes[selectedMatchup.id] ?? null}
            />
          </div>
        </div>
      )}

      {/* Bracket complete message */}
      {bracketCompleted && (
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
          <p className="text-lg font-semibold text-primary">Bracket Complete!</p>
          <p className="text-sm text-muted-foreground">Check out the final results above.</p>
        </div>
      )}
    </div>
  )
}

/**
 * Interactive wrapper around BracketDiagram that adds clickable overlays
 * on votable matchups and checkmark badges on voted matchups.
 *
 * Renders the base BracketDiagram for visuals, then overlays transparent
 * clickable regions using CSS absolute positioning.
 */
function BracketDiagramInteractive({
  matchups,
  totalRounds,
  votableMatchupIds,
  votedMatchupIds,
  onMatchupClick,
}: {
  matchups: MatchupData[]
  totalRounds: number
  votableMatchupIds: Set<string>
  votedMatchupIds: Set<string>
  onMatchupClick: (matchupId: string) => void
}) {
  // Layout constants must match bracket-diagram.tsx
  const MATCH_WIDTH = 200
  const MATCH_HEIGHT = 80
  const ROUND_GAP = 60
  const MATCH_V_GAP = 20
  const PADDING = 20
  const LABEL_HEIGHT = 30

  function getMatchPosition(
    round: number,
    position: number,
    totalRds: number
  ): { x: number; y: number } {
    const x = PADDING + (round - 1) * (MATCH_WIDTH + ROUND_GAP)
    if (round === 1) {
      const y = PADDING + LABEL_HEIGHT + (position - 1) * (MATCH_HEIGHT + MATCH_V_GAP)
      return { x, y }
    }
    const feeder1 = getMatchPosition(round - 1, 2 * position - 1, totalRds)
    const feeder2 = getMatchPosition(round - 1, 2 * position, totalRds)
    const y = (feeder1.y + feeder2.y) / 2
    return { x, y }
  }

  const svgWidth = PADDING * 2 + totalRounds * MATCH_WIDTH + (totalRounds - 1) * ROUND_GAP
  const round1Matches = Math.pow(2, totalRounds - 1)
  const svgHeight =
    PADDING * 2 +
    LABEL_HEIGHT +
    round1Matches * MATCH_HEIGHT +
    (round1Matches - 1) * MATCH_V_GAP

  return (
    <div className="relative overflow-x-auto">
      {/* Base bracket diagram */}
      <BracketDiagram
        matchups={matchups}
        totalRounds={totalRounds}
      />

      {/* Clickable overlays for votable matchups */}
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="pointer-events-none absolute left-0 top-0"
        style={{ fontFamily: 'inherit' }}
      >
        {matchups.map((matchup) => {
          const pos = getMatchPosition(matchup.round, matchup.position, totalRounds)
          const isVotable = votableMatchupIds.has(matchup.id)
          const isVoted = votedMatchupIds.has(matchup.id)

          return (
            <g key={`overlay-${matchup.id}`}>
              {/* Votable highlight border */}
              {isVotable && (
                <rect
                  x={pos.x - 2}
                  y={pos.y - 2}
                  width={MATCH_WIDTH + 4}
                  height={MATCH_HEIGHT + 4}
                  rx={8}
                  ry={8}
                  style={{
                    fill: 'none',
                    stroke: 'hsl(var(--primary))',
                    strokeWidth: 2,
                    strokeDasharray: '4 2',
                    opacity: 0.8,
                  }}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="12"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </rect>
              )}

              {/* Clickable hit area */}
              {isVotable && (
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={MATCH_WIDTH}
                  height={MATCH_HEIGHT}
                  style={{ fill: 'transparent', cursor: 'pointer' }}
                  className="pointer-events-auto"
                  onClick={() => onMatchupClick(matchup.id)}
                />
              )}

              {/* Voted checkmark badge */}
              {isVoted && (
                <g transform={`translate(${pos.x + MATCH_WIDTH - 14}, ${pos.y - 6})`}>
                  <circle cx="8" cy="8" r="10" style={{ fill: 'hsl(var(--primary))' }} />
                  <path
                    d="M5 8.5l2.5 2.5 5-5"
                    style={{
                      stroke: 'white',
                      strokeWidth: 2,
                      fill: 'none',
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                    }}
                  />
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
