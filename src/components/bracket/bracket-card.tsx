'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useTransition } from 'react'
import { Trophy, Calendar, MoreVertical, Radio, CheckCircle2, Trash2, QrCode, LinkIcon } from 'lucide-react'
import { BracketStatusBadge } from './bracket-status'
import { updateBracketStatus, deleteBracket } from '@/actions/bracket'

interface BracketCardProps {
  bracket: {
    id: string
    name: string
    description: string | null
    size: number
    status: string
    bracketType: string
    createdAt: string
    _count?: { entrants: number }
    sessionCode: string | null
  }
}

const BRACKET_TYPE_LABELS: Record<string, string> = {
  double_elimination: 'Double Elim',
  round_robin: 'Round Robin',
  predictive: 'Predictive',
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
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Close QR on outside click
  useEffect(() => {
    if (!showQR) return
    function handleClick(e: MouseEvent) {
      if (qrRef.current && !qrRef.current.contains(e.target as Node)) {
        setShowQR(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showQR])

  const joinUrl = typeof window !== 'undefined' && bracket.sessionCode
    ? `${window.location.origin}/join/${bracket.sessionCode}`
    : null

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleComplete() {
    setError(null)
    setMenuOpen(false)
    startTransition(async () => {
      const result = await updateBracketStatus({ bracketId: bracket.id, status: 'completed' })
      if (result && 'error' in result) {
        setError(result.error as string)
      }
    })
  }

  function handleDelete() {
    setError(null)
    setShowDeleteConfirm(false)
    startTransition(async () => {
      const result = await deleteBracket({ bracketId: bracket.id })
      if (result && 'error' in result) {
        setError(result.error as string)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="group relative rounded-lg border bg-card transition-shadow hover:shadow-md">
      {/* Card body — clickable link */}
      <Link
        href={`/brackets/${bracket.id}`}
        className="block p-4 pb-3"
      >
        <div className="flex items-start justify-between gap-2 pr-8">
          <h3 className="truncate text-sm font-semibold text-card-foreground group-hover:text-primary">
            {bracket.name}
          </h3>
          <div className="flex items-center gap-1.5">
            {BRACKET_TYPE_LABELS[bracket.bracketType] && (
              <span className="whitespace-nowrap rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                {BRACKET_TYPE_LABELS[bracket.bracketType]}
              </span>
            )}
            <BracketStatusBadge status={bracket.status} />
          </div>
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

      {/* Actions bar */}
      <div className="flex items-center gap-1.5 border-t px-3 py-2">
        {/* Go Live — active brackets with a session */}
        {bracket.status === 'active' && (
          <Link
            href={`/brackets/${bracket.id}/live`}
            className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700"
          >
            <Radio className="h-3 w-3 animate-pulse" />
            Go Live
          </Link>
        )}

        {/* QR Code — active brackets with a session code */}
        {bracket.status === 'active' && bracket.sessionCode && (
          <button
            type="button"
            onClick={() => setShowQR(!showQR)}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <QrCode className="h-3 w-3" />
            QR
          </button>
        )}

        {/* Copy Link — active brackets with a session code */}
        {bracket.status === 'active' && joinUrl && (
          <button
            type="button"
            onClick={() => handleCopy(joinUrl, 'link')}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LinkIcon className="h-3 w-3" />
            {copied === 'link' ? 'Copied!' : 'Copy Link'}
          </button>
        )}

        <div className="flex-1" />

        {/* Overflow menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute bottom-full right-0 z-40 mb-1 w-44 rounded-lg border bg-card py-1 shadow-lg">
              {bracket.status === 'active' && (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-accent disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                  Complete Bracket
                </button>
              )}

              {bracket.status === 'active' && bracket.sessionCode && (
                <button
                  type="button"
                  onClick={() => {
                    handleCopy(bracket.sessionCode!, 'code')
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                >
                  <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  {copied === 'code' ? 'Copied!' : 'Copy Join Code'}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  setShowDeleteConfirm(true)
                }}
                disabled={isPending}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Bracket
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="border-t px-3 py-1.5">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* QR Code dropdown */}
      {showQR && bracket.sessionCode && (
        <div
          ref={qrRef}
          className="absolute left-1/2 top-full z-50 mt-2 flex -translate-x-1/2 flex-col items-center gap-3 rounded-xl border bg-white p-5 shadow-lg dark:bg-card"
        >
          <p className="text-xs font-medium text-muted-foreground">Scan to join</p>
          <QRCodeInline code={bracket.sessionCode} />
          <p className="font-mono text-2xl font-bold tracking-widest text-foreground">{bracket.sessionCode}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleCopy(bracket.sessionCode!, 'qr-code')}
              className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/80"
            >
              {copied === 'qr-code' ? 'Copied!' : 'Copy code'}
            </button>
            {joinUrl && (
              <button
                type="button"
                onClick={() => handleCopy(joinUrl, 'qr-link')}
                className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/80"
              >
                {copied === 'qr-link' ? 'Copied!' : 'Copy link'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-card-foreground">
              Delete Bracket
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete &quot;{bracket.name}&quot;? This
              cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
                className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Inline QR code that lazy-loads qrcode.react */
function QRCodeInline({ code }: { code: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [QRComponent, setQRComponent] = useState<React.ComponentType<any> | null>(null)
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${code}`
    : `/join/${code}`

  useEffect(() => {
    import('qrcode.react').then((mod) => {
      setQRComponent(() => mod.QRCodeSVG)
    })
  }, [])

  if (!QRComponent) {
    return <div className="flex h-[200px] w-[200px] items-center justify-center text-xs text-muted-foreground">Loading...</div>
  }

  return <QRComponent value={joinUrl} size={200} level="M" />
}
