'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MatchupVoteCard } from '@/components/bracket/matchup-vote-card'
import { WinnerReveal } from '@/components/bracket/winner-reveal'
import { CelebrationScreen } from '@/components/bracket/celebration-screen'
import { useRealtimeBracket } from '@/hooks/use-realtime-bracket'
import { PausedOverlay } from '@/components/student/paused-overlay'
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
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [revealState, setRevealState] = useState<{
    winnerName: string
    entrant1Name: string
    entrant2Name: string
  } | null>(null)
  const prevMatchupStatusRef = useRef<Record<string, string>>({})

  // Real-time bracket updates (includes integrated transport fallback)
  const { matchups: realtimeMatchups, bracketCompleted, transport, bracketStatus } = useRealtimeBracket(bracketId)

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

  // Detect final matchup decided → trigger WinnerReveal
  useEffect(() => {
    const maxRound = Math.max(...allMatchups.map((m) => m.round), 0)
    const prev = prevMatchupStatusRef.current
    for (const matchup of allMatchups) {
      const prevStatus = prev[matchup.id]
      if (
        prevStatus &&
        prevStatus !== 'decided' &&
        matchup.status === 'decided' &&
        matchup.winner &&
        matchup.round === maxRound &&
        matchup.position === 1
      ) {
        setRevealState({
          winnerName: matchup.winner.name,
          entrant1Name: matchup.entrant1?.name ?? 'TBD',
          entrant2Name: matchup.entrant2?.name ?? 'TBD',
        })
      }
    }
    const newStatuses: Record<string, string> = {}
    for (const m of allMatchups) {
      newStatuses[m.id] = m.status
    }
    prevMatchupStatusRef.current = newStatuses
  }, [allMatchups])

  // Show celebration after bracket completes (matches teacher dashboard timing)
  useEffect(() => {
    if (bracketCompleted) {
      const timer = setTimeout(() => setShowCelebration(true), 4000)
      return () => clearTimeout(timer)
    }
  }, [bracketCompleted])

  // Reset celebration/reveal state when bracket is reopened (bracketCompleted becomes false)
  useEffect(() => {
    if (!bracketCompleted) {
      setShowCelebration(false)
      setRevealState(null)
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

  // Winner Reveal overlay (final round only)
  const winnerRevealOverlay = revealState ? (
    <WinnerReveal
      entrant1Name={revealState.entrant1Name}
      entrant2Name={revealState.entrant2Name}
      onComplete={() => setRevealState(null)}
    />
  ) : null

  // Celebration overlay (renders above all other content)
  const celebrationOverlay = showCelebration ? (
    <CelebrationScreen
      championName={championName}
      bracketName={bracketName}
      onDismiss={() => { setShowCelebration(false); setRevealState(null) }}
    />
  ) : null

  // No votable matchups: waiting state
  if (votableMatchups.length === 0) {
    // Check if all initial matchups are decided (bracket may be done or waiting)
    const allDecided = allMatchups.every((m) => m.status === 'decided')

    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        {winnerRevealOverlay}
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

  // Whether the student has voted on all available matchups
  const allVoted = currentIndex >= votableMatchups.length

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
      <PausedOverlay visible={bracketStatus === 'paused'} />
      {winnerRevealOverlay}
      {celebrationOverlay}
      <h1 className="mb-4 text-center text-3xl font-bold sm:mb-6 sm:text-4xl">{bracketName}</h1>

      {/* Progress indicator (hidden once all voted) */}
      {!allVoted && !showConfirmation && (
        <p className="mb-4 text-center text-base text-muted-foreground sm:text-lg">
          Matchup {safeIndex + 1} of {votableMatchups.length}
        </p>
      )}

      {/* Animated card area — matchup → confirmation → next matchup (or all done) */}
      <div className="flex justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {allVoted ? (
            /* All voted: waiting for round to end */
            <motion.div
              key="all-done"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full"
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
                <p className="text-lg font-semibold text-foreground">All votes in!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Waiting for your teacher to advance the round...
                </p>
                <div className="mt-4 h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-full animate-pulse rounded-full bg-primary/40" />
                </div>
              </div>
            </motion.div>
          ) : showConfirmation ? (
            <motion.div
              key={`confirm-${safeIndex}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full"
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
              <MatchupVoteCard
                key={currentMatchup.id}
                matchup={currentMatchup}
                participantId={participantId}
                initialVote={initialVotes[currentMatchup.id] ?? null}
                onVoteSubmitted={() => {
                  // Show confirmation card, then advance (or show all-done)
                  setShowConfirmation(true)
                  setTimeout(() => {
                    setShowConfirmation(false)
                    setCurrentIndex((i) => i + 1)
                  }, 1200)
                }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
