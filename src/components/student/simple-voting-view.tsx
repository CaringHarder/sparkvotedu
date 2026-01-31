'use client'

import { useState, useEffect, useCallback } from 'react'
import { MatchupVoteCard } from '@/components/bracket/matchup-vote-card'
import { CelebrationScreen } from '@/components/bracket/celebration-screen'
import { useRealtimeBracket } from '@/hooks/use-realtime-bracket'
import { useTransportFallback } from '@/hooks/use-transport-fallback'
import type { MatchupData } from '@/lib/bracket/types'

interface SimpleVotingViewProps {
  matchups: MatchupData[]
  participantId: string
  bracketId: string
  bracketName: string
  initialVotes: Record<string, string | null>
}

/**
 * Simple voting mode for younger students.
 *
 * Shows one matchup at a time with large tap targets and sequential
 * navigation. Designed for minimal distraction -- no bracket diagram,
 * just the current matchup front and center.
 *
 * Real-time: subscribes to bracket updates for round changes. When new
 * matchups become votable, auto-navigates to the first new one.
 */
export function SimpleVotingView({
  matchups: initialMatchups,
  participantId,
  bracketId,
  bracketName,
  initialVotes,
}: SimpleVotingViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)

  // Real-time bracket updates
  const { matchups: realtimeMatchups, bracketCompleted } = useRealtimeBracket(bracketId)

  // Use realtime matchups when available, otherwise initial
  const allMatchups = (realtimeMatchups as MatchupData[] | null) ?? initialMatchups

  // Filter to only votable matchups (status === "voting")
  const votableMatchups = allMatchups.filter((m) => m.status === 'voting')

  // Track previous votable count for auto-navigation
  const [prevVotableCount, setPrevVotableCount] = useState(votableMatchups.length)

  useEffect(() => {
    // When new matchups become votable, navigate to the first new one
    if (votableMatchups.length > prevVotableCount && prevVotableCount >= 0) {
      setCurrentIndex(prevVotableCount)
    }
    setPrevVotableCount(votableMatchups.length)
  }, [votableMatchups.length, prevVotableCount])

  // Transport fallback for school networks
  const handlePollData = useCallback(() => {
    // Real-time bracket hook handles state -- poll just triggers refetch indirectly
  }, [])
  const { transport } = useTransportFallback(bracketId, handlePollData)

  // Show celebration when bracket is completed
  useEffect(() => {
    if (bracketCompleted) {
      setShowCelebration(true)
    }
  }, [bracketCompleted])

  // Derive champion name from final matchup
  const championName = (() => {
    const maxRound = Math.max(...allMatchups.map((m) => m.round), 0)
    const finalMatchup = allMatchups.find(
      (m) => m.round === maxRound && m.position === 1
    )
    return finalMatchup?.winner?.name ?? 'Champion'
  })()

  // Clamp index to bounds
  const safeIndex = Math.max(0, Math.min(currentIndex, votableMatchups.length - 1))
  const currentMatchup = votableMatchups[safeIndex]

  // Check how many matchups the student has voted on
  const votedCount = votableMatchups.filter(
    (m) => initialVotes[m.id] != null
  ).length

  // Celebration overlay (renders above all other content)
  const celebrationOverlay = showCelebration ? (
    <CelebrationScreen
      championName={championName}
      bracketName={bracketName}
      onDismiss={() => setShowCelebration(false)}
    />
  ) : null

  // No votable matchups: waiting state
  if (votableMatchups.length === 0) {
    // Check if all initial matchups are decided (bracket may be done or waiting)
    const allDecided = allMatchups.every((m) => m.status === 'decided')

    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        {celebrationOverlay}
        <h1 className="mb-6 text-2xl font-bold">{bracketName}</h1>
        {allDecided ? (
          <div className="space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-8 w-8 text-primary">
                <path
                  fillRule="evenodd"
                  d="M10 1a.75.75 0 01.75.75V3h2.5A2.75 2.75 0 0116 5.75v.586l1.127-.282A1.5 1.5 0 0119 7.5v2.25a1.5 1.5 0 01-1.19 1.467l-2.073.518A5.003 5.003 0 0112.5 14.77V16h1.75a.75.75 0 010 1.5h-8.5a.75.75 0 010-1.5H7.5v-1.23a5.003 5.003 0 01-3.237-3.035L2.19 11.217A1.5 1.5 0 011 9.75V7.5a1.5 1.5 0 011.873-1.453L4 6.329V5.75A2.75 2.75 0 016.75 3h2.5V1.75A.75.75 0 0110 1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-foreground">Bracket Complete!</p>
            <p className="text-sm text-muted-foreground">All matchups have been decided.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-primary/30" />
            <p className="text-lg font-semibold text-foreground">
              Waiting for your teacher to open voting...
            </p>
            <p className="text-sm text-muted-foreground">
              Sit tight! The next matchup will appear here automatically.
            </p>
            {transport === 'polling' && (
              <p className="text-xs text-muted-foreground">
                Live updates active (polling mode)
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // All voted: congratulations state
  if (votedCount === votableMatchups.length && votableMatchups.length > 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        {celebrationOverlay}
        <h1 className="mb-6 text-2xl font-bold">{bracketName}</h1>
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-8 w-8 text-green-600 dark:text-green-400">
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-foreground">All done!</p>
          <p className="text-sm text-muted-foreground">
            Waiting for results... You can still change your votes below.
          </p>
        </div>

        {/* Still allow navigating to change votes */}
        <div className="mt-8">
          <MatchupVoteCard
            matchup={currentMatchup}
            participantId={participantId}
            initialVote={initialVotes[currentMatchup.id] ?? null}
          />
        </div>
        <NavigationControls
          currentIndex={safeIndex}
          total={votableMatchups.length}
          onPrevious={() => setCurrentIndex(safeIndex - 1)}
          onNext={() => setCurrentIndex(safeIndex + 1)}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      {celebrationOverlay}
      <h1 className="mb-6 text-center text-2xl font-bold">{bracketName}</h1>

      {/* Current matchup card */}
      <div className="flex justify-center">
        <MatchupVoteCard
          matchup={currentMatchup}
          participantId={participantId}
          initialVote={initialVotes[currentMatchup.id] ?? null}
        />
      </div>

      {/* Navigation */}
      <NavigationControls
        currentIndex={safeIndex}
        total={votableMatchups.length}
        onPrevious={() => setCurrentIndex(safeIndex - 1)}
        onNext={() => setCurrentIndex(safeIndex + 1)}
      />
    </div>
  )
}

/** Previous/Next navigation with progress indicator */
function NavigationControls({
  currentIndex,
  total,
  onPrevious,
  onNext,
}: {
  currentIndex: number
  total: number
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentIndex === 0}
        className="min-h-12 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-50"
      >
        Previous
      </button>

      <span className="text-sm font-medium text-muted-foreground">
        Matchup {currentIndex + 1} of {total}
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={currentIndex === total - 1}
        className="min-h-12 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-50"
      >
        Next
      </button>
    </div>
  )
}
