'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Radio } from 'lucide-react'
import type { BracketWithDetails } from '@/lib/bracket/types'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'
import { BracketStatusBadge, BracketLifecycleControls } from '@/components/bracket/bracket-status'
import { updateBracketVotingSettings } from '@/actions/bracket-advance'

interface BracketDetailProps {
  bracket: BracketWithDetails
  totalRounds: number
}

export function BracketDetail({ bracket, totalRounds }: BracketDetailProps) {
  const [isPending, startTransition] = useTransition()
  const [viewingMode, setViewingMode] = useState(bracket.viewingMode)
  const [showVoteCounts, setShowVoteCounts] = useState(bracket.showVoteCounts)
  const [timerSeconds, setTimerSeconds] = useState<number | null>(bracket.votingTimerSeconds)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  function handleUpdateSetting(update: {
    viewingMode?: string
    showVoteCounts?: boolean
    votingTimerSeconds?: number | null
  }) {
    setSettingsError(null)
    startTransition(async () => {
      const result = await updateBracketVotingSettings({
        bracketId: bracket.id,
        ...update,
      })
      if (result && 'error' in result) {
        setSettingsError(result.error as string)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/brackets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All Brackets
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {bracket.name}
            </h1>
            <BracketStatusBadge status={bracket.status} />
          </div>
          {bracket.description && (
            <p className="text-sm text-muted-foreground">
              {bracket.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {bracket.size} entrants &middot; {totalRounds} rounds
          </p>
        </div>

        {/* Action bar */}
        <div className="flex items-start gap-2">
          {/* Go Live button for active brackets */}
          {bracket.status === 'active' && (
            <Link
              href={`/brackets/${bracket.id}/live`}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700"
            >
              <Radio className="h-4 w-4 animate-pulse" />
              Go Live
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
          />
        </div>
      </div>

      {/* Voting settings (for active brackets) */}
      {bracket.status === 'active' && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-semibold">Voting Settings</h2>
          {settingsError && (
            <p className="mb-3 text-xs text-red-600">{settingsError}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Viewing mode toggle */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Viewing Mode
              </label>
              <div className="flex rounded-md border">
                <button
                  type="button"
                  onClick={() => {
                    setViewingMode('simple')
                    handleUpdateSetting({ viewingMode: 'simple' })
                  }}
                  disabled={isPending}
                  className={`flex-1 rounded-l-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewingMode === 'simple'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  Simple
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewingMode('advanced')
                    handleUpdateSetting({ viewingMode: 'advanced' })
                  }}
                  disabled={isPending}
                  className={`flex-1 rounded-r-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewingMode === 'advanced'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  Advanced
                </button>
              </div>
            </div>

            {/* Show vote counts toggle */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Show Vote Counts
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = !showVoteCounts
                  setShowVoteCounts(next)
                  handleUpdateSetting({ showVoteCounts: next })
                }}
                disabled={isPending}
                className={`w-full rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  showVoteCounts
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {showVoteCounts ? 'On' : 'Off'}
              </button>
            </div>

            {/* Timer setting */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Voting Timer (seconds)
              </label>
              <div className="flex gap-1">
                {[null, 30, 60, 120].map((val) => (
                  <button
                    key={val ?? 'none'}
                    type="button"
                    onClick={() => {
                      setTimerSeconds(val)
                      handleUpdateSetting({ votingTimerSeconds: val })
                    }}
                    disabled={isPending}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                      timerSeconds === val
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {val === null ? 'Off' : `${val}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entrant list */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">
          Entrants ({bracket.entrants.length})
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
          {bracket.entrants.map((entrant) => (
            <div
              key={entrant.id}
              className="flex items-center gap-2 text-sm"
            >
              <span className="w-6 text-right text-xs text-muted-foreground">
                #{entrant.seedPosition}
              </span>
              <span className="truncate">{entrant.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Bracket Diagram -- visual centerpiece */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">Tournament Bracket</h2>
        <BracketDiagram
          matchups={bracket.matchups}
          totalRounds={totalRounds}
          className="mt-2"
        />
      </div>
    </div>
  )
}
