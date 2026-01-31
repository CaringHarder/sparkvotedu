'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Maximize, XCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PollResults } from '@/components/poll/poll-results'
import { PresentationMode } from '@/components/poll/presentation-mode'
import { QRCodeDisplay } from '@/components/teacher/qr-code-display'
import { updatePollStatus } from '@/actions/poll'
import type { PollWithOptions, PollStatus } from '@/lib/poll/types'

interface PollLiveClientProps {
  poll: PollWithOptions
  initialVoteCounts: Record<string, number>
  initialTotalVotes: number
  sessionCode: string | null
  participantCount: number
}

/**
 * Client-side live results dashboard for an active or closed poll.
 *
 * Features:
 * - Real-time poll results (bar chart / donut chart / leaderboard)
 * - Close Poll / Reopen controls
 * - Presentation mode for projectors (F key shortcut)
 * - QR code chip for session join link
 */
export function PollLiveClient({
  poll,
  initialVoteCounts,
  initialTotalVotes,
  sessionCode,
  participantCount,
}: PollLiveClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [presenting, setPresenting] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<PollStatus>(poll.status)

  // Keyboard shortcut: F key toggles presentation mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === 'f' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        setPresenting((p) => !p)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleStatusChange(newStatus: PollStatus) {
    setError(null)
    startTransition(async () => {
      const result = await updatePollStatus({ pollId: poll.id, status: newStatus })
      if (result && 'error' in result) {
        setError(result.error as string)
      } else {
        setCurrentStatus(newStatus)
        router.refresh()
      }
    })
  }

  const resultsContent = (
    <PollResults
      poll={poll}
      initialVoteCounts={initialVoteCounts}
      initialTotalVotes={initialTotalVotes}
      connectedStudents={participantCount}
    />
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/polls/${poll.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        <h1 className="text-lg font-bold tracking-tight">{poll.question}</h1>

        <div className="flex-1" />

        {/* QR Code chip */}
        {sessionCode && <QRCodeDisplay code={sessionCode} />}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {resultsContent}

      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        {currentStatus === 'active' && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleStatusChange('closed')}
            disabled={isPending}
            className="gap-1.5"
          >
            <XCircle className="h-4 w-4" />
            {isPending ? 'Closing...' : 'Close Poll'}
          </Button>
        )}

        {currentStatus === 'closed' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('draft')}
            disabled={isPending}
            className="gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            {isPending ? 'Reopening...' : 'Reopen'}
          </Button>
        )}

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresenting(true)}
          className="gap-1.5"
        >
          <Maximize className="h-4 w-4" />
          Present
          <kbd className="ml-1 hidden rounded border bg-muted px-1 py-0.5 text-[10px] font-mono md:inline">
            F
          </kbd>
        </Button>
      </div>

      {/* Presentation mode overlay */}
      {presenting && (
        <PresentationMode
          title={poll.question}
          onExit={() => setPresenting(false)}
        >
          {resultsContent}
        </PresentationMode>
      )}
    </div>
  )
}
