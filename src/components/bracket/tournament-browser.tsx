'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Trophy, ArrowUpRight, AlertTriangle } from 'lucide-react'
import { getAvailableTournaments, importTournament } from '@/actions/sports'
import type { SportsTournament } from '@/lib/sports/types'

interface TournamentBrowserProps {
  sessions: Array<{ id: string; code: string; name: string | null }>
}

export function TournamentBrowser({ sessions }: TournamentBrowserProps) {
  const router = useRouter()
  const [tournaments, setTournaments] = useState<SportsTournament[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id ?? '')
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    bracketId?: string
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Fetch available tournaments on mount
  useEffect(() => {
    let cancelled = false

    async function fetchTournaments() {
      setLoading(true)
      setError(null)
      setUpgradeTarget(null)

      const result = await getAvailableTournaments()

      if (cancelled) return

      if ('error' in result && result.error) {
        setError(result.error as string)
        if ('upgradeTarget' in result && result.upgradeTarget) {
          setUpgradeTarget(result.upgradeTarget as string)
        }
      } else if ('tournaments' in result && result.tournaments) {
        setTournaments(result.tournaments)
      }

      setLoading(false)
    }

    fetchTournaments()
    return () => { cancelled = true }
  }, [])

  function handleImport(tournament: SportsTournament) {
    if (!selectedSessionId) return

    setImporting(tournament.externalId)
    setImportResult(null)
    setError(null)

    startTransition(async () => {
      try {
        const result = await importTournament({
          tournamentId: tournament.externalId,
          season: tournament.season,
          sessionId: selectedSessionId,
        })

        if ('error' in result && result.error) {
          setImportResult({
            success: false,
            message: result.error as string,
          })
        } else if ('bracket' in result && result.bracket) {
          setImportResult({
            success: true,
            message: `Successfully imported "${result.bracket.name}"`,
            bracketId: result.bracket.id,
          })
          router.refresh()
        }
      } catch {
        setImportResult({
          success: false,
          message: 'An unexpected error occurred while importing.',
        })
      } finally {
        setImporting(null)
      }
    })
  }

  // No sessions state
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <Trophy className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-card-foreground">
          Create a class session first to import tournaments.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          You need an active session to link a sports bracket to.
        </p>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Loading available tournaments...
        </p>
      </div>
    )
  }

  // Error state with upgrade prompt
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <AlertTriangle className="mb-3 h-8 w-8 text-amber-500" />
        <p className="text-sm font-medium text-card-foreground">{error}</p>
        {upgradeTarget && (
          <Link
            href="/billing"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Upgrade to {upgradeTarget}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    )
  }

  // Empty state
  if (tournaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <Trophy className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-card-foreground">
          No active NCAA March Madness tournaments at this time.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Men&apos;s and Women&apos;s tournaments are available during March-April each year.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Session selector */}
      <div className="flex items-center gap-3">
        <label htmlFor="session-select" className="text-sm font-medium text-card-foreground">
          Import into session:
        </label>
        <select
          id="session-select"
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name ? `${s.name} (${s.code})` : `Unnamed Session (${s.code})`}
            </option>
          ))}
        </select>
      </div>

      {/* Import result message */}
      {importResult && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            importResult.success
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{importResult.message}</span>
            {importResult.success && importResult.bracketId && (
              <Link
                href={`/brackets/${importResult.bracketId}`}
                className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
              >
                View Bracket
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Tournament cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {tournaments.map((tournament) => (
          <TournamentCard
            key={tournament.externalId}
            tournament={tournament}
            onImport={handleImport}
            isImporting={importing === tournament.externalId && isPending}
            disabled={!selectedSessionId || !tournament.teamsPopulated || (importing !== null && importing !== tournament.externalId)}
          />
        ))}
      </div>
    </div>
  )
}

// --- Helpers ---

function isIncompleteNCAA(t: SportsTournament): boolean {
  return t.name.includes('NCAA') && t.teamCount < 60
}

// --- Tournament card sub-component ---

function TournamentCard({
  tournament,
  onImport,
  isImporting,
  disabled,
}: {
  tournament: SportsTournament
  onImport: (t: SportsTournament) => void
  isImporting: boolean
  disabled: boolean
}) {
  const genderLabel = tournament.gender === 'mens' ? "Men's" : "Women's"
  const genderColor =
    tournament.gender === 'mens'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
      : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'

  const statusColor =
    tournament.status === 'active'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
      : tournament.status === 'upcoming'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'

  const statusLabel =
    tournament.status === 'active'
      ? 'Active'
      : tournament.status === 'upcoming'
        ? 'Upcoming'
        : 'Completed'

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-card-foreground">
            {tournament.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${genderColor}`}
            >
              {genderLabel}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
        <Trophy className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{tournament.season} Season</span>
        <span>
          {isIncompleteNCAA(tournament)
            ? `Bracket loading... (${tournament.teamCount} of 68 teams)`
            : tournament.teamsPopulated
              ? `${tournament.teamCount} teams`
              : 'Teams TBD'}
        </span>
        {tournament.gameCount > 0 && <span>{tournament.gameCount} games</span>}
        <span>
          {formatDate(tournament.startDate)} &ndash; {formatDate(tournament.endDate)}
        </span>
      </div>

      {isIncompleteNCAA(tournament) && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Bracket data is still loading from the NCAA. Full bracket will be available once all teams
          and games are published.
        </p>
      )}

      {!isIncompleteNCAA(tournament) && !tournament.teamsPopulated && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Bracket teams haven&apos;t been announced yet. Check back after the Selection Show.
        </p>
      )}

      <div className="mt-3">
        <button
          type="button"
          onClick={() => onImport(tournament)}
          disabled={isImporting || disabled}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isImporting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Trophy className="h-3.5 w-3.5" />
              Import as Bracket
            </>
          )}
        </button>
      </div>
    </div>
  )
}
