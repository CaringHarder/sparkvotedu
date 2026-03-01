'use client'

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'
import { RegionBracketView } from '@/components/bracket/region-bracket-view'
import { WinnerReveal } from '@/components/bracket/winner-reveal'
import { CelebrationScreen } from '@/components/bracket/celebration-screen'
import { useRealtimeBracket } from '@/hooks/use-realtime-bracket'
import { PausedOverlay } from '@/components/student/paused-overlay'
import { castVote } from '@/actions/vote'
import type { BracketWithDetails, MatchupData } from '@/lib/bracket/types'

interface AdvancedVotingViewProps {
  bracket: BracketWithDetails
  participantId: string
  initialVotes: Record<string, string | null>
  /** Notify parent of vote so state survives unmount/remount (tab switches) */
  onVoteUpdate?: (matchupId: string, entrantId: string) => void
}

/**
 * Advanced voting mode for older students.
 *
 * Shows the full bracket diagram (same as teacher view) with interactive
 * entrant clicking for voting. Matchups in "voting" status get highlighted
 * borders and clickable entrant halves.
 */
export function AdvancedVotingView({
  bracket,
  participantId,
  initialVotes,
  onVoteUpdate,
}: AdvancedVotingViewProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const [revealState, setRevealState] = useState<{
    winnerName: string
    entrant1Name: string
    entrant2Name: string
  } | null>(null)
  const [votes, setVotes] = useState<Record<string, string | null>>(initialVotes)
  const [isPending, startTransition] = useTransition()
  const prevMatchupStatusRef = useRef<Record<string, string>>({})
  const hasShownRevealRef = useRef(false)

  // Real-time bracket updates (includes display settings for reactive showSeedNumbers)
  const { matchups: realtimeMatchups, bracketCompleted, transport, bracketStatus, showSeedNumbers } =
    useRealtimeBracket(bracket.id)

  // Use realtime matchups when available, otherwise initial
  const currentMatchups = (realtimeMatchups as MatchupData[] | null) ?? bracket.matchups

  // Calculate total rounds from bracket size
  const totalRounds = Math.log2(bracket.size)

  // Detect final matchup decided -> trigger WinnerReveal
  useEffect(() => {
    const prev = prevMatchupStatusRef.current
    for (const matchup of currentMatchups) {
      const prevStatus = prev[matchup.id]
      if (
        prevStatus &&
        prevStatus !== 'decided' &&
        matchup.status === 'decided' &&
        matchup.winner &&
        matchup.round === totalRounds &&
        matchup.position === 1
      ) {
        hasShownRevealRef.current = true
        setRevealState({
          winnerName: matchup.winner.name,
          entrant1Name: matchup.entrant1?.name ?? 'TBD',
          entrant2Name: matchup.entrant2?.name ?? 'TBD',
        })
      }
    }
    const newStatuses: Record<string, string> = {}
    for (const m of currentMatchups) {
      newStatuses[m.id] = m.status
    }
    prevMatchupStatusRef.current = newStatuses
  }, [currentMatchups, totalRounds])

  // Fallback: Show WinnerReveal when bracket completes but status-transition detection missed it
  useEffect(() => {
    if (bracketCompleted && !revealState && !hasShownRevealRef.current && !showCelebration) {
      hasShownRevealRef.current = true
      const finalMatchup = currentMatchups.find(
        (m) => m.round === totalRounds && m.position === 1
      )
      const timer = setTimeout(() => {
        setRevealState({
          winnerName: finalMatchup?.winner?.name ?? 'Champion',
          entrant1Name: finalMatchup?.entrant1?.name ?? 'TBD',
          entrant2Name: finalMatchup?.entrant2?.name ?? 'TBD',
        })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [bracketCompleted, revealState, showCelebration, currentMatchups, totalRounds])

  // Reset celebration/reveal state when bracket is reopened (bracketCompleted becomes false)
  useEffect(() => {
    if (!bracketCompleted) {
      setShowCelebration(false)
      setRevealState(null)
      hasShownRevealRef.current = false
    }
  }, [bracketCompleted])

  // Derive champion name
  const championName = (() => {
    const finalMatchup = currentMatchups.find(
      (m) => m.round === totalRounds && m.position === 1
    )
    return finalMatchup?.winner?.name ?? 'Champion'
  })()

  // Handle vote click on entrant in diagram
  const handleEntrantClick = useCallback(
    (matchupId: string, entrantId: string) => {
      // Optimistic update
      setVotes((prev) => ({ ...prev, [matchupId]: entrantId }))
      onVoteUpdate?.(matchupId, entrantId)

      startTransition(async () => {
        const result = await castVote({
          matchupId,
          participantId,
          entrantId,
        })
        if (result && 'error' in result) {
          // Revert on error
          setVotes((prev) => ({ ...prev, [matchupId]: initialVotes[matchupId] ?? null }))
        }
      })
    },
    [participantId, initialVotes, onVoteUpdate]
  )

  // Count votable matchups and voted matchups
  const votableMatchups = currentMatchups.filter((m) => m.status === 'voting')
  const votedCount = votableMatchups.filter((m) => votes[m.id] != null).length

  return (
    <div className="flex flex-col px-2 py-3 sm:px-4 sm:py-4">
      <PausedOverlay visible={bracketStatus === 'paused'} />
      {/* Winner Reveal overlay */}
      {revealState && (
        <WinnerReveal
          entrant1Name={revealState.entrant1Name}
          entrant2Name={revealState.entrant2Name}
          onComplete={() => {
            setRevealState(null)
            setShowCelebration(true)
          }}
        />
      )}

      {/* Celebration overlay */}
      {showCelebration && (
        <CelebrationScreen
          championName={championName}
          bracketName={bracket.name}
          onDismiss={() => { setShowCelebration(false); setRevealState(null) }}
        />
      )}

      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
        <h1 className="text-base font-bold sm:text-lg">{bracket.name}</h1>
        {votableMatchups.length > 0 && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Tap to vote
          </span>
        )}
        {votableMatchups.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {votedCount}/{votableMatchups.length} voted
          </span>
        )}
        {bracketCompleted && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Complete
          </span>
        )}
        {transport === 'polling' && (
          <span className="text-xs text-muted-foreground">(polling)</span>
        )}
        {isPending && (
          <span className="text-xs text-muted-foreground">Saving...</span>
        )}
      </div>

      {/* Interactive bracket diagram */}
      <div className="overflow-x-auto rounded-lg border p-1.5 sm:p-3">
        {(bracket.maxEntrants ?? bracket.size) >= 32 ? (
          <RegionBracketView
            matchups={currentMatchups}
            totalRounds={totalRounds}
            bracketSize={bracket.maxEntrants ?? bracket.size}
            onEntrantClick={handleEntrantClick}
            votedEntrantIds={votes}
            showSeedNumbers={showSeedNumbers}
          />
        ) : (
          <BracketDiagram
            matchups={currentMatchups}
            totalRounds={totalRounds}
            onEntrantClick={handleEntrantClick}
            votedEntrantIds={votes}
            showSeedNumbers={showSeedNumbers}
          />
        )}
      </div>

      {/* Bracket complete message */}
      {bracketCompleted && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
          <p className="text-lg font-semibold text-primary">Bracket Complete!</p>
          <p className="text-sm text-muted-foreground">Check out the final results above.</p>
        </div>
      )}
    </div>
  )
}
