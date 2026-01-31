'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Radio, Link2, Unlink, ChevronDown, ChevronUp } from 'lucide-react'
import type { BracketWithDetails } from '@/lib/bracket/types'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'
import { BracketStatusBadge, BracketLifecycleControls } from '@/components/bracket/bracket-status'
import { assignBracketToSession } from '@/actions/bracket'

interface SessionInfo {
  id: string
  code: string
  createdAt: string
}

interface BracketDetailProps {
  bracket: BracketWithDetails
  totalRounds: number
  sessions: SessionInfo[]
}

export function BracketDetail({ bracket, totalRounds, sessions }: BracketDetailProps) {
  const [isPending, startTransition] = useTransition()
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(bracket.sessionId)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [showEntrants, setShowEntrants] = useState(false)

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
          {bracket.status === 'active' && (
            <Link
              href={`/brackets/${bracket.id}/live`}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse" />
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

      {bracket.description && (
        <p className="text-sm text-muted-foreground">{bracket.description}</p>
      )}

      {/* Main content: diagram + sidebar */}
      <div className="flex gap-4">
        {/* Bracket diagram — takes most of the space */}
        <div className="min-w-0 flex-1 rounded-lg border p-3">
          <BracketDiagram
            matchups={bracket.matchups}
            totalRounds={totalRounds}
          />
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
                      Session {s.code}
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
                    Session {s.code}
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
