'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Pencil,
  Copy,
  Trash2,
  Radio,
  Link2,
  Unlink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PollStatusBadge } from '@/components/poll/poll-status'
import { PollForm } from '@/components/poll/poll-form'
import {
  updatePollStatus,
  deletePoll,
  duplicatePoll,
  assignPollToSession,
} from '@/actions/poll'
import { PollMetadataBar } from '@/components/shared/activity-metadata-bar'
import type { PollStatus } from '@/lib/poll/types'

interface PollDetailData {
  id: string
  question: string
  description: string | null
  pollType: string
  status: PollStatus
  allowVoteChange: boolean
  showLiveResults: boolean
  rankingDepth: number | null
  teacherId: string
  sessionId: string | null
  createdAt: string
  updatedAt: string
  options: {
    id: string
    text: string
    imageUrl: string | null
    position: number
    pollId: string
  }[]
}

interface SessionInfo {
  id: string
  code: string
  name: string | null
  createdAt: string
}

interface PollDetailViewProps {
  poll: PollDetailData
  sessions: SessionInfo[]
  sessionName?: string | null
}

// Status transition buttons configuration
const STATUS_ACTIONS: Record<
  PollStatus,
  { label: string; newStatus: PollStatus; className: string }[]
> = {
  draft: [
    {
      label: 'Start',
      newStatus: 'active',
      className:
        'bg-green-600 text-white hover:bg-green-700',
    },
  ],
  active: [
    {
      label: 'End',
      newStatus: 'closed',
      className:
        'bg-amber-600 text-white hover:bg-amber-700',
    },
  ],
  paused: [
    {
      label: 'Resume',
      newStatus: 'active',
      className:
        'bg-green-600 text-white hover:bg-green-700',
    },
    {
      label: 'End',
      newStatus: 'closed',
      className:
        'bg-amber-600 text-white hover:bg-amber-700',
    },
  ],
  closed: [
    {
      label: 'Reopen',
      newStatus: 'draft',
      className:
        'bg-blue-600 text-white hover:bg-blue-700',
    },
    {
      label: 'Archive',
      newStatus: 'archived',
      className:
        'bg-slate-600 text-white hover:bg-slate-700',
    },
  ],
  archived: [],
}

export function PollDetailView({ poll, sessions, sessionName }: PollDetailViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(poll.sessionId)
  const [sessionError, setSessionError] = useState<string | null>(null)

  function handleSessionAssign(sessionId: string | null) {
    setSessionError(null)
    setCurrentSessionId(sessionId)
    startTransition(async () => {
      const result = await assignPollToSession({
        pollId: poll.id,
        sessionId,
      })
      if (result && 'error' in result) {
        setSessionError(result.error as string)
        setCurrentSessionId(poll.sessionId) // revert on error
      }
    })
  }

  function handleStatusChange(newStatus: PollStatus) {
    setError(null)
    startTransition(async () => {
      const result = await updatePollStatus({ pollId: poll.id, status: newStatus })
      if (result && 'error' in result) {
        setError(result.error as string)
      } else {
        router.refresh()
      }
    })
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deletePoll({ pollId: poll.id })
      if (result && 'error' in result) {
        setError(result.error as string)
      } else {
        router.push('/activities')
      }
    })
  }

  function handleDuplicate() {
    setError(null)
    startTransition(async () => {
      const result = await duplicatePoll({ pollId: poll.id })
      if (result && 'poll' in result && result.poll) {
        router.push(`/polls/${result.poll.id}`)
      } else if (result && 'error' in result) {
        setError(result.error as string)
      }
    })
  }

  const isDraft = poll.status === 'draft'
  const statusActions = STATUS_ACTIONS[poll.status] ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/activities"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>

        <h1 className="text-lg font-bold tracking-tight">{poll.question}</h1>
        <PollStatusBadge status={poll.status} />

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {poll.status === 'active' && (
            <Link
              href={`/polls/${poll.id}/live`}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              View Live
            </Link>
          )}

          {/* Status transition buttons */}
          {statusActions.map((action) => (
            <button
              key={action.newStatus}
              onClick={() => handleStatusChange(action.newStatus)}
              disabled={isPending}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${action.className}`}
            >
              {isPending ? 'Updating...' : action.label}
            </button>
          ))}

          {/* Duplicate */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            disabled={isPending}
            className="h-8 gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </Button>

          {/* Delete */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isPending}
            className="h-8 gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <PollMetadataBar
        pollType={poll.pollType}
        sessionName={sessionName}
        optionCount={poll.options.length}
        createdAt={poll.createdAt}
      />

      {/* Session assignment */}
      <div className="rounded-lg border p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Session</h2>
        {sessionError && (
          <p className="mb-2 text-xs text-red-600">{sessionError}</p>
        )}
        {sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active sessions. Create a session first to assign this poll.</p>
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

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Draft: editable form */}
      {isDraft && (
        <PollForm existingPoll={poll} />
      )}

      {/* Non-draft: read-only view */}
      {!isDraft && (
        <Card>
          <CardContent className="p-6 space-y-4">
            {poll.description && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Description</span>
                <p className="mt-1 text-sm">{poll.description}</p>
              </div>
            )}

            <div>
              <span className="text-sm font-medium text-muted-foreground">Options</span>
              <ul className="mt-2 space-y-2">
                {poll.options.map((o, i) => (
                  <li
                    key={o.id}
                    className="flex items-center gap-3 rounded-md border px-3 py-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted font-mono text-xs font-medium">
                      {i + 1}
                    </span>
                    <span className="text-sm">{o.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                Vote changes:{' '}
                <strong>{poll.allowVoteChange ? 'Allowed' : 'Not allowed'}</strong>
              </span>
              <span>
                Live results:{' '}
                <strong>{poll.showLiveResults ? 'Visible' : 'Hidden'}</strong>
              </span>
              {poll.pollType === 'ranked' && (
                <span>
                  Ranking depth:{' '}
                  <strong>
                    {poll.rankingDepth ? `Top ${poll.rankingDepth}` : 'All options'}
                  </strong>
                </span>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Created: {new Date(poll.createdAt).toLocaleDateString()} &middot; Updated:{' '}
              {new Date(poll.updatedAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation modal (same pattern as bracket-status.tsx) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-card-foreground">
              Delete Poll
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete &quot;{poll.question}&quot;? This
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
                onClick={() => {
                  setShowDeleteConfirm(false)
                  handleDelete()
                }}
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
