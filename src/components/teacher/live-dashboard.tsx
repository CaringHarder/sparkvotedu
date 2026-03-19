'use client'

import { useState, useMemo, useCallback, useEffect, useRef, useTransition } from 'react'
import { useRealtimeBracket } from '@/hooks/use-realtime-bracket'
import { useRealtimeParticipants } from '@/hooks/use-realtime-participants'
import { useSessionPresence } from '@/hooks/use-student-session'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'
import { RegionBracketView } from '@/components/bracket/region-bracket-view'
import { DoubleElimDiagram } from '@/components/bracket/double-elim-diagram'
import { RoundRobinStandings } from '@/components/bracket/round-robin-standings'
import { RoundRobinMatchups } from '@/components/bracket/round-robin-matchups'
import { WinnerReveal } from '@/components/bracket/winner-reveal'
import { CelebrationScreen } from '@/components/bracket/celebration-screen'
import { ParticipationSidebar } from '@/components/teacher/participation-sidebar'
import { VoteProgressBar } from '@/components/teacher/vote-progress-bar'
import { QRCodeDisplay } from '@/components/teacher/qr-code-display'
import { openMatchupsForVoting, advanceMatchup, batchAdvanceRound, undoRoundAdvancement, reopenBracket } from '@/actions/bracket-advance'
import { Undo2, RotateCcw, Eye, Hash, BarChart3, CheckCircle2 } from 'lucide-react'
import { recordResult, advanceRound } from '@/actions/round-robin'
import { triggerSportsSync } from '@/actions/sports'
import { updatePredictionStatus } from '@/actions/prediction'
import { PredictionLeaderboard } from '@/components/bracket/prediction-leaderboard'
import { PredictiveBracket } from '@/components/bracket/predictive-bracket'
import { calculateRoundRobinStandings, type RoundRobinResult } from '@/lib/bracket/round-robin'
import { BracketMetadataBar } from '@/components/shared/activity-metadata-bar'
import { QuickSettingsToggle } from '@/components/shared/quick-settings-toggle'
import { ViewingModeToggle } from '@/components/shared/viewing-mode-toggle'
import { DisplaySettingsSection } from '@/components/shared/display-settings-section'
import { LockedSettingIndicator } from '@/components/shared/locked-setting-indicator'
import { Switch } from '@/components/ui/switch'
import { updateBracketStatus, updateBracketSettings } from '@/actions/bracket'
import type { BracketWithDetails, MatchupData, RoundRobinStanding, PredictionScore } from '@/lib/bracket/types'
import type { VoteCounts } from '@/types/vote'

type DERegion = 'winners' | 'losers' | 'grand_finals'

interface LiveDashboardProps {
  bracket: BracketWithDetails
  totalRounds: number
  participants: Array<{ id: string; funName: string; firstName?: string; lastSeenAt: string; emoji?: string | null; lastInitial?: string | null }>
  initialVoteCounts: Record<string, VoteCounts>
  initialVoterIds: Record<string, string[]>
  sessionCode?: string | null
  standings?: RoundRobinStanding[]
  predictionScores?: PredictionScore[]
  predictionSubmitterIds?: string[]
  sessionName?: string | null
  teacherNameViewDefault?: string
}

interface RevealState {
  winnerName: string
  entrant1Name: string
  entrant2Name: string
  entrant1Votes: number
  entrant2Votes: number
}

/**
 * Compute RR champion info using calculateRoundRobinStandings.
 * Returns champion name, tie state, tied names, and runner-up name.
 * Multiple entrants sharing rank === 1 indicates a tie (co-champions).
 */
function computeRRChampionInfo(matchups: MatchupData[], entrants: { id: string; name: string }[]) {
  const decidedMatchups = matchups.filter((m) => m.status === 'decided')
  if (decidedMatchups.length === 0) return { championName: 'Champion', isTie: false, tiedNames: [] as string[], runnerUpName: '' }

  const results: RoundRobinResult[] = decidedMatchups
    .filter((m) => m.entrant1Id && m.entrant2Id)
    .map((m) => ({
      entrant1Id: m.entrant1Id!,
      entrant2Id: m.entrant2Id!,
      winnerId: m.winnerId,
    }))

  const standings = calculateRoundRobinStandings(results)

  // Enrich with names from entrants array
  const enriched = standings.map((s) => ({
    ...s,
    name: entrants.find((e) => e.id === s.entrantId)?.name ?? s.entrantId,
  }))

  // Check for tie at rank 1
  const rank1 = enriched.filter((s) => s.rank === 1)
  if (rank1.length > 1) {
    return {
      championName: rank1.map((s) => s.name).join(' & '),
      isTie: true,
      tiedNames: rank1.map((s) => s.name),
      runnerUpName: '',
    }
  }

  // Clear winner
  const champion = rank1[0]?.name ?? 'Champion'
  const runnerUp = enriched.find((s) => s.rank === 2)?.name ?? ''
  return { championName: champion, isTie: false, tiedNames: [], runnerUpName: runnerUp }
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
  predictionSubmitterIds = [],
  sessionName,
  teacherNameViewDefault = 'fun',
}: LiveDashboardProps) {
  const [selectedMatchupId, setSelectedMatchupId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [revealState, setRevealState] = useState<RevealState | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showFinalStandings, setShowFinalStandings] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Pause/resume state
  const [isPaused, setIsPaused] = useState(bracket.status === 'paused')

  // Undo round state
  const [showUndoConfirm, setShowUndoConfirm] = useState(false)
  const [undoFeedback, setUndoFeedback] = useState<string | null>(null)

  // DE region navigation state
  const [deRegion, setDeRegion] = useState<DERegion>('winners')

  // Bracket type detection
  const isDoubleElim = bracket.bracketType === 'double_elimination'
  const isRoundRobin = bracket.bracketType === 'round_robin'
  const isPredictive = bracket.bracketType === 'predictive'
  const isSports = bracket.bracketType === 'sports'
  const isPredictiveManual = isPredictive && bracket.predictiveResolutionMode === 'manual'
  const isPredictiveAuto = isPredictive && bracket.predictiveResolutionMode === 'auto'

  // Sync isPaused with bracket.status changes from realtime updates
  useEffect(() => {
    setIsPaused(bracket.status === 'paused')
  }, [bracket.status])

  // Pause toggle handler -- instant, no confirmation dialog
  const handlePauseToggle = useCallback((checked: boolean) => {
    setError(null)
    const newStatus = checked ? 'active' : 'paused'
    startTransition(async () => {
      const result = await updateBracketStatus({ bracketId: bracket.id, status: newStatus })
      if (result && 'error' in result) {
        setError(result.error as string)
      } else {
        setIsPaused(!checked)
      }
    })
  }, [bracket.id])

  // Display settings state
  const [viewingMode, setViewingMode] = useState(bracket.viewingMode)
  const [showSeedNumbers, setShowSeedNumbers] = useState(bracket.showSeedNumbers ?? true)
  const [showVoteCounts, setShowVoteCounts] = useState(bracket.showVoteCounts ?? true)
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)

  const handleViewingModeChange = useCallback(async (newMode: 'simple' | 'advanced') => {
    setIsUpdatingSettings(true)
    setViewingMode(newMode)
    try {
      await updateBracketSettings({ bracketId: bracket.id, viewingMode: newMode })
    } catch {
      setViewingMode(viewingMode)
    } finally {
      setIsUpdatingSettings(false)
    }
  }, [bracket.id, viewingMode])

  const handleShowSeedsChange = useCallback(async (checked: boolean) => {
    setIsUpdatingSettings(true)
    setShowSeedNumbers(checked)
    try {
      await updateBracketSettings({ bracketId: bracket.id, showSeedNumbers: checked })
    } catch {
      setShowSeedNumbers(!checked)
    } finally {
      setIsUpdatingSettings(false)
    }
  }, [bracket.id])

  const handleShowVoteCountsChange = useCallback(async (checked: boolean) => {
    setIsUpdatingSettings(true)
    setShowVoteCounts(checked)
    try {
      await updateBracketSettings({ bracketId: bracket.id, showVoteCounts: checked })
    } catch {
      setShowVoteCounts(!checked)
    } finally {
      setIsUpdatingSettings(false)
    }
  }, [bracket.id])

  function getBracketTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      single_elimination: 'Single Elimination',
      double_elimination: 'Double Elimination',
      round_robin: 'Round Robin',
      predictive: 'Predictive',
      sports: 'Sports',
    }
    return labels[type] ?? type
  }

  // Sports bracket sync state
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(bracket.lastSyncAt ?? null)

  // Track previous matchup statuses for detecting newly decided matchups
  const prevMatchupStatusRef = useRef<Record<string, string>>({})
  // Guard: prevent fallback reveal from re-triggering after dismiss
  const hasShownRevealRef = useRef(false)

  // Real-time vote count updates via Supabase Broadcast
  const { voteCounts: realtimeVoteCounts, voterIds: realtimeVoterIds, matchups: realtimeMatchups, bracketCompleted } =
    useRealtimeBracket(bracket.id)

  // Real-time participant list refresh (new joins + name edits)
  const { participants: realtimeParticipants, newParticipantIds } =
    useRealtimeParticipants(bracket.sessionId, participants)

  // Track connected students via Supabase Presence
  const { connectedStudents } = useSessionPresence(
    bracket.sessionId ?? '__no_session__',
    '__teacher__'
  )

  // Derive connected participant IDs set from presence data
  const connectedIds = useMemo(() => {
    const names = new Set(connectedStudents.map((s) => s.funName))
    const ids = new Set<string>()
    for (const p of realtimeParticipants) {
      if (names.has(p.funName)) {
        ids.add(p.id)
      }
    }
    return ids
  }, [connectedStudents, realtimeParticipants])

  // Merge initial matchups with real-time updates
  const currentMatchups: MatchupData[] = useMemo(() => {
    if (realtimeMatchups) {
      return realtimeMatchups as MatchupData[]
    }
    return bracket.matchups
  }, [realtimeMatchups, bracket.matchups])

  // Update lastSyncAt when real-time data refreshes (cron sync broadcasts bracket_update)
  useEffect(() => {
    if (isSports && realtimeMatchups) {
      setLastSyncAt(new Date().toISOString())
    }
  }, [isSports, realtimeMatchups])

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

  // Fallback: if bracket completed but reveal never triggered, show WinnerReveal then celebration
  // DE brackets excluded -- they use dedicated DE fallback (Path 2) with WinnerReveal -> handleRevealComplete -> CelebrationScreen
  useEffect(() => {
    if (bracketCompleted && !revealState && !hasShownRevealRef.current && !isDoubleElim) {
      // RR and SE: compute champion + runner-up from matchup results
      const timer = setTimeout(() => {
        hasShownRevealRef.current = true
        // For RR: derive winner from matchup wins; for SE: use final matchup winner
        let champ = 'Champion'
        let runnerUp = ''
        if (isRoundRobin) {
          // Use calculateRoundRobinStandings for correct tie handling
          const entrantsMap = new Map<string, string>()
          for (const m of currentMatchups) {
            if (m.entrant1) entrantsMap.set(m.entrant1.id, m.entrant1.name)
            if (m.entrant2) entrantsMap.set(m.entrant2.id, m.entrant2.name)
          }
          const entrants = [...entrantsMap.entries()].map(([id, name]) => ({ id, name }))
          const info = computeRRChampionInfo(currentMatchups, entrants)
          champ = info.championName
          runnerUp = info.runnerUpName
        } else {
          // SE: final matchup
          const finalMatchup = currentMatchups.find(
            (m) => m.round === totalRounds && m.position === 1
          )
          champ = finalMatchup?.winner?.name ?? 'Champion'
          // Runner-up is the other entrant in the final
          const winnerId = finalMatchup?.winnerId
          if (finalMatchup?.entrant1Id === winnerId) {
            runnerUp = finalMatchup?.entrant2?.name ?? ''
          } else {
            runnerUp = finalMatchup?.entrant1?.name ?? ''
          }
        }
        setRevealState({
          winnerName: champ,
          entrant1Name: champ,
          entrant2Name: runnerUp,
          entrant1Votes: 0,
          entrant2Votes: 0,
        })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [bracketCompleted, revealState, isDoubleElim, isRoundRobin, currentMatchups, totalRounds])

  // Merge initial and realtime voter IDs per matchup
  const mergedVoterIds = useMemo(() => {
    const merged: Record<string, string[]> = { ...initialVoterIds }
    // Seed prediction submitters from initial load
    if (predictionSubmitterIds.length > 0) {
      merged['predictions'] = [...predictionSubmitterIds]
    }
    for (const [matchupId, pids] of Object.entries(realtimeVoterIds)) {
      const existing = new Set(merged[matchupId] ?? [])
      for (const pid of pids) existing.add(pid)
      merged[matchupId] = [...existing]
    }
    return merged
  }, [initialVoterIds, realtimeVoterIds, predictionSubmitterIds])

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
    if (isRoundRobin) {
      const entrantsMap = new Map<string, string>()
      for (const m of currentMatchups) {
        if (m.entrant1) entrantsMap.set(m.entrant1.id, m.entrant1.name)
        if (m.entrant2) entrantsMap.set(m.entrant2.id, m.entrant2.name)
      }
      const entrants = [...entrantsMap.entries()].map(([id, name]) => ({ id, name }))
      return computeRRChampionInfo(currentMatchups, entrants).championName
    }
    // SE fallback
    const finalMatchup = currentMatchups.find(
      (m) => m.round === totalRounds && m.position === 1
    )
    return finalMatchup?.winner?.name ?? 'Champion'
  }, [currentMatchups, totalRounds, isDoubleElim, isRoundRobin])

  // RR tie info for CelebrationScreen
  const championTieInfo = useMemo(() => {
    if (!isRoundRobin) return { isTie: false, tiedNames: [] as string[] }
    const entrantsMap = new Map<string, string>()
    for (const m of currentMatchups) {
      if (m.entrant1) entrantsMap.set(m.entrant1.id, m.entrant1.name)
      if (m.entrant2) entrantsMap.set(m.entrant2.id, m.entrant2.name)
    }
    const entrants = [...entrantsMap.entries()].map(([id, name]) => ({ id, name }))
    return computeRRChampionInfo(currentMatchups, entrants)
  }, [currentMatchups, isRoundRobin])

  // Client-side standings from current matchups (for post-celebration overlay)
  // Wired to <RoundRobinStandings standings={rrClientStandings} /> in the overlay below
  const rrClientStandings = useMemo(() => {
    if (!isRoundRobin) return []
    const decidedMatchups = currentMatchups.filter((m) => m.status === 'decided')
    if (decidedMatchups.length === 0) return []
    const results: RoundRobinResult[] = decidedMatchups
      .filter((m) => m.entrant1Id && m.entrant2Id)
      .map((m) => ({
        entrant1Id: m.entrant1Id!,
        entrant2Id: m.entrant2Id!,
        winnerId: m.winnerId,
      }))
    const rawStandings = calculateRoundRobinStandings(results)
    const entrantsMap = new Map<string, string>()
    for (const m of currentMatchups) {
      if (m.entrant1) entrantsMap.set(m.entrant1.id, m.entrant1.name)
      if (m.entrant2) entrantsMap.set(m.entrant2.id, m.entrant2.name)
    }
    return rawStandings.map((s) => ({
      ...s,
      entrantName: entrantsMap.get(s.entrantId) ?? s.entrantId,
    }))
  }, [isRoundRobin, currentMatchups])

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

  // Round-robin round progress: how many rounds are fully decided out of total
  const rrRoundProgress = useMemo(() => {
    if (!isRoundRobin) return { completed: 0, total: 0 }
    const roundsMap = new Map<number, MatchupData[]>()
    for (const m of currentMatchups) {
      const rr = m.roundRobinRound ?? m.round
      if (!roundsMap.has(rr)) roundsMap.set(rr, [])
      roundsMap.get(rr)!.push(m)
    }
    let completed = 0
    const total = roundsMap.size
    for (const [, matchups] of roundsMap) {
      if (matchups.length > 0 && matchups.every((m) => m.status === 'decided')) {
        completed++
      }
    }
    return { completed, total }
  }, [isRoundRobin, currentMatchups])

  // Check if all rounds need opening (fallback for brackets activated before auto-open fix)
  const needsRoundsOpen = useMemo(() => {
    if (!isRoundRobin) return false
    // All matchups across all rounds are pending -- need manual open
    return currentMatchups.length > 0 && currentMatchups.every((m) => m.status === 'pending')
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

  // Compute current voter IDs based on bracket type
  const currentVoterIds = useMemo(() => {
    if (isRoundRobin) {
      const roundMatchups = currentMatchups.filter(
        (m) => m.roundRobinRound === currentRoundRobinRound &&
               (m.status === 'voting' || m.status === 'decided')
      )
      if (roundMatchups.length === 0) return []
      const matchupVoterSets = roundMatchups.map(m =>
        new Set(mergedVoterIds[m.id] ?? [])
      )
      // Intersect: student must appear in ALL matchup voter sets
      const allPids = new Set(participants.map(p => p.id))
      return [...allPids].filter(pid =>
        matchupVoterSets.every(set => set.has(pid))
      )
    }
    if (isPredictive || isSports) {
      // Use the special 'predictions' key for prediction submitters
      return mergedVoterIds['predictions'] ?? []
    }
    // SE/DE: if a specific matchup is selected, use its voter IDs
    if (selectedMatchupId) return mergedVoterIds[selectedMatchupId] ?? []
    // No matchup selected -- union voter IDs across all voting matchups in current round
    const votingMatchups = currentMatchups.filter(
      (m) => m.status === 'voting' && m.round === currentRound
    )
    const allVoterIds = new Set<string>()
    for (const m of votingMatchups) {
      for (const id of (mergedVoterIds[m.id] ?? [])) {
        allVoterIds.add(id)
      }
    }
    return [...allVoterIds]
  }, [isRoundRobin, isPredictive, isSports, selectedMatchupId, currentMatchups,
      currentRound, currentRoundRobinRound, mergedVoterIds, participants])

  // Whether there is an active voting context (for sidebar display)
  const hasActiveVotingContext = isRoundRobin || isPredictive || isSports || selectedMatchupId !== null ||
    currentMatchups.some((m) => m.status === 'voting')

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

  // Round-robin: batch decide all voting matchups in a given round by vote majority
  const handleBatchDecideByVotes = useCallback((roundNumber: number) => {
    setError(null)
    const votingMatchups = currentMatchups.filter(
      (m) => m.roundRobinRound === roundNumber && m.status === 'voting'
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
  }, [currentMatchups, mergedVoteCounts, bracket.id])

  // ---------------------------------------------------------------------------
  // Sports bracket: sync, prediction controls, and live game detection
  // ---------------------------------------------------------------------------

  const handleManualSync = useCallback(() => {
    setIsSyncing(true)
    setError(null)
    startTransition(async () => {
      try {
        const result = await triggerSportsSync()
        if (result && 'error' in result) {
          setError(result.error as string)
        } else {
          setLastSyncAt(new Date().toISOString())
        }
      } finally {
        setIsSyncing(false)
      }
    })
  }, [])

  const handleOpenPredictions = useCallback(() => {
    setError(null)
    startTransition(async () => {
      const result = await updatePredictionStatus({
        bracketId: bracket.id,
        status: 'predictions_open',
      })
      if (result && 'error' in result) setError(result.error as string)
    })
  }, [bracket.id])

  const handleClosePredictions = useCallback(() => {
    setError(null)
    startTransition(async () => {
      const result = await updatePredictionStatus({
        bracketId: bracket.id,
        status: 'active',
      })
      if (result && 'error' in result) setError(result.error as string)
    })
  }, [bracket.id])

  // Detect if any games are currently in progress
  const hasLiveGames = useMemo(() => {
    if (!isSports) return false
    return currentMatchups.some((m) => m.gameStatus === 'in_progress')
  }, [isSports, currentMatchups])

  // Format relative time for last sync display
  const lastSyncDisplay = useMemo(() => {
    if (!lastSyncAt) return 'Never'
    const diff = Date.now() - new Date(lastSyncAt).getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }, [lastSyncAt])

  // Auto-refresh the relative time display every 30 seconds
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isSports) return
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [isSports])

  // Auto-poll sports scores every 60 seconds
  useEffect(() => {
    if (!isSports) return
    const interval = setInterval(() => {
      if (!isSyncing) {
        handleManualSync()
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [isSports, handleManualSync])

  // ---------------------------------------------------------------------------
  // Aggregate vote progress across all currently-voting matchups
  // ---------------------------------------------------------------------------

  const votingProgressData = useMemo(() => {
    // Predictive auto / Sports have no student voting -- skip
    if (isPredictiveAuto || isSports) {
      return { votedCount: 0, totalCount: 0, isVotingActive: false, roundLabel: undefined as string | undefined }
    }

    let votingMatchups: MatchupData[]
    let roundLabel: string | undefined

    if (isDoubleElim && deActiveRegionInfo) {
      votingMatchups = deActiveRegionMatchups.filter(
        (m) => m.round === deCurrentDbRound && m.status === 'voting'
      )
      roundLabel = `${getRegionDisplayName(deRegion)} ${getDeRoundLabel(deActiveRegionInfo.currentDisplayRound, deActiveRegionInfo.displayRounds, deRegion)}`
    } else if (isRoundRobin) {
      votingMatchups = currentMatchups.filter(
        (m) => m.roundRobinRound === currentRoundRobinRound && m.status === 'voting'
      )
      roundLabel = `Round ${currentRoundRobinRound}`
    } else {
      // SE, Predictive (vote-based)
      votingMatchups = currentMatchups.filter(
        (m) => m.round === currentRound && m.status === 'voting'
      )
      if (totalRounds > 1) roundLabel = getRoundLabel(currentRound)
    }

    if (votingMatchups.length === 0) {
      return { votedCount: 0, totalCount: participants.length, isVotingActive: false, roundLabel }
    }

    // Union unique voter IDs across all voting matchups from mergedVoterIds
    const allVoterIds = new Set<string>()
    for (const m of votingMatchups) {
      for (const id of (mergedVoterIds[m.id] ?? [])) {
        allVoterIds.add(id)
      }
    }

    const votedCount = allVoterIds.size

    return {
      votedCount: Math.min(votedCount, participants.length),
      totalCount: participants.length,
      isVotingActive: true,
      roundLabel,
    }
  }, [
    isPredictiveAuto, isSports, isDoubleElim, isRoundRobin,
    deActiveRegionInfo, deActiveRegionMatchups, deCurrentDbRound, deRegion,
    currentMatchups, currentRoundRobinRound, currentRound, totalRounds,
    participants.length, mergedVoterIds,
  ])

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
  const rrAllDecided = isRoundRobin
    ? currentMatchups.length > 0 && currentMatchups.every((m) => m.status === 'decided')
    : false
  const bracketDone = isDoubleElim
    ? deBracketDone
    : isRoundRobin
      ? rrAllDecided
      : (currentRound === totalRounds && allRoundDecided)

  // isPredictive is now used for PredictionLeaderboard rendering

  // ---------------------------------------------------------------------------
  // Undo round detection: compute the most recent undoable round per bracket type
  // ---------------------------------------------------------------------------

  const undoableRound = useMemo(() => {
    // Only available on active, paused, or just-completed brackets
    if (bracket.status === 'draft') return null

    if (isRoundRobin) {
      // RR: highest roundRobinRound where all matchups are decided
      // AND no next round has voting/decided matchups
      const roundGroups = new Map<number, MatchupData[]>()
      for (const m of currentMatchups) {
        const rr = m.roundRobinRound ?? 1
        if (!roundGroups.has(rr)) roundGroups.set(rr, [])
        roundGroups.get(rr)!.push(m)
      }
      const sortedRounds = [...roundGroups.keys()].sort((a, b) => b - a)
      for (const rr of sortedRounds) {
        const matchups = roundGroups.get(rr)!
        if (matchups.every(m => m.status === 'decided')) {
          // Check next round
          const nextRound = roundGroups.get(rr + 1)
          if (!nextRound || nextRound.every(m => m.status === 'pending')) {
            return { round: rr, label: `Undo Round ${rr} Results` }
          }
        }
      }
      return null
    }

    if (isDoubleElim) {
      // DE: check each region for undoable rounds
      // Check GF first (most recent action), then LB, then WB
      const regions: DERegion[] = ['grand_finals', 'losers', 'winners']
      for (const region of regions) {
        const regionMatchups = currentMatchups.filter(m => m.bracketRegion === region)
        if (regionMatchups.length === 0) continue
        const roundGroups = new Map<number, MatchupData[]>()
        for (const m of regionMatchups) {
          if (!roundGroups.has(m.round)) roundGroups.set(m.round, [])
          roundGroups.get(m.round)!.push(m)
        }
        const sortedRounds = [...roundGroups.keys()].sort((a, b) => b - a)
        for (const r of sortedRounds) {
          const matchups = roundGroups.get(r)!
          if (matchups.every(m => m.status === 'decided')) {
            const nextRound = roundGroups.get(r + 1)
            if (!nextRound || nextRound.every(m => m.status === 'pending')) {
              const regionLabel = region === 'grand_finals' ? 'Grand Finals' : region === 'losers' ? 'Losers' : 'Winners'
              return { round: r, region, label: `Undo ${regionLabel} Round` }
            }
          }
        }
      }
      return null
    }

    if (isPredictive) {
      // Predictive: same as SE but label says "Undo Resolution"
      for (let r = totalRounds; r >= 1; r--) {
        const roundMatchups = currentMatchups.filter(m => m.round === r && !m.isBye)
        if (roundMatchups.length === 0) continue
        if (roundMatchups.every(m => m.status === 'decided')) {
          const nextRound = currentMatchups.filter(m => m.round === r + 1)
          if (nextRound.length === 0 || nextRound.every(m => m.status === 'pending' || m.isBye)) {
            return { round: r, label: 'Undo Resolution' }
          }
        }
      }
      return null
    }

    // SE (default): highest decided round where next round is all pending
    for (let r = totalRounds; r >= 1; r--) {
      const roundMatchups = currentMatchups.filter(m => m.round === r)
      if (roundMatchups.length === 0) continue
      if (roundMatchups.every(m => m.status === 'decided')) {
        const nextRound = currentMatchups.filter(m => m.round === r + 1)
        if (nextRound.length === 0 || nextRound.every(m => m.status === 'pending')) {
          return { round: r, label: `Undo Round ${r}` }
        }
      }
    }
    return null
  }, [currentMatchups, bracket.status, isRoundRobin, isDoubleElim, isPredictive, totalRounds])

  // Undo round handler
  const handleUndoRound = useCallback(() => {
    if (!undoableRound) return
    setError(null)
    setUndoFeedback(null)
    startTransition(async () => {
      const result = await undoRoundAdvancement({
        bracketId: bracket.id,
        round: undoableRound.round,
        region: undoableRound.region,
      })
      if (result && 'error' in result) {
        setError(result.error as string)
      } else {
        setUndoFeedback(`${undoableRound.label} complete`)
        setShowUndoConfirm(false)
        // Auto-clear feedback after 3 seconds
        setTimeout(() => setUndoFeedback(null), 3000)
      }
    })
  }, [undoableRound, bracket.id])

  // Reopen completed bracket handler
  const handleReopenBracket = useCallback(async () => {
    startTransition(async () => {
      const result = await reopenBracket({ bracketId: bracket.id })
      if ('error' in result) {
        console.error('Reopen failed:', result.error)
      }
      // On success, the bracket refetches via realtime broadcast
      // and bracket.status will change to 'paused'
    })
  }, [bracket.id])

  // Detect if all matchups are decided (bracket logically complete but status may still be 'active')
  const isBracketAllDecided = useMemo(() => {
    if (currentMatchups.length === 0) return false
    if (isRoundRobin) {
      return currentMatchups.every((m) => m.status === 'decided')
    }
    if (isDoubleElim) {
      const gf = currentMatchups.filter((m) => m.bracketRegion === 'grand_finals')
      if (gf.length === 0) return false
      return gf.every((m) => m.status === 'decided')
    }
    // SE / Predictive / Sports: final round matchup(s) must be decided
    const finalRoundMatchups = currentMatchups.filter((m) => m.round === totalRounds)
    return finalRoundMatchups.length > 0 && finalRoundMatchups.every((m) => m.status === 'decided')
  }, [currentMatchups, totalRounds, isRoundRobin, isDoubleElim])

  // Close bracket handler -- transitions active bracket to completed
  const handleCloseBracket = useCallback(() => {
    setError(null)
    startTransition(async () => {
      const result = await updateBracketStatus({ bracketId: bracket.id, status: 'completed' })
      if (result && 'error' in result) {
        setError(result.error as string)
      }
    })
  }, [bracket.id])

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
          onDismiss={() => {
            setShowCelebration(false)
            setRevealState(null)
            if (isRoundRobin) setShowFinalStandings(true)
          }}
          isTie={championTieInfo.isTie}
          tiedNames={championTieInfo.tiedNames}
        />
      )}

      {/* Post-celebration final standings overlay */}
      {showFinalStandings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg space-y-4 rounded-xl border bg-card p-6 shadow-xl">
            <h2 className="text-center text-2xl font-bold">Final Standings</h2>
            <RoundRobinStandings standings={rrClientStandings} isLive={true} />
            <button
              type="button"
              onClick={() => setShowFinalStandings(false)}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Undo round confirmation dialog */}
      {showUndoConfirm && undoableRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold">Confirm Undo</h3>
            <p className="text-sm text-muted-foreground">
              This will reverse the most recent round advancement and clear all downstream matchups, votes, and results. The bracket will be paused.
            </p>
            <p className="text-sm font-medium">
              Action: {undoableRound.label}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUndoConfirm(false)}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUndoRound}
                disabled={isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Undoing...' : 'Undo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar with actions */}
      <div className="space-y-2 rounded-lg border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold">{bracket.name}</h1>
        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          LIVE
        </span>

        {/* Pause/Resume toggle -- only shown for active or paused brackets */}
        {(bracket.status === 'active' || bracket.status === 'paused') && (
          <div className="flex items-center gap-2">
            <Switch checked={!isPaused} onCheckedChange={handlePauseToggle} disabled={isPending} />
            <span className="text-xs font-medium">{isPaused ? 'Paused' : 'Active'}</span>
          </div>
        )}

        {/* Close Bracket button -- shown when bracket is logically complete but still active */}
        {bracket.status === 'active' && isBracketAllDecided && (
          <button
            type="button"
            onClick={handleCloseBracket}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isPending ? 'Closing...' : 'Close Bracket'}
          </button>
        )}

        {/* Reopen button -- only shown for completed brackets */}
        {bracket.status === 'completed' && (
          <button
            type="button"
            onClick={handleReopenBracket}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            {isPending ? 'Reopening...' : 'Reopen'}
          </button>
        )}

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

        {/* Round tabs (SE / Predictive non-auto only -- NOT DE, NOT auto, NOT sports) */}
        {!isRoundRobin && !isDoubleElim && !isPredictiveAuto && !isSports && (
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

        {/* Round-robin: round progress indicator */}
        {isRoundRobin && (
          <span className="rounded px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground">
            Rounds: {rrRoundProgress.completed}/{rrRoundProgress.total} complete
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

        {/* Sports bracket: hint to click matchups to override */}
        {isSports && !bracketDone && (
          <span className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            Click any matchup to override result
          </span>
        )}

        {/* SE / Predictive (vote_based) primary action buttons (NOT DE, NOT RR, NOT manual, NOT auto, NOT sports) */}
        {!isRoundRobin && !isDoubleElim && !isPredictiveManual && !isPredictiveAuto && !isSports && hasPending && (
          <button
            onClick={handleOpenVoting}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Opening...' : `Open Voting (${rs!.pending})`}
          </button>
        )}

        {!isRoundRobin && !isDoubleElim && !isPredictiveManual && !isPredictiveAuto && !isSports && hasVoting && (
          <button
            onClick={handleCloseAndAdvance}
            disabled={isPending}
            className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {isPending ? 'Closing...' : `Close & Advance (${rs!.voting})`}
          </button>
        )}

        {!isRoundRobin && !isDoubleElim && !isPredictiveManual && !isPredictiveAuto && !isSports && allRoundDecided && !bracketDone && (
          <button
            onClick={handleAdvanceRound}
            disabled={isPending}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? 'Advancing...' : 'Next Round \u2192'}
          </button>
        )}

        {/* Round-robin: Open rounds fallback button (pacing-aware) */}
        {isRoundRobin && needsRoundsOpen && (
          <button
            onClick={() => {
              setError(null)
              const pacing = (bracket.roundRobinPacing ?? 'round_by_round') as string
              if (pacing === 'all_at_once') {
                // Open ALL rounds: loop advanceRound for each round sequentially (1..maxRound).
                // Each advanceRound call opens that round's pending matchups to voting status.
                const maxRound = Math.max(...currentMatchups.map((m) => m.roundRobinRound ?? 1))
                startTransition(async () => {
                  for (let r = 1; r <= maxRound; r++) {
                    const result = await advanceRound({ bracketId: bracket.id, roundNumber: r })
                    if (result && 'error' in result) { setError(result.error as string); return }
                  }
                })
              } else {
                startTransition(async () => {
                  const result = await advanceRound({ bracketId: bracket.id, roundNumber: 1 })
                  if (result && 'error' in result) setError(result.error as string)
                })
              }
            }}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Opening...' : ((bracket.roundRobinPacing ?? 'round_by_round') === 'all_at_once' ? 'Open All Rounds' : 'Open Round 1')}
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

        {/* Sports bracket: prediction controls */}
        {isSports && bracket.predictionStatus === 'draft' && (
          <button
            onClick={handleOpenPredictions}
            disabled={isPending}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {isPending ? 'Opening...' : 'Open Predictions'}
          </button>
        )}
        {isSports && bracket.predictionStatus === 'predictions_open' && (
          <button
            onClick={handleClosePredictions}
            disabled={isPending}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {isPending ? 'Closing...' : 'Close Predictions'}
          </button>
        )}

        {/* Undo round button -- appears near advance controls when undo is available */}
        {undoableRound && !undoFeedback && (
          <button
            onClick={() => setShowUndoConfirm(true)}
            disabled={isPending}
            title="Reverses the most recent round and clears downstream matchups"
            className="flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            <Undo2 className="h-3.5 w-3.5" />
            {undoableRound.label}
          </button>
        )}
        {undoFeedback && (
          <span className="rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {undoFeedback}
          </span>
        )}

        {bracketDone && !isPredictiveAuto && (
          <span className="flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Complete!
          </span>
        )}

        {sessionCode && <QRCodeDisplay code={sessionCode} />}
        </div>

        <DisplaySettingsSection disabled={bracket.status === 'completed'}>
          <LockedSettingIndicator label="Type" value={getBracketTypeLabel(bracket.bracketType)} />
          <LockedSettingIndicator label="Size" value={`${bracket.entrants.length} entrants`} />

          <ViewingModeToggle
            value={viewingMode as 'simple' | 'advanced'}
            onValueChange={handleViewingModeChange}
            disabled={isUpdatingSettings}
            icon={<Eye className="h-4 w-4" />}
          />

          {(bracket.bracketType === 'single_elimination' || bracket.bracketType === 'double_elimination' || bracket.bracketType === 'predictive') && (
            <QuickSettingsToggle
              label="Show Seeds"
              checked={showSeedNumbers}
              onCheckedChange={handleShowSeedsChange}
              disabled={isUpdatingSettings}
              icon={<Hash className="h-4 w-4" />}
            />
          )}

          {(bracket.bracketType === 'single_elimination' || bracket.bracketType === 'double_elimination') && (
            <QuickSettingsToggle
              label="Show Vote Counts"
              checked={showVoteCounts}
              onCheckedChange={handleShowVoteCountsChange}
              disabled={isUpdatingSettings}
              icon={<BarChart3 className="h-4 w-4" />}
            />
          )}
        </DisplaySettingsSection>

        <BracketMetadataBar
          bracketType={bracket.bracketType}
          status={bracket.status}
          viewingMode={bracket.viewingMode}
          roundRobinPacing={bracket.roundRobinPacing}
          predictiveMode={bracket.predictiveMode}
          predictiveResolutionMode={bracket.predictiveResolutionMode}
          sportGender={bracket.sportGender}
          entrantCount={bracket.entrants.length}
          sessionName={sessionName}
          createdAt={bracket.createdAt}
        />
      </div>

      {/* Amber banner when activity is paused */}
      {isPaused && (
        <div className="rounded-lg bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          Activity Paused -- Students cannot vote
        </div>
      )}

      {/* Sports bracket sync status bar */}
      {isSports && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2">
          {/* Auto-updating indicator */}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-xs font-medium text-green-700 dark:text-green-400">Auto-updating</span>
          </div>

          {/* Live games indicator */}
          {hasLiveGames && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600" />
              </span>
              LIVE GAMES
            </span>
          )}

          <div className="flex-1" />

          {/* Last synced time */}
          <span className="text-xs text-muted-foreground">
            Last synced: {lastSyncDisplay}
          </span>

          {/* Auto-sync indicator */}
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Auto-sync 60s
          </span>

          {/* Manual sync button */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing || isPending}
            className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Vote progress indicator */}
      {votingProgressData.isVotingActive && (
        <VoteProgressBar
          votedCount={votingProgressData.votedCount}
          totalCount={votingProgressData.totalCount}
          isActive={votingProgressData.isVotingActive}
          label={votingProgressData.roundLabel}
        />
      )}

      {/* Pick winner modal — shown for voting matchups, pending matchups in manual mode, or any sports matchup with both entrants */}
      {selectedMatchup && (selectedMatchup.status === 'voting' || (isPredictiveManual && selectedMatchup.status === 'pending') || (isSports && selectedMatchup.entrant1Id && selectedMatchup.entrant2Id)) && selectedMatchup.entrant1Id && selectedMatchup.entrant2Id && (() => {
        const votes = voteLabels[selectedMatchup.id]
        const e1Votes = votes?.e1 ?? 0
        const e2Votes = votes?.e2 ?? 0
        const isTied = e1Votes === e2Votes
        const sportsGameInfo = isSports ? {
          homeScore: selectedMatchup.homeScore ?? 0,
          awayScore: selectedMatchup.awayScore ?? 0,
          gameStatus: selectedMatchup.gameStatus,
        } : null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedMatchupId(null)}>
            <div className="mx-4 w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-1 text-center text-base font-bold">
                {isSports ? 'Override Result' : 'Pick Winner'}
              </h2>
              <p className="mb-5 text-center text-xs text-muted-foreground">
                {isSports
                  ? 'Manually set the winner (overrides auto-sync)'
                  : isPredictiveManual
                    ? 'Select the winner for this matchup'
                    : isTied ? 'Tied -- teacher breaks the tie' : 'Override or confirm the vote leader'}
              </p>

              {/* Sports game score display */}
              {sportsGameInfo && (sportsGameInfo.homeScore > 0 || sportsGameInfo.awayScore > 0) && (
                <div className="mb-4 text-center">
                  <span className="text-lg font-bold">
                    {sportsGameInfo.homeScore} - {sportsGameInfo.awayScore}
                  </span>
                  {sportsGameInfo.gameStatus && (
                    <span className={`ml-2 text-xs font-medium ${
                      sportsGameInfo.gameStatus === 'in_progress'
                        ? 'text-green-600'
                        : sportsGameInfo.gameStatus === 'final'
                          ? 'text-muted-foreground'
                          : 'text-amber-600'
                    }`}>
                      {sportsGameInfo.gameStatus === 'in_progress' ? 'LIVE' : sportsGameInfo.gameStatus.toUpperCase()}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                {selectedMatchup.entrant1Id && (
                  <button
                    onClick={() => handlePickWinner(selectedMatchup.id, selectedMatchup.entrant1Id!)}
                    disabled={isPending}
                    className="flex flex-1 flex-col items-center gap-1.5 rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-4 transition-colors hover:border-blue-400 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:border-blue-600 dark:hover:bg-blue-950/50"
                  >
                    <span className="text-sm font-semibold">{selectedMatchup.entrant1?.name ?? 'TBD'}</span>
                    {isSports ? (
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{sportsGameInfo?.homeScore ?? 0}</span>
                    ) : !isPredictiveManual ? (
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{e1Votes} vote{e1Votes !== 1 ? 's' : ''}</span>
                    ) : null}
                  </button>
                )}
                {selectedMatchup.entrant2Id && (
                  <button
                    onClick={() => handlePickWinner(selectedMatchup.id, selectedMatchup.entrant2Id!)}
                    disabled={isPending}
                    className="flex flex-1 flex-col items-center gap-1.5 rounded-lg border-2 border-orange-200 bg-orange-50 px-4 py-4 transition-colors hover:border-orange-400 hover:bg-orange-100 disabled:opacity-50 dark:border-orange-800 dark:bg-orange-950/30 dark:hover:border-orange-600 dark:hover:bg-orange-950/50"
                  >
                    <span className="text-sm font-semibold">{selectedMatchup.entrant2?.name ?? 'TBD'}</span>
                    {isSports ? (
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{sportsGameInfo?.awayScore ?? 0}</span>
                    ) : !isPredictiveManual ? (
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{e2Votes} vote{e2Votes !== 1 ? 's' : ''}</span>
                    ) : null}
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
                showSeedNumbers={bracket.showSeedNumbers}
                isSports={isSports}
              />
            ) : (
              <BracketDiagram
                matchups={currentMatchups}
                totalRounds={totalRounds}
                voteLabels={voteLabels}
                onMatchupClick={handleMatchupClick}
                selectedMatchupId={selectedMatchupId}
                showSeedNumbers={bracket.showSeedNumbers}
                isSports={isSports}
              />
            )
          )}

          {/* Prediction leaderboard for non-auto predictive brackets and sports brackets */}
          {((isPredictive && !isPredictiveAuto) || isSports) && (
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
          participants={realtimeParticipants}
          connectedIds={connectedIds}
          voterIds={currentVoterIds}
          selectedMatchupId={selectedMatchupId}
          hasActiveVotingContext={hasActiveVotingContext}
          voteLabel={(isPredictive || isSports) && bracket.predictionStatus !== 'active' ? 'predicted' : 'voted'}
          newParticipantIds={newParticipantIds}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isOpen={sidebarOpen}
          teacherNameViewDefault={teacherNameViewDefault}
        />
      </div>
    </div>
  )
}
