'use client'

import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import type { BracketWithDetails } from '@/lib/bracket/types'
import { BracketDiagram } from '@/components/bracket/bracket-diagram'
import { BracketStatusBadge, BracketLifecycleControls } from '@/components/bracket/bracket-status'

interface BracketDetailProps {
  bracket: BracketWithDetails
  totalRounds: number
}

export function BracketDetail({ bracket, totalRounds }: BracketDetailProps) {
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
