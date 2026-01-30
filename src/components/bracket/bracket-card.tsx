'use client'

import Link from 'next/link'
import { Trophy, Calendar } from 'lucide-react'
import { BracketStatusBadge } from './bracket-status'

interface BracketCardProps {
  bracket: {
    id: string
    name: string
    description: string | null
    size: number
    status: string
    createdAt: string
    _count?: { entrants: number }
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function BracketCard({ bracket }: BracketCardProps) {
  return (
    <Link
      href={`/brackets/${bracket.id}`}
      className="group block rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-card-foreground group-hover:text-primary">
          {bracket.name}
        </h3>
        <BracketStatusBadge status={bracket.status} />
      </div>

      {bracket.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
          {bracket.description}
        </p>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Trophy className="h-3.5 w-3.5" />
          {bracket._count?.entrants ?? bracket.size} entrants
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(bracket.createdAt)}
        </span>
      </div>
    </Link>
  )
}
