'use client'

import { useState, useMemo, useCallback, useEffect, useRef, useTransition } from 'react'
import { useRealtimeBracket } from '@/hooks/use-realtime-bracket'
import { useSessionPresence } from '@/hooks/use-student-session'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'
import { RegionBracketView } from '@/components/bracket/region-bracket-view'
import { DoubleElimDiagram } from '@/components/bracket/double-elim-diagram'
import { RoundRobinStandings } from '@/components/bracket/round-robin-standings'
import { RoundRobinMatchups } from '@/components/bracket/round-robin-matchups'
import { WinnerReveal } from '@/components/bracket/winner-reveal'
import { CelebrationScreen } from '@/components/bracket/celebration-screen'
import { ParticipationSidebar } from '@/components/teacher/participation-sidebar'
import { QRCodeDisplay } from '@/components/teacher/qr-code-display'
import { openMatchupsForVoting, advanceMatchup, batchAdvanceRound } from '@/actions/bracket-advance'
import { recordResult, advanceRound } from '@/actions/round-robin'
import { PredictionLeaderboard } from '@/components/bracket/prediction-leaderboard'
import { PredictiveBracket } from '@/components/bracket/predictive-bracket'
import type { BracketWithDetails, MatchupData, RoundRobinStanding, PredictionScore } from '@/lib/bracket/types'
import type { VoteCounts } from '@/types/vote'

type DERegion = 'winners' | 'losers' | 'grand_finals'

interface LiveDashboardProps {
  bracket: BracketWithDetails
  totalRounds: number
  participants: Array<{ id: string; funName: string; lastSeenAt: string }>
  initialVoteCounts: Record<string, VoteCounts>
  initialVoterIds: Record<string, string[]>
  sessionCode?: string | null
  standings?: RoundRobinStanding[]
  predictionScores?: PredictionScore[]
}

interface RevealState {
  winnerName: string
  entrant1Name: string
  entrant2Name: string
  entrant1Votes: number
  entrant2Votes: number
}

export function LiveDashboard({
  bracket,
  totalRounds,
  participants,
  initialVoteCounts,
  initialVoterIds,
  sessionCode,
  standings = [],
  predictionScores = [],
}: LiveDashboardProps) {
  const [selectedMatchupId, setSelectedMatchupId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [revealState, setRevealState] = useState<RevealState | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // DE region navigation state
  const [deRegion, setDeRegion] = useState<DERegion>('winners')

  // Bracket type detection
  const isDoubleElim = bracket.bracketType === 'double_elimination'
  const isRoundRobin = bracket.bracketType === 'round_robin'
  const isPredictive = bracket.bracketType === 'predictive'
  const isPredictiveManual = isPredictive && bracket.predictiveResolutionMode === 'manual'
  const isPredictiveAuto = isPredictive && bracket.predictiveResolutionMode === 'auto'

  // Track previous matchup statuses for detecting newly decided matchups
  const prevMatchupStatusRef = useRef<Record<string, string>>({})
  // Guard: prevent fallback reveal from re-triggering after dismiss
  const hasShownRevealRef = useRef(false)

  // Real-time vote count updates via Supabase Broadcast
  const { voteCounts: realtimeVoteCounts, matchups: realtimeMatchups, bracketCompleted } =
    useRealtimeBracket(bracket.id)

  // Track connected students via Supabase Presence
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
    for (const [matchupId, counts] of Object.entries(realtimeVoteCounts)) {
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

  // ---------------------------------------------------------------------------
  // DE region-specific derived data
  // ---------------------------------------------------------------------------

  // Split matchups by region for DE brackets
  const deMatchupsByRegion = useMemo(() => {
    if (!isDoubleElim) return { winners: [] as MatchupData[], losers: [] as MatchupData[], grand_finals: [] as MatchupData[] }
    return {
      winners: currentMatchups.filter((m) => m.bracketRegion === 'winners'),
      losers: currentMatchups.filter((m) => m.bracketRegion === 'losers'),
      grand_finals: currentMatchups.filter((m) => m.bracketRegion === 'grand_finals'),
    }
  }, [isDoubleElim, currentMatchups])

  // Compute round info per DE region
  const deRegionInfo = useMemo(() => {
    if (!isDoubleElim) return null

    const computeRegionInfo = (regionMatchups: MatchupData[]) => {
      if (regionMatchups.length === 0) return { minRound: 0, maxRound: 0, displayRounds: 0, currentDisplayRound: 0 }
      const rounds = regionMatchups.map((m) => m.round)
      const minRound = Math.min(...rounds)
      const maxRound = Math.max(...rounds)
      const displayRounds = maxRound - minRound + 1

      // Current display round: first non-fully-decided round in this region
      let currentDisplayRound = 1
      for (let dr = 1; dr <= displayRounds; dr++) {
        const dbRound = minRound + dr - 1
        const roundMatchups = regionMatchups.filter((m) => m.round === dbRound)
        const allDecided = roundMatchups.length > 0 && roundMatchups.every((m) => m.status === 'decided')
        if (!allDecided) {
          currentDisplayRound = dr
          break
        }
        currentDisplayRound = dr // if all decided, stay on last
      }
      return { minRound, maxRound, displayRounds, currentDisplayRound }
    }

    return {
      winners: computeRegionInfo(deMatchupsByRegion.winners),
      losers: computeRegionInfo(deMatchupsByRegion.losers),
      grand_finals: computeRegionInfo(deMatchupsByRegion.grand_finals),
    }
  }, [isDoubleElim, deMatchupsByRegion])

  // Active DE region matchups and round info
  const deActiveRegionMatchups = useMemo(() => {
    if (!isDoubleElim) return []
    return deMatchupsByRegion[deRegion]
  }, [isDoubleElim, deMatchupsByRegion, deRegion])

  const deActiveRegionInfo = useMemo(() => {
    if (!isDoubleElim || !deRegionInfo) return null
    return deRegionInfo[deRegion]
  }, [isDoubleElim, deRegionInfo, deRegion])

  // DE region round status (keyed by display round 1..N)
  const deRegionRoundStatus = useMemo(() => {
    if (!isDoubleElim || !deActiveRegionInfo) return {} as Record<number, { pending: number; voting: number; decided: number; total: number }>
    const status: Record<number, { pending: number; voting: number; decided: number; total: number }> = {}
    const { minRound, displayRounds } = deActiveRegionInfo
    for (let dr = 1; dr <= displayRounds; dr++) {
      const dbRound = minRound + dr - 1
      const rm = deActiveRegionMatchups.filter((m) => m.round === dbRound)
      status[dr] = {
        pending: rm.filter((m) => m.status === 'pending').length,
        voting: rm.filter((m) => m.status === 'voting').length,
        decided: rm.filter((m) => m.status === 'decided').length,
        total: rm.length,
      }
    }
    return status
  }, [isDoubleElim, deActiveRegionInfo, deActiveRegionMatchups])

  // DE region current DB round (for action handlers)
  const deCurrentDbRound = useMemo(() => {
    if (!isDoubleElim || !deActiveRegionInfo) return 1
    return deActiveRegionInfo.minRound + deActiveRegionInfo.currentDisplayRound - 1
  }, [isDoubleElim, deActiveRegionInfo])

  // DE bracket completion: all GF matchups decided
  const deBracketDone = useMemo(() => {
    if (!isDoubleElim) return false
    const gf = deMatchupsByRegion.grand_finals
    return gf.length > 0 && gf.every((m) => m.status === 'decided')
  }, [isDoubleElim, deMatchupsByRegion])

  // Auto-navigate to GF tab when DE bracket completes
  useEffect(() => {
    if (deBracketDone) {
      setDeRegion('grand_finals')
    }
  }, [deBracketDone])

  // Per-region status badge counts (for region tabs)
  const deRegionBadges = useMemo(() => {
    if (!isDoubleElim) return { winners: 0, losers: 0, grand_finals: 0 }
    const countActive = (matchups: MatchupData[]) =>
      matchups.filter((m) => m.status === 'pending' || m.status === 'voting').length
    return {
      winners: countActive(deMatchupsByRegion.winners),
      losers: countActive(deMatchupsByRegion.losers),
      grand_finals: countActive(deMatchupsByRegion.grand_finals),
    }
  }, [isDoubleElim, deMatchupsByRegion])

  // ---------------------------------------------------------------------------
  // Non-DE logic (SE/Predictive) -- unchanged
  // ---------------------------------------------------------------------------

  // Detect newly decided FINAL matchup and trigger WinnerReveal
  useEffect(() => {
    const prev = prevMatchupStatusRef.current
    for (const matchup of currentMatchups) {
      const prevStatus = prev[matchup.id]
      if (
        prevStatus &&
        prevStatus !== 'decided' &&
        matchup.status === 'decided' &&
        matchup.winner
      ) {
        // For DE: trigger reveal only for the final GF matchup
        if (isDoubleElim) {
          const gf = currentMatchups.filter((m) => m.bracketRegion === 'grand_finals')
          const maxGfRound = gf.length > 0 ? Math.max(...gf.map((m) => m.round)) : 0
          if (matchup.bracketRegion === 'grand_finals' && matchup.round === maxGfRound) {
            hasShownRevealRef.current = true
            setRevealState({
              winnerName: matchup.winner.name,
              entrant1Name: matchup.entrant1?.name ?? 'TBD',
              entrant2Name: matchup.entrant2?.name ?? 'TBD',
              entrant1Votes: 0,
              entrant2Votes: 0,
            })
          }
        } else if (
          !isRoundRobin &&
          matchup.round === totalRounds &&
          matchup.position === 1
        ) {
          // SE/Predictive: highest round, position 1 (guarded against RR misfiring)
          hasShownRevealRef.current = true
          setRevealState({
            winnerName: matchup.winner.name,
            entrant1Name: matchup.entrant1?.name ?? 'TBD',
            entrant2Name: matchup.entrant2?.name ?? 'TBD',
            entrant1Votes: 0,
            entrant2Votes: 0,
          })
        }
      }
    }
    const newStatuses: Record<string, string> = {}
    for (const m of currentMatchups) {
      newStatuses[m.id] = m.status
    }
    prevMatchupStatusRef.current = newStatuses
  }, [currentMatchups, totalRounds, isDoubleElim])

  // Fallback: DE-only. RR brackets use CelebrationScreen directly (no WinnerReveal).
  // The status-transition-based detection above may miss the GF decision if the
  // real-time refetch and prevMatchupStatusRef update race each other.
  // Uses hasShownRevealRef to prevent re-triggering after the reveal auto-dismisses.
  useEffect(() => {
    if (bracketCompleted && isDoubleElim && !hasShownRevealRef.current) {
      const gf = currentMatchups.filter((m) => m.bracketRegion === 'grand_finals')
      const maxGfRound = gf.length > 0 ? Math.max(...gf.map((m) => m.round)) : 0
      const finalGf = gf.find((m) => m.round === maxGfRound && m.winner)
      if (finalGf?.winner) {
        hasShownRevealRef.current = true
        setRevealState({
          winnerName: finalGf.winner.name,
          entrant1Name: finalGf.entrant1?.name ?? 'TBD',
          entrant2Name: finalGf.entrant2?.name ?? 'TBD',
          entrant1Votes: 0,
          entrant2Votes: 0,
        })
      }
    }
  }, [bracketCompleted, isDoubleElim, currentMatchups])

  // Chain celebration to reveal completion — CelebrationScreen IS the reveal
  const handleRevealComplete = useCallback(() => {
    setRevealState(null)
    setShowCelebration(true)
  }, [])

  // Fallback: if bracket completed but reveal never triggered, go straight to celebration
  // DE brackets excluded -- they use dedicated DE fallback (Path 2) with WinnerReveal -> handleRevealComplete -> CelebrationScreen
  useEffect(() => {
    if (bracketCompleted && !revealState && !hasShownRevealRef.current && !isDoubleElim) {
      const timer = setTimeout(() => {
        // Double-check: if reveal path already handled celebration, skip fallback
        if (!hasShownRevealRef.current) {
          setShowCelebration(true)
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [bracketCompleted, revealState, isDoubleElim])

  // Get voter IDs for selected matchup
  const currentVoterIds = useMemo(() => {
    if (!selectedMatchupId) return []
    return initialVoterIds[selectedMatchupId] ?? []
  }, [selectedMatchupId, initialVoterIds])

  // Current round (SE/Predictive only -- DE uses region-based deCurrentDbRound)
  const currentRound = useMemo(() => {
    if (isDoubleElim) return 1 // Not used for DE; region-based navigation instead
    for (let r = 1; r <= totalRounds; r++) {
      const roundMatchups = currentMatchups.filter((m) => m.round === r)
      const allDecided = roundMatchups.every((m) => m.status === 'decided')
      if (!allDecided) return r
    }
    return totalRounds
  }, [currentMatchups, totalRounds, isDoubleElim])

  // Champion name for celebration
  const championName = useMemo(() => {
    if (isDoubleElim) {
      const gf = currentMatchups.filter((m) => m.bracketRegion === 'grand_finals')
      if (gf.length === 0) return 'Champion'
      const maxRound = Math.max(...gf.map((m) => m.round))
      const finalGf = gf.find((m) => m.round === maxRound)
      return finalGf?.winner?.name ?? 'Champion'
    }
    const finalMatchup = currentMatchups.find(
      (m) => m.round === totalRounds && m.position === 1
    )
    return finalMatchup?.winner?.name ?? 'Champion'
  }, [currentMatchups, totalRounds, isDoubleElim])

  // Round-level status counts (SE/Predictive only -- DE uses deRegionRoundStatus)
  const roundStatus = useMemo(() => {
    if (isDoubleElim) return {} as Record<number, { pending: number; voting: number; decided: number; total: number }>
    const status: Record<number, { pending: number; voting: number; decided: number; total: number }> = {}
    for (let r = 1; r <= totalRounds; r++) {
      const rm = currentMatchups.filter((m) => m.round === r)
      status[r] = {
        pending: rm.filter((m) => m.status === 'pending').length,
        voting: rm.filter((m) => m.status === 'voting').length,
        decided: rm.filter((m) => m.status === 'decided').length,
        total: rm.length,
      }
    }
    return status
  }, [currentMatchups, totalRounds, isDoubleElim])

  // Build inline vote count labels for diagram: matchupId -> "3-2" style label
  const voteLabels = useMemo(() => {
    const labels: Record<string, { e1: number; e2: number }> = {}
    for (const m of currentMatchups) {
      if (m.status === 'voting' || m.status === 'decided') {
        const counts = mergedVoteCounts[m.id] ?? {}
        labels[m.id] = {
          e1: m.entrant1Id ? (counts[m.entrant1Id] ?? 0) : 0,
          e2: m.entrant2Id ? (counts[m.entrant2Id] ?? 0) : 0,
        }
      }
    }
    return labels
  }, [currentMatchups, mergedVoteCounts])

  // ---------------------------------------------------------------------------
  // Actions -- DE-aware
  // ---------------------------------------------------------------------------

  const handleOpenVoting = useCallback(() => {
    setError(null)
    let pendingIds: string[]

    if (isDoubleElim) {
      // Filter pending matchups in the active DE region's current DB round
      // IMPORTANT: Only include matchups with both entrants populated.
      // In DE, later-round matchups may be "pending" but waiting for entrants
      // from another region (e.g., Losers R2 waiting for Winners R2 losers).
      pendingIds = deActiveRegionMatchups
        .filter((m) => m.round === deCurrentDbRound && m.status === 'pending' && m.entrant1Id && m.entrant2Id)
        .map((m) => m.id)
    } else {
      pendingIds = currentMatchups
        .filter((m) => m.round === currentRound && m.status === 'pending')
        .map((m) => m.id)
    }

    if (pendingIds.length === 0) return
    startTransition(async () => {
      const result = await openMatchupsForVoting({ bracketId: bracket.id, matchupIds: pendingIds })
      if (result && 'error' in result) setError(result.error as string)
    })
  }, [isDoubleElim, deActiveRegionMatchups, deCurrentDbRound, currentMatchups, currentRound, bracket.id])

  const handleCloseAndAdvance = useCallback(() => {
    setError(null)

    let votingMatchups: MatchupData[]
    if (isDoubleElim) {
      votingMatchups = deActiveRegionMatchups.filter(
        (m) => m.round === deCurrentDbRound && m.status === 'voting'
      )
    } else {
      votingMatchups = currentMatchups.filter(
        (m) => m.round === currentRound && m.status === 'voting'
      )
    }

    const advanceList: Array<{ matchupId: string; winnerId: string }> = []
    const tiedCount = { value: 0 }
    const noVoteCount = { value: 0 }

    for (const m of votingMatchups) {
      const counts = mergedVoteCounts[m.id] ?? {}
      const e1 = m.entrant1Id ? (counts[m.entrant1Id] ?? 0) : 0
      const e2 = m.entrant2Id ? (counts[m.entrant2Id] ?? 0) : 0
      if (e1 > e2 && m.entrant1Id) {
        advanceList.push({ matchupId: m.id, winnerId: m.entrant1Id })
      } else if (e2 > e1 && m.entrant2Id) {
        advanceList.push({ matchupId: m.id, winnerId: m.entrant2Id })
      } else if (e1 > 0) {
        tiedCount.value++
      } else {
        // No votes cast on this matchup
        noVoteCount.value++
      }
    }

    const unresolvedCount = tiedCount.value + noVoteCount.value
    if (unresolvedCount > 0 && advanceList.length === 0) {
      const parts: string[] = []
      if (tiedCount.value > 0) parts.push(`${tiedCount.value} tied`)
      if (noVoteCount.value > 0) parts.push(`${noVoteCount.value} with no votes`)
      setError(`All matchups need manual resolution (${parts.join(', ')}). Click a matchup to pick a winner.`)
      // Auto-open pick-winner for first unresolved matchup
      const firstUnresolved = votingMatchups.find((m) => {
        const counts = mergedVoteCounts[m.id] ?? {}
        const e1 = m.entrant1Id ? (counts[m.entrant1Id] ?? 0) : 0
        const e2 = m.entrant2Id ? (counts[m.entrant2Id] ?? 0) : 0
        return e1 === e2
      })
      if (firstUnresolved) {
        setSelectedMatchupId(firstUnresolved.id)
      }
      return
    }

    startTransition(async () => {
      for (const { matchupId, winnerId } of advanceList) {
        const result = await advanceMatchup({ bracketId: bracket.id, matchupId, winnerId })
        if (result && 'error' in result) { setError(result.error as string); return }
      }
      if (unresolvedCount > 0) {
        const parts: string[] = []
        if (tiedCount.value > 0) parts.push(`${tiedCount.value} tied`)
        if (noVoteCount.value > 0) parts.push(`${noVoteCount.value} with no votes`)
        setError(`${advanceList.length} advanced. ${parts.join(', ')} -- click matchup to pick winner.`)
        // Auto-open pick-winner for first unresolved matchup
        const firstUnresolved = votingMatchups.find((m) => {
          const counts = mergedVoteCounts[m.id] ?? {}
          const e1 = m.entrant1Id ? (counts[m.entrant1Id] ?? 0) : 0
          const e2 = m.entrant2Id ? (counts[m.entrant2Id] ?? 0) : 0
          return e1 === e2
        })
        if (firstUnresolved) {
          setSelectedMatchupId(firstUnresolved.id)
        }
      }
    })
  }, [isDoubleElim, deActiveRegionMatchups, deCurrentDbRound, currentMatchups, currentRound, mergedVoteCounts, bracket.id])

  const handleAdvanceRound = useCallback(() => {
    setError(null)
    const roundToAdvance = isDoubleElim ? deCurrentDbRound : currentRound
    startTransition(async () => {
      const result = await batchAdvanceRound({ bracketId: bracket.id, round: roundToAdvance })
      if (result && 'error' in result) setError(result.error as string)
    })
  }, [bracket.id, currentRound, isDoubleElim, deCurrentDbRound])

  // ---------------------------------------------------------------------------
  // Round-robin: current round, advance logic, and handlers
  // ---------------------------------------------------------------------------

  // Current round = the highest RR round that has been opened (voting or decided).
  // This ensures that when round 1 is all decided, we stay on round 1 (not jump to pending round 2)
  // so that canAdvanceRoundRobin can detect completion and show the "Open Round 2" button.
  const currentRoundRobinRound = useMemo(() => {
    if (!isRoundRobin) return 1
    const activeRounds = currentMatchups
      .filter((m) => m.roundRobinRound != null && m.status !== 'pending')
      .map((m) => m.roundRobinRound!)
    if (activeRounds.length === 0) return 1
    return Math.max(...activeRounds)
  }, [isRoundRobin, currentMatchups])

  // Check if round 1 needs opening (fallback for brackets activated before auto-open fix)
  const needsRound1Open = useMemo(() => {
    if (!isRoundRobin) return false
    const round1Matchups = currentMatchups.filter((m) => m.roundRobinRound === 1)
    return round1Matchups.length > 0 && round1Matchups.every((m) => m.status === 'pending')
  }, [isRoundRobin, currentMatchups])

  const canAdvanceRoundRobin = useMemo(() => {
    if (!isRoundRobin) return false
    const pacing = (bracket.roundRobinPacing ?? 'round_by_round') as 'round_by_round' | 'all_at_once'
    if (pacing !== 'round_by_round') return false
    const currentRoundMatchups = currentMatchups.filter((m) => m.roundRobinRound === currentRoundRobinRound)
    const allDecided = currentRoundMatchups.length > 0 && currentRoundMatchups.every((m) => m.status === 'decided')
    const nextRoundExists = currentMatchups.some((m) => (m.roundRobinRound ?? 0) > currentRoundRobinRound)
    return allDecided && nextRoundExists
  }, [isRoundRobin, currentMatchups, currentRoundRobinRound, bracket.roundRobinPacing])

  const handleRecordRoundRobinResult = useCallback((matchupId: string, winnerId: string | null) => {
    setError(null)
    startTransition(async () => {
      const result = await recordResult({
        bracketId: bracket.id,
        matchupId,
        winnerId,
      })
      if (result && 'error' in result) setError(result.error as string)
    })
  }, [bracket.id])

  const handleAdvanceRoundRobin = useCallback(() => {
    setError(null)
    const nextRound = currentRoundRobinRound + 1
    startTransition(async () => {
      const result = await advanceRound({
        bracketId: bracket.id,
        roundNumber: nextRound,
      })
      if (result && 'error' in result) setError(result.error as string)
    })
  }, [bracket.id, currentRoundRobinRound])

  // Round-robin: batch decide all voting matchups in current round by vote majority
  const handleBatchDecideByVotes = useCallback(() => {
    setError(null)
    const votingMatchups = currentMatchups.filter(
      (m) => m.roundRobinRound === currentRoundRobinRound && m.status === 'voting'
    )
    if (votingMatchups.length === 0) return

    startTransition(async () => {
      for (const m of votingMatchups) {
        const counts = mergedVoteCounts[m.id] ?? {}
        const e1 = m.entrant1Id ? (counts[m.entrant1Id] ?? 0) : 0
        const e2 = m.entrant2Id ? (counts[m.entrant2Id] ?? 0) : 0

        let winnerId: string | null = null
        if (e1 > e2 && m.entrant1Id) {
          winnerId = m.entrant1Id
        } else if (e2 > e1 && m.entrant2Id) {
          winnerId = m.entrant2Id
        }
        // Tied or no votes -> winnerId stays null (tie)

        const result = await recordResult({
          bracketId: bracket.id,
          matchupId: m.id,
          winnerId,
        })
        if (result && 'error' in result) {
          setError(result.error as string)
          return
        }
      }
    })
  }, [currentMatchups, currentRoundRobinRound, mergedVoteCounts, bracket.id])

  // ---------------------------------------------------------------------------
  // Per-matchup actions
  // ---------------------------------------------------------------------------

  // Click matchup in diagram to select it for per-matchup actions
  const handleMatchupClick = useCallback((matchupId: string) => {
    setSelectedMatchupId((prev) => (prev === matchupId ? null : matchupId))
  }, [])

  // Per-matchup action: teacher picks winner (tie break or override)
  const handlePickWinner = useCallback((matchupId: string, winnerId: string) => {
    setError(null)
    setSelectedMatchupId(null)
    startTransition(async () => {
      const result = await advanceMatchup({ bracketId: bracket.id, matchupId, winnerId })
      if (result && 'error' in result) setError(result.error as string)
    })
  }, [bracket.id])

  // Get selected matchup details
  const selectedMatchup = currentMatchups.find((m) => m.id === selectedMatchupId) ?? null

  // Round label helper (SE/Predictive)
  function getRoundLabel(round: number): string {
    if (round === totalRounds) return 'Final'
    if (round === totalRounds - 1) return 'Semis'
    if (round === totalRounds - 2) return 'Quarters'
    return `R${round}`
  }

  // DE region round label helper
  function getDeRoundLabel(displayRound: number, regionTotalRounds: number, region: DERegion): string {
    if (region === 'grand_finals') {
      if (displayRound === 1) return 'GF 1'
      return 'GF Reset'
    }
    if (displayRound === regionTotalRounds) return 'Final'
    return `R${displayRound}`
  }

  // DE region display name
  function getRegionDisplayName(region: DERegion): string {
    if (region === 'winners') return 'Winners'
    if (region === 'losers') return 'Losers'
    return 'Grand Finals'
  }

  // ---------------------------------------------------------------------------
  // Determine primary action for action bar
  // ---------------------------------------------------------------------------

  // For DE, use region-specific round status
  const deRs = isDoubleElim && deActiveRegionInfo
    ? deRegionRoundStatus[deActiveRegionInfo.currentDisplayRound]
    : null
  const deAllRegionRoundDecided = deRs && deRs.decided === deRs.total && deRs.total > 0
  const deHasVoting = deRs && deRs.voting > 0
  // DE: only count pending matchups that have both entrants (ready to vote)
  const deReadyPendingCount = isDoubleElim && deActiveRegionInfo
    ? deActiveRegionMatchups.filter(
        (m) => m.round === (deActiveRegionInfo.minRound + deActiveRegionInfo.currentDisplayRound - 1)
          && m.status === 'pending' && m.entrant1Id && m.entrant2Id
      ).length
    : 0
  const deHasPending = deReadyPendingCount > 0
  // Count pending matchups waiting for entrants (blocked by another region)
  const deWaitingForEntrants = isDoubleElim && deActiveRegionInfo
    ? deActiveRegionMatchups.filter(
        (m) => m.round === (deActiveRegionInfo.minRound + deActiveRegionInfo.currentDisplayRound - 1)
          && m.status === 'pending' && (!m.entrant1Id || !m.entrant2Id)
      ).length
    : 0
  // DE region round is "done" when all rounds in that region are decided
  const deRegionAllDone = isDoubleElim && deActiveRegionInfo
    ? Object.values(deRegionRoundStatus).every((s) => s.decided === s.total && s.total > 0)
    : false

  // For SE/Predictive (unchanged)
  const rs = roundStatus[currentRound]
  const allRoundDecided = rs && rs.decided === rs.total && rs.total > 0
  const hasVoting = rs && rs.voting > 0
  const hasPending = rs && rs.pending > 0
  const bracketDone = isDoubleElim
    ? deBracketDone
    : (currentRound === totalRounds && allRoundDecided)

  // isPredictive is now used for PredictionLeaderboard rendering

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Winner Reveal overlay */}
      {revealState && (
        <WinnerReveal
          entrant1Name={revealState.entrant1Name}
          entrant2Name={revealState.entrant2Name}
          onComplete={handleRevealComplete}
        />
      )}

      {/* Celebration Screen overlay */}
      {showCelebration && (
        <CelebrationScreen
          championName={championName}
          bracketName={bracket.name}
          onDismiss={() => { setShowCelebration(false); setRevealState(null) }}
        />
      )}

      {/* Top bar with actions */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <h1 className="text-lg font-bold">{bracket.name}</h1>
        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          LIVE
        </span>

        {/* DE region tabs */}
        {isDoubleElim && (
          <div className="flex gap-1">
            {(['winners', 'losers', 'grand_finals'] as DERegion[]).map((region) => {
              const isActive = region === deRegion
              const badge = deRegionBadges[region]
              const regionMatchups = deMatchupsByRegion[region]
              const allDecided = regionMatchups.length > 0 && regionMatchups.every((m) => m.status === 'decided')
              // Hide GF tab if no GF matchups exist yet
              if (region === 'grand_finals' && regionMatchups.length === 0) return null
              return (
                <button
                  key={region}
                  onClick={() => setDeRegion(region)}
                  className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : allDecided
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {getRegionDisplayName(region)}
                  {badge > 0 && (
                    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                  {allDecided && regionMatchups.length > 0 && ' \u2713'}
                </button>
              )
            })}
          </div>
        )}

        {/* DE region round sub-tabs */}
        {isDoubleElim && deActiveRegionInfo && deActiveRegionInfo.displayRounds > 0 && (
          <div className="flex gap-0.5 border-l pl-2">
            {Array.from({ length: deActiveRegionInfo.displayRounds }, (_, i) => i + 1).map((dr) => {
              const s = deRegionRoundStatus[dr]
              const isActiveDr = dr === deActiveRegionInfo.currentDisplayRound
              const isComplete = s && s.decided === s.total && s.total > 0
              return (
                <span
                  key={dr}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    isActiveDr
                      ? 'bg-primary/80 text-primary-foreground'
                      : isComplete
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted/60 text-muted-foreground'
                  }`}
                >
                  {getDeRoundLabel(dr, deActiveRegionInfo.displayRounds, deRegion)}
                  {isComplete && ' \u2713'}
                </span>
              )
            })}
          </div>
        )}

        {/* Round tabs (SE / Predictive non-auto only -- NOT DE, NOT auto) */}
        {!isRoundRobin && !isDoubleElim && !isPredictiveAuto && (
          <div className="flex gap-1">
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
              const s = roundStatus[round]
              const isActive = round === currentRound
              const isComplete = s && s.decided === s.total && s.total > 0
              return (
                <span
                  key={round}
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isComplete
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {getRoundLabel(round)}
                  {isComplete && ' \u2713'}
                </span>
              )
            })}
          </div>
        )}

        {/* Round-robin: current round indicator */}
        {isRoundRobin && (
          <span className="rounded px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground">
            Round {currentRoundRobinRound}
          </span>
        )}

        <div className="flex-1" />

        {/* DE primary action buttons — include region label for clarity */}
        {isDoubleElim && deHasPending && (
          <button
            onClick={handleOpenVoting}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Opening...' : `Open ${getRegionDisplayName(deRegion)} Voting (${deReadyPendingCount})`}
          </button>
        )}

        {/* DE: show hint when matchups are waiting for entrants from another region */}
        {isDoubleElim && !deHasPending && !deHasVoting && !deAllRegionRoundDecided && !deRegionAllDone && deWaitingForEntrants > 0 && (
          <span className="rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            {deWaitingForEntrants} matchup{deWaitingForEntrants > 1 ? 's' : ''} waiting for {deRegion === 'losers' ? 'Winners' : 'Losers'} bracket results
          </span>
        )}

        {isDoubleElim && deHasVoting && (
          <button
            onClick={handleCloseAndAdvance}
            disabled={isPending}
            className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {isPending ? 'Closing...' : `Close ${getRegionDisplayName(deRegion)} & Advance (${deRs!.voting})`}
          </button>
        )}

        {isDoubleElim && deAllRegionRoundDecided && !deRegionAllDone && !deBracketDone && (
          <button
            onClick={handleAdvanceRound}
            disabled={isPending}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? 'Advancing...' : 'Next Round \u2192'}
          </button>
        )}

        {/* Predictive manual mode: hint to click matchups */}
        {isPredictiveManual && !bracketDone && (
          <span className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            Click a matchup to pick the winner
          </span>
        )}

        {/* SE / Predictive (vote_based) primary action buttons (NOT DE, NOT RR, NOT manual, NOT auto) */}
        {!isRoundRobin && !isDoubleElim && !isPredictiveManual && !isPredictiveAuto && hasPending && (
          <button
            onClick={handleOpenVoting}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Opening...' : `Open Voting (${rs!.pending})`}
          </button>
        )}

        {!isRoundRobin && !isDoubleElim && !isPredictiveManual && !isPredictiveAuto && hasVoting && (
          <button
            onClick={handleCloseAndAdvance}
            disabled={isPending}
            className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {isPending ? 'Closing...' : `Close & Advance (${rs!.voting})`}
          </button>
        )}

        {!isRoundRobin && !isDoubleElim && !isPredictiveManual && !isPredictiveAuto && allRoundDecided && !bracketDone && (
          <button
            onClick={handleAdvanceRound}
            disabled={isPending}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? 'Advancing...' : 'Next Round \u2192'}
          </button>
        )}

        {/* Round-robin: Open Round 1 fallback button */}
        {isRoundRobin && needsRound1Open && (
          <button
            onClick={() => {
              setError(null)
              startTransition(async () => {
                const result = await advanceRound({ bracketId: bracket.id, roundNumber: 1 })
                if (result && 'error' in result) setError(result.error as string)
              })
            }}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Opening...' : 'Open Round 1'}
          </button>
        )}

        {/* Round-robin advance button in top bar */}
        {isRoundRobin && canAdvanceRoundRobin && (
          <button
            onClick={handleAdvanceRoundRobin}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Opening...' : `Open Round ${currentRoundRobinRound + 1}`}
          </button>
        )}

        {bracketDone && !isPredictiveAuto && (
          <span className="flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Complete!
          </span>
        )}

        {sessionCode && <QRCodeDisplay code={sessionCode} />}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Pick winner modal — shown for voting matchups, or pending matchups in manual mode */}
      {selectedMatchup && (selectedMatchup.status === 'voting' || (isPredictiveManual && selectedMatchup.status === 'pending')) && selectedMatchup.entrant1Id && selectedMatchup.entrant2Id && (() => {
        const votes = voteLabels[selectedMatchup.id]
        const e1Votes = votes?.e1 ?? 0
        const e2Votes = votes?.e2 ?? 0
        const isTied = e1Votes === e2Votes
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedMatchupId(null)}>
            <div className="mx-4 w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-1 text-center text-base font-bold">Pick Winner</h2>
              <p className="mb-5 text-center text-xs text-muted-foreground">
                {isPredictiveManual
                  ? 'Select the winner for this matchup'
                  : isTied ? 'Tied -- teacher breaks the tie' : 'Override or confirm the vote leader'}
              </p>

              <div className="flex gap-3">
                {selectedMatchup.entrant1Id && (
                  <button
                    onClick={() => handlePickWinner(selectedMatchup.id, selectedMatchup.entrant1Id!)}
                    disabled={isPending}
                    className="flex flex-1 flex-col items-center gap-1.5 rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-4 transition-colors hover:border-blue-400 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:border-blue-600 dark:hover:bg-blue-950/50"
                  >
                    <span className="text-sm font-semibold">{selectedMatchup.entrant1?.name ?? 'TBD'}</span>
                    {!isPredictiveManual && (
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{e1Votes} vote{e1Votes !== 1 ? 's' : ''}</span>
                    )}
                  </button>
                )}
                {selectedMatchup.entrant2Id && (
                  <button
                    onClick={() => handlePickWinner(selectedMatchup.id, selectedMatchup.entrant2Id!)}
                    disabled={isPending}
                    className="flex flex-1 flex-col items-center gap-1.5 rounded-lg border-2 border-orange-200 bg-orange-50 px-4 py-4 transition-colors hover:border-orange-400 hover:bg-orange-100 disabled:opacity-50 dark:border-orange-800 dark:bg-orange-950/30 dark:hover:border-orange-600 dark:hover:bg-orange-950/50"
                  >
                    <span className="text-sm font-semibold">{selectedMatchup.entrant2?.name ?? 'TBD'}</span>
                    {!isPredictiveManual && (
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{e2Votes} vote{e2Votes !== 1 ? 's' : ''}</span>
                    )}
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedMatchupId(null)}
                className="mt-4 w-full rounded-md py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      })()}

      {/* Main content: diagram + sidebar */}
      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* Bracket diagram / type-specific view */}
        <div className="flex-1 overflow-auto rounded-lg border bg-card p-4">
          {isPredictiveAuto ? (
            /* Predictive auto mode: PredictiveBracket handles full lifecycle */
            <PredictiveBracket
              bracket={bracket}
              participantId="__teacher__"
              isTeacher={true}
            />
          ) : isDoubleElim ? (
            <DoubleElimDiagram
              bracket={bracket}
              entrants={bracket.entrants}
              matchups={currentMatchups}
              isTeacher={true}
              onMatchupClick={handleMatchupClick}
              selectedMatchupId={selectedMatchupId}
              voteLabels={voteLabels}
            />
          ) : isRoundRobin ? (
            <div className="space-y-6">
              {/* Standings table */}
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Standings
                </h2>
                <RoundRobinStandings
                  standings={standings}
                  isLive={bracket.roundRobinStandingsMode === 'live'}
                />
              </div>

              {/* Matchup grid */}
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Matchups
                </h2>
                <RoundRobinMatchups
                  matchups={currentMatchups}
                  entrants={bracket.entrants}
                  currentRound={currentRoundRobinRound}
                  pacing={(bracket.roundRobinPacing ?? 'round_by_round') as 'round_by_round' | 'all_at_once'}
                  isTeacher={true}
                  onRecordResult={handleRecordRoundRobinResult}
                  voteCounts={mergedVoteCounts}
                  onBatchDecideByVotes={handleBatchDecideByVotes}
                  votingStyle={(bracket.roundRobinVotingStyle ?? 'simple') as 'simple' | 'advanced'}
                  isBatchDeciding={isPending}
                />
              </div>
            </div>
          ) : (
            /* SE and Predictive (manual/vote_based): standard bracket diagram with vote counts */
            (bracket.maxEntrants ?? bracket.size) >= 32 ? (
              <RegionBracketView
                matchups={currentMatchups}
                totalRounds={totalRounds}
                bracketSize={bracket.maxEntrants ?? bracket.size}
                voteLabels={voteLabels}
                onMatchupClick={handleMatchupClick}
                selectedMatchupId={selectedMatchupId}
              />
            ) : (
              <BracketDiagram
                matchups={currentMatchups}
                totalRounds={totalRounds}
                voteLabels={voteLabels}
                onMatchupClick={handleMatchupClick}
                selectedMatchupId={selectedMatchupId}
              />
            )
          )}

          {/* Prediction leaderboard for non-auto predictive brackets */}
          {isPredictive && !isPredictiveAuto && (
            <div className="mt-4 border-t pt-4">
              <PredictionLeaderboard
                bracketId={bracket.id}
                initialScores={predictionScores}
                totalRounds={totalRounds}
                isTeacher={true}
              />
            </div>
          )}
        </div>

        {/* Participation sidebar */}
        <ParticipationSidebar
          participants={participants}
          connectedIds={connectedIds}
          voterIds={currentVoterIds}
          selectedMatchupId={selectedMatchupId}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isOpen={sidebarOpen}
        />
      </div>
    </div>
  )
}
