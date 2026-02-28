'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useTransition } from 'react'
import { Trophy, Calendar, Radio, QrCode, LinkIcon, Eye, BookOpen } from 'lucide-react'
import { BracketStatusBadge } from './bracket-status'
import { CardContextMenu } from '@/components/shared/card-context-menu'
import { renameBracket } from '@/actions/bracket'

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
    sessionId?: string | null
    sessionName?: string | null
    viewingMode?: string
    roundRobinPacing?: string | null
    predictiveMode?: string | null
    predictiveResolutionMode?: string | null
    sportGender?: string | null
  }
  onRemoved?: (type: 'delete' | 'archive') => void
}

const BRACKET_TYPE_LABELS: Record<string, string> = {
  double_elimination: 'Double Elim',
  round_robin: 'Round Robin',
  predictive: 'Predictive',
  sports: 'Sports',
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function BracketCard({ bracket, onRemoved }: BracketCardProps) {
  const router = useRouter()
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(bracket.name)
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const qrRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus rename input
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

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

  function handleRenameSave() {
    setIsRenaming(false)
    const trimmed = renameValue.trim()
    if (trimmed === bracket.name || !trimmed) {
      setRenameValue(bracket.name)
      return
    }
    startTransition(async () => {
      const result = await renameBracket({ bracketId: bracket.id, name: trimmed })
      if (result && !('error' in result)) {
        router.refresh()
      } else {
        setRenameValue(bracket.name)
      }
    })
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleRenameSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setRenameValue(bracket.name)
      setIsRenaming(false)
    }
  }

  return (
    <div className="group relative rounded-lg border bg-card transition-shadow hover:shadow-md">
      {/* CardContextMenu in top-right corner */}
      <div className="absolute right-2 top-2 z-10">
        <CardContextMenu
          itemId={bracket.id}
          itemName={bracket.name}
          itemType="bracket"
          status={bracket.status}
          editHref={`/brackets/${bracket.id}`}
          sessionCode={bracket.sessionCode}
          onStartRename={() => setIsRenaming(true)}
          onDuplicated={() => router.refresh()}
          onArchived={() => {
            onRemoved?.('archive')
            router.refresh()
          }}
          onDeleted={() => {
            onRemoved?.('delete')
            router.refresh()
          }}
        />
      </div>

      {/* Card body -- clickable link */}
      <Link
        href={`/brackets/${bracket.id}`}
        className="block p-4 pb-3"
      >
        <div className="flex items-start justify-between gap-2 pr-8">
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSave}
              onKeyDown={handleRenameKeyDown}
              disabled={isPending}
              onClick={(e) => e.preventDefault()}
              className="truncate rounded-md border bg-background px-2 py-0.5 text-sm font-semibold text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <h3 className="truncate text-sm font-semibold text-card-foreground group-hover:text-primary">
              {renameValue}
            </h3>
          )}
          <div className="flex items-center gap-1.5">
            {BRACKET_TYPE_LABELS[bracket.bracketType] && (
              <span
                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  bracket.bracketType === 'sports'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                }`}
              >
                {BRACKET_TYPE_LABELS[bracket.bracketType]}
              </span>
            )}
            {bracket.bracketType === 'sports' && bracket.sportGender && (
              <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                {bracket.sportGender === 'mens' ? "Men's" : "Women's"}
              </span>
            )}
            <BracketStatusBadge status={bracket.status} />
            {/* Viewing mode badge (single elimination only) */}
            {bracket.bracketType === 'single_elimination' && bracket.viewingMode && (
              <span
                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  bracket.viewingMode === 'simple'
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Eye className="mr-0.5 inline h-2.5 w-2.5" />
                {bracket.viewingMode === 'simple' ? 'Simple' : 'Advanced'}
              </span>
            )}
            {/* Pacing badge (round robin only) */}
            {bracket.bracketType === 'round_robin' && (
              <span className="whitespace-nowrap rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                {bracket.roundRobinPacing === 'all_at_once' ? 'All At Once' : 'Round by Round'}
              </span>
            )}
            {/* Prediction mode badge (predictive only) */}
            {bracket.bracketType === 'predictive' && bracket.predictiveMode && (
              <span
                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  bracket.predictiveMode === 'simple'
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Eye className="mr-0.5 inline h-2.5 w-2.5" />
                {bracket.predictiveMode === 'simple' ? 'Simple' : 'Advanced'}
              </span>
            )}
            {/* Resolution mode badge (predictive only) */}
            {bracket.bracketType === 'predictive' && (
              <span className="whitespace-nowrap rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                {bracket.predictiveResolutionMode === 'auto' ? 'Prediction is Vote' : 'Vote Only'}
              </span>
            )}
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
          {bracket.sessionName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <BookOpen className="h-2.5 w-2.5" />
              {bracket.sessionName.length > 15
                ? bracket.sessionName.slice(0, 15) + '...'
                : bracket.sessionName}
            </span>
          )}
        </div>
      </Link>

      {/* Actions bar */}
      <div className="flex items-center gap-1.5 border-t px-3 py-2">
        {/* View Live -- active brackets */}
        {bracket.status === 'active' && (
          <Link
            href={`/brackets/${bracket.id}/live`}
            className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700"
          >
            <Radio className="h-3 w-3 animate-pulse" />
            View Live
          </Link>
        )}

        {/* QR Code -- active brackets with a session code */}
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

        {/* Copy Link -- active brackets with a session code */}
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
      </div>

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
