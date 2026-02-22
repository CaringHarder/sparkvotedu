'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Radio, Link2, Unlink, ChevronDown, ChevronUp, Play, RefreshCw } from 'lucide-react'
import type { BracketWithDetails, RoundRobinStanding, PredictionScore } from '@/lib/bracket/types'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'
import { RegionBracketView } from '@/components/bracket/region-bracket-view'
import { RoundRobinStandings } from '@/components/bracket/round-robin-standings'
import { RoundRobinMatchups } from '@/components/bracket/round-robin-matchups'
import { PredictiveBracket } from '@/components/bracket/predictive-bracket'
import { PredictionLeaderboard } from '@/components/bracket/prediction-leaderboard'
import { DoubleElimDiagram } from '@/components/bracket/double-elim-diagram'
import { BracketStatusBadge, BracketLifecycleControls } from '@/components/bracket/bracket-status'
import { assignBracketToSession } from '@/actions/bracket'
import { recordResult, advanceRound } from '@/actions/round-robin'
import { triggerSportsSync } from '@/actions/sports'

interface SessionInfo {
  id: string
  code: string
  name: string | null
  createdAt: string
}

interface BracketDetailProps {
  bracket: BracketWithDetails
  totalRounds: number
  sessions: SessionInfo[]
  standings?: RoundRobinStanding[]
  predictionScores?: PredictionScore[]
}

export function BracketDetail({ bracket, totalRounds, sessions, standings = [], predictionScores = [] }: BracketDetailProps) {
  const [isPending, startTransition] = useTransition()
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(bracket.sessionId)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [showEntrants, setShowEntrants] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const isRoundRobin = bracket.bracketType === 'round_robin'
  const isPredictive = bracket.bracketType === 'predictive'
  const isDoubleElim = bracket.bracketType === 'double_elimination'
  const isSports = bracket.bracketType === 'sports'
  const isPredictiveAuto = isPredictive && bracket.predictiveResolutionMode === 'auto'
  const pacing = (bracket.roundRobinPacing ?? 'round_by_round') as 'round_by_round' | 'all_at_once'
  const isLive = bracket.roundRobinStandingsMode === 'live'

  // Determine current round: the first round with non-decided matchups
  const currentRound = isRoundRobin
    ? (bracket.matchups.find((m) => m.status !== 'decided')?.roundRobinRound ?? 1)
    : 1

  // Check if current round has any voting matchups (to show advance button)
  const currentRoundMatchups = isRoundRobin
    ? bracket.matchups.filter((m) => m.roundRobinRound === currentRound)
    : []
  const currentRoundAllDecided = currentRoundMatchups.length > 0 &&
    currentRoundMatchups.every((m) => m.status === 'decided')
  const nextRoundExists = isRoundRobin &&
    bracket.matchups.some((m) => (m.roundRobinRound ?? 0) > currentRound)
  const canAdvanceRound = isRoundRobin && pacing === 'round_by_round' &&
    currentRoundAllDecided && nextRoundExists

  function handleRecordResult(matchupId: string, winnerId: string | null) {
    startTransition(async () => {
      await recordResult({
        bracketId: bracket.id,
        matchupId,
        winnerId,
      })
    })
  }

  function handleAdvanceRound() {
    const nextRound = currentRound + 1
    startTransition(async () => {
      await advanceRound({
        bracketId: bracket.id,
        roundNumber: nextRound,
      })
    })
  }

  function handleSessionAssign(sessionId: string | null) {
    setSessionError(null)
    setCurrentSessionId(sessionId)
    startTransition(async () => {
      const result = await assignBracketToSession({
        bracketId: bracket.id,
        sessionId,
      })
      if (result && 'error' in result) {
        setSessionError(result.error as string)
        setCurrentSessionId(bracket.sessionId) // revert
      }
    })
  }

  function handleSportsSync() {
    setSyncing(true)
    setSyncError(null)
    startTransition(async () => {
      try {
        const result = await triggerSportsSync()
        if ('error' in result && result.error) {
          setSyncError(result.error as string)
        }
      } catch {
        setSyncError('Sync failed')
      } finally {
        setSyncing(false)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Compact header row */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/brackets"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>

        <h1 className="text-lg font-bold tracking-tight">
          {bracket.name}
        </h1>
        <BracketStatusBadge status={bracket.status} />
        <span className="text-xs text-muted-foreground">
          {bracket.size} entrants &middot; {totalRounds} rounds
        </span>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {bracket.status === 'active' && !isPredictiveAuto && !(isPredictive && bracket.predictionStatus === 'predictions_open') && (
            <Link
              href={`/brackets/${bracket.id}/live`}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              View Live
            </Link>
          )}
          {bracket.status === 'draft' && (
            <Link
              href={`/brackets/${bracket.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          )}
          <BracketLifecycleControls
            bracketId={bracket.id}
            status={bracket.status}
            bracketName={bracket.name}
            bracketType={bracket.bracketType}
          />
        </div>
      </div>

      {bracket.description && (
        <p className="text-sm text-muted-foreground">{bracket.description}</p>
      )}

      {/* Main content: diagram/round-robin + sidebar */}
      <div className="flex gap-4">
        {/* Main content area */}
        <div className="min-w-0 flex-1 space-y-4">
          {isPredictive ? (
            <div className="space-y-4">
              <PredictiveBracket
                bracket={bracket}
                participantId=""
                isTeacher={true}
              />
              {!isPredictiveAuto && (bracket.status === 'active' || bracket.status === 'completed') && predictionScores.length > 0 && (
                <PredictionLeaderboard
                  bracketId={bracket.id}
                  initialScores={predictionScores}
                  totalRounds={totalRounds}
                  isTeacher={true}
                />
              )}
            </div>
          ) : isRoundRobin ? (
            <>
              {/* Standings table */}
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Standings
                </h2>
                <RoundRobinStandings
                  standings={standings}
                  isLive={isLive}
                />
              </div>

              {/* Matchup grid */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Matchups
                  </h2>
                  {canAdvanceRound && (
                    <button
                      type="button"
                      onClick={handleAdvanceRound}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Play className="h-3 w-3" />
                      Open Round {currentRound + 1}
                    </button>
                  )}
                </div>
                <RoundRobinMatchups
                  matchups={bracket.matchups}
                  entrants={bracket.entrants}
                  currentRound={currentRound}
                  pacing={pacing}
                  isTeacher={true}
                  onRecordResult={handleRecordResult}
                />
              </div>
            </>
          ) : isSports ? (
            <div className="space-y-3">
              {/* Sync controls */}
              <div className="flex items-center gap-3">
                {bracket.lastSyncAt && (
                  <span className="text-xs text-muted-foreground">
                    Last synced: {new Date(bracket.lastSyncAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSportsSync}
                  disabled={syncing || isPending}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Manual Sync'}
                </button>
                {syncError && (
                  <span className="text-xs text-red-600">{syncError}</span>
                )}
              </div>

              {/* Sports bracket diagram */}
              <div className="rounded-lg border p-3">
                {(bracket.maxEntrants ?? bracket.size) >= 32 ? (
                  <RegionBracketView
                    matchups={bracket.matchups}
                    totalRounds={totalRounds}
                    bracketSize={bracket.maxEntrants ?? bracket.size}
                    showSeedNumbers={bracket.showSeedNumbers}
                    isSports={true}
                  />
                ) : (
                  <BracketDiagram
                    matchups={bracket.matchups}
                    totalRounds={totalRounds}
                    showSeedNumbers={bracket.showSeedNumbers}
                    isSports={true}
                  />
                )}
              </div>
            </div>
          ) : isDoubleElim ? (
            <DoubleElimDiagram
              bracket={bracket}
              entrants={bracket.entrants}
              matchups={bracket.matchups}
              isTeacher={true}
            />
          ) : (
            <div className="rounded-lg border p-3">
              {(bracket.maxEntrants ?? bracket.size) >= 32 ? (
                <RegionBracketView
                  matchups={bracket.matchups}
                  totalRounds={totalRounds}
                  bracketSize={bracket.maxEntrants ?? bracket.size}
                  showSeedNumbers={bracket.showSeedNumbers}
                />
              ) : (
                <BracketDiagram
                  matchups={bracket.matchups}
                  totalRounds={totalRounds}
                  showSeedNumbers={bracket.showSeedNumbers}
                />
              )}
            </div>
          )}
        </div>

        {/* Compact sidebar for settings */}
        <div className="hidden w-64 shrink-0 space-y-3 lg:block">
          {/* Session assignment */}
          <div className="rounded-lg border p-3">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Session</h2>
            {sessionError && (
              <p className="mb-2 text-xs text-red-600">{sessionError}</p>
            )}
            {sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active sessions</p>
            ) : (
              <div className="space-y-2">
                <select
                  value={currentSessionId ?? ''}
                  onChange={(e) => handleSessionAssign(e.target.value || null)}
                  disabled={isPending}
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                >
                  <option value="">No session</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name ? `${s.name} (${s.code})` : `Unnamed Session (${s.code})`}
                    </option>
                  ))}
                </select>
                {currentSessionId && (
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <Link2 className="h-3 w-3" />
                      Linked
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSessionAssign(null)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Unlink className="h-3 w-3" />
                      Unlink
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Entrants (collapsible) */}
          <div className="rounded-lg border">
            <button
              type="button"
              onClick={() => setShowEntrants(!showEntrants)}
              className="flex w-full items-center justify-between p-3 text-left"
            >
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Entrants ({bracket.entrants.length})
              </h2>
              {showEntrants ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {showEntrants && (
              <div className="border-t px-3 pb-3 pt-2">
                <div className="space-y-0.5">
                  {bracket.entrants.map((entrant) => (
                    <div
                      key={entrant.id}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {bracket.showSeedNumbers && (
                        <span className="w-5 text-right text-muted-foreground">
                          {entrant.seedPosition}
                        </span>
                      )}
                      <span className="truncate">{entrant.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: settings below diagram */}
      <div className="space-y-3 lg:hidden">
        {/* Session assignment */}
        <div className="rounded-lg border p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Session</h2>
          {sessionError && (
            <p className="mb-2 text-xs text-red-600">{sessionError}</p>
          )}
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active sessions</p>
          ) : (
            <div className="flex items-center gap-3">
              <select
                value={currentSessionId ?? ''}
                onChange={(e) => handleSessionAssign(e.target.value || null)}
                disabled={isPending}
                className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs"
              >
                <option value="">No session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ? `${s.name} (${s.code})` : `Unnamed Session (${s.code})`}
                  </option>
                ))}
              </select>
              {currentSessionId && (
                <button
                  type="button"
                  onClick={() => handleSessionAssign(null)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Unlink className="h-3 w-3" />
                  Unlink
                </button>
              )}
              {currentSessionId && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <Link2 className="h-3 w-3" />
                  Linked
                </span>
              )}
            </div>
          )}
        </div>

        {/* Entrants (collapsible) */}
        <div className="rounded-lg border">
          <button
            type="button"
            onClick={() => setShowEntrants(!showEntrants)}
            className="flex w-full items-center justify-between p-3 text-left"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Entrants ({bracket.entrants.length})
            </h2>
            {showEntrants ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          {showEntrants && (
            <div className="border-t px-3 pb-3 pt-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
                {bracket.entrants.map((entrant) => (
                  <div
                    key={entrant.id}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <span className="w-5 text-right text-muted-foreground">
                      {entrant.seedPosition}
                    </span>
                    <span className="truncate">{entrant.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
