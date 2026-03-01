'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Maximize, XCircle, RotateCcw, Eye, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PollResults } from '@/components/poll/poll-results'
import { QRCodeDisplay } from '@/components/teacher/qr-code-display'
import { updatePoll, updatePollStatus, reopenPoll } from '@/actions/poll'
import { PollMetadataBar } from '@/components/shared/activity-metadata-bar'
import { QuickSettingsToggle } from '@/components/shared/quick-settings-toggle'
import { Switch } from '@/components/ui/switch'
import type { PollWithOptions, PollStatus } from '@/lib/poll/types'

interface PollLiveClientProps {
  poll: PollWithOptions
  initialVoteCounts: Record<string, number>
  initialTotalVotes: number
  sessionCode: string | null
  initialParticipantCount: number
  sessionName?: string | null
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
  initialParticipantCount,
  sessionName,
}: PollLiveClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [presenting, setPresenting] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<PollStatus>(poll.status)
  const [forceReveal, setForceReveal] = useState(false)

  // Pause/resume state
  const [isPaused, setIsPaused] = useState(poll.status === 'paused')

  // Quick settings toggle state
  const [showLiveResults, setShowLiveResults] = useState(poll.showLiveResults)
  const [allowVoteChange, setAllowVoteChange] = useState(poll.allowVoteChange)
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)

  async function handleShowLiveResultsChange(checked: boolean) {
    setIsUpdatingSettings(true)
    setShowLiveResults(checked) // optimistic
    try {
      await updatePoll({ pollId: poll.id, showLiveResults: checked })
    } catch {
      setShowLiveResults(!checked) // revert
    } finally {
      setIsUpdatingSettings(false)
    }
  }

  async function handleAllowVoteChangeChange(checked: boolean) {
    setIsUpdatingSettings(true)
    setAllowVoteChange(checked) // optimistic
    try {
      await updatePoll({ pollId: poll.id, allowVoteChange: checked })
    } catch {
      setAllowVoteChange(!checked) // revert
    } finally {
      setIsUpdatingSettings(false)
    }
  }

  // Sync isPaused with poll status changes
  useEffect(() => {
    setIsPaused(currentStatus === 'paused')
  }, [currentStatus])

  // Pause toggle handler -- instant, no confirmation dialog
  function handlePauseToggle(checked: boolean) {
    setError(null)
    const newStatus: PollStatus = checked ? 'active' : 'paused'
    startTransition(async () => {
      const result = await updatePollStatus({ pollId: poll.id, status: newStatus })
      if (result && 'error' in result) {
        setError(result.error as string)
      } else {
        setCurrentStatus(newStatus)
        setIsPaused(!checked)
      }
    })
  }

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
        if (newStatus === 'closed') {
          setForceReveal(true)
        }
        router.refresh()
      }
    })
  }

  const resultsContent = (
    <PollResults
      poll={poll}
      initialVoteCounts={initialVoteCounts}
      initialTotalVotes={initialTotalVotes}
      initialParticipantCount={initialParticipantCount}
      forceReveal={forceReveal}
      onRevealDismissed={() => setForceReveal(false)}
      presenting={presenting}
      pollTitle={poll.question}
      onExitPresentation={() => setPresenting(false)}
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

        {/* Pause/Resume toggle -- only shown for active or paused polls */}
        {(currentStatus === 'active' || currentStatus === 'paused') && (
          <div className="flex items-center gap-2">
            <Switch checked={!isPaused} onCheckedChange={handlePauseToggle} disabled={isPending} />
            <span className="text-xs font-medium">{isPaused ? 'Paused' : 'Active'}</span>
          </div>
        )}

        {/* Quick settings toggles */}
        <QuickSettingsToggle
          label="Show Live Results"
          checked={showLiveResults}
          onCheckedChange={handleShowLiveResultsChange}
          disabled={isUpdatingSettings}
          icon={<Eye className="h-4 w-4" />}
        />
        <QuickSettingsToggle
          label="Allow Vote Change"
          checked={allowVoteChange}
          onCheckedChange={handleAllowVoteChangeChange}
          disabled={isUpdatingSettings}
          icon={<RefreshCw className="h-4 w-4" />}
        />

        <div className="flex-1" />

        {/* QR Code chip */}
        {sessionCode && <QRCodeDisplay code={sessionCode} />}
      </div>

      <PollMetadataBar
        pollType={poll.pollType}
        sessionName={sessionName}
        optionCount={poll.options.length}
        createdAt={typeof poll.createdAt === 'string' ? poll.createdAt : new Date(poll.createdAt).toISOString()}
      />

      {/* Amber banner when activity is paused */}
      {isPaused && (
        <div className="rounded-lg bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          Activity Paused -- Students cannot vote
        </div>
      )}

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
        {(currentStatus === 'active' || currentStatus === 'paused') && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleStatusChange('closed')}
            disabled={isPending}
            className="gap-1.5"
          >
            <XCircle className="h-4 w-4" />
            {isPending ? 'Ending...' : 'End Poll'}
          </Button>
        )}

        {currentStatus === 'closed' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              startTransition(async () => {
                const result = await reopenPoll({ pollId: poll.id })
                if ('success' in result && result.success) {
                  setCurrentStatus('paused')
                  setIsPaused(true)
                }
              })
            }}
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

    </div>
  )
}
