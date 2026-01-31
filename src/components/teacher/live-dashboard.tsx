'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRealtimeBracket } from '@/hooks/use-realtime-bracket'
import { useSessionPresence } from '@/hooks/use-student-session'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'
import { VoteCountDisplay } from '@/components/teacher/vote-count-display'
import { ParticipationSidebar } from '@/components/teacher/participation-sidebar'
import { RoundAdvancementControls } from '@/components/teacher/round-advancement-controls'
import { MatchupTimer } from '@/components/teacher/matchup-timer'
import type { BracketWithDetails, MatchupData } from '@/lib/bracket/types'
import type { VoteCounts } from '@/types/vote'

interface LiveDashboardProps {
  bracket: BracketWithDetails
  totalRounds: number
  participants: Array<{ id: string; funName: string; lastSeenAt: string }>
  initialVoteCounts: Record<string, VoteCounts>
  initialVoterIds: Record<string, string[]>
}

export function LiveDashboard({
  bracket,
  totalRounds,
  participants,
  initialVoteCounts,
  initialVoterIds,
}: LiveDashboardProps) {
  const [selectedMatchupId, setSelectedMatchupId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Real-time vote count updates via Supabase Broadcast
  const { voteCounts: realtimeVoteCounts, matchups: realtimeMatchups } =
    useRealtimeBracket(bracket.id)

  // Track connected students via Supabase Presence
  // Always call the hook (rules of hooks), use a dummy ID when no session
  const { connectedStudents } = useSessionPresence(
    bracket.sessionId ?? '__no_session__',
    '__teacher__'
  )

  // Derive connected participant IDs set from presence data
  const connectedIds = useMemo(() => {
    const names = new Set(connectedStudents.map((s) => s.funName))
    const ids = new Set<string>()
    for (const p of participants) {
      if (names.has(p.funName)) {
        ids.add(p.id)
      }
    }
    return ids
  }, [connectedStudents, participants])

  // Merge initial matchups with real-time updates
  const currentMatchups: MatchupData[] = useMemo(() => {
    if (realtimeMatchups) {
      return realtimeMatchups as MatchupData[]
    }
    return bracket.matchups
  }, [realtimeMatchups, bracket.matchups])

  // Merge initial vote counts with real-time updates
  const mergedVoteCounts = useMemo(() => {
    const merged = { ...initialVoteCounts }
    // Override with real-time vote counts as they arrive
    for (const [matchupId, counts] of Object.entries(realtimeVoteCounts)) {
      // realtimeVoteCounts has { [entrantId]: count, total: number }
      // Convert to VoteCounts (Record<string, number>) stripping 'total'
      const voteCounts: VoteCounts = {}
      for (const [key, value] of Object.entries(counts)) {
        if (key !== 'total') {
          voteCounts[key] = value
        }
      }
      merged[matchupId] = voteCounts
    }
    return merged
  }, [initialVoteCounts, realtimeVoteCounts])

  // Get total votes per matchup from real-time data
  const getTotalVotes = useCallback(
    (matchupId: string): number => {
      const counts = mergedVoteCounts[matchupId]
      if (!counts) return 0
      return Object.values(counts).reduce((sum, c) => sum + c, 0)
    },
    [mergedVoteCounts]
  )

  // Get voter IDs for selected matchup (from initial data)
  const currentVoterIds = useMemo(() => {
    if (!selectedMatchupId) return []
    return initialVoterIds[selectedMatchupId] ?? []
  }, [selectedMatchupId, initialVoterIds])

  // Current round (derive from matchup statuses)
  const currentRound = useMemo(() => {
    // Find the lowest round with non-decided matchups
    for (let r = 1; r <= totalRounds; r++) {
      const roundMatchups = currentMatchups.filter((m) => m.round === r)
      const allDecided = roundMatchups.every((m) => m.status === 'decided')
      if (!allDecided) return r
    }
    return totalRounds
  }, [currentMatchups, totalRounds])

  const handleTimerExpire = useCallback(() => {
    // Timer expired -- teacher is prompted to close voting or extend
    // No automatic action, just visual indication
  }, [])

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{bracket.name}</h1>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            LIVE
          </span>
          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            {bracket.viewingMode} mode
          </span>
        </div>
        <div className="flex items-center gap-3">
          <MatchupTimer
            bracketId={bracket.id}
            initialSeconds={bracket.votingTimerSeconds}
            matchupId={selectedMatchupId}
            onTimerExpire={handleTimerExpire}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Bracket diagram with vote overlays */}
        <div className="flex-1 overflow-auto rounded-lg border bg-card p-4">
          <div className="relative">
            <BracketDiagram
              matchups={currentMatchups}
              totalRounds={totalRounds}
            />
            {/* Vote count overlays */}
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {currentMatchups
                .filter((m) => m.entrant1Id || m.entrant2Id)
                .map((matchup) => (
                  <button
                    key={matchup.id}
                    onClick={() =>
                      setSelectedMatchupId(
                        selectedMatchupId === matchup.id ? null : matchup.id
                      )
                    }
                    className={`rounded-lg border p-2 text-left transition-colors ${
                      selectedMatchupId === matchup.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <VoteCountDisplay
                      matchupId={matchup.id}
                      entrant1Name={matchup.entrant1?.name ?? 'TBD'}
                      entrant2Name={matchup.entrant2?.name ?? 'TBD'}
                      entrant1Id={matchup.entrant1Id ?? ''}
                      entrant2Id={matchup.entrant2Id ?? ''}
                      voteCounts={mergedVoteCounts[matchup.id] ?? {}}
                      totalVotes={getTotalVotes(matchup.id)}
                      totalParticipants={participants.length}
                      status={matchup.status as 'pending' | 'voting' | 'decided'}
                    />
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Right: Participation sidebar */}
        <ParticipationSidebar
          participants={participants}
          connectedIds={connectedIds}
          voterIds={currentVoterIds}
          selectedMatchupId={selectedMatchupId}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isOpen={sidebarOpen}
        />
      </div>

      {/* Bottom: Round advancement controls */}
      <RoundAdvancementControls
        bracketId={bracket.id}
        matchups={currentMatchups}
        selectedMatchupId={selectedMatchupId}
        voteCounts={mergedVoteCounts}
        currentRound={currentRound}
        onSelectMatchup={setSelectedMatchupId}
      />
    </div>
  )
}
