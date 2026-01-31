'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, ListOrdered, Pencil, Copy, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PollStatusBadge } from '@/components/poll/poll-status'
import { deletePoll, duplicatePoll } from '@/actions/poll'
import type { PollStatus, PollType } from '@/lib/poll/types'

interface PollCardData {
  id: string
  question: string
  pollType: string
  status: string
  updatedAt: string
  _count?: { votes: number }
}

interface PollCardProps {
  poll: PollCardData
}

const pollTypeConfig: Record<string, { label: string; className: string }> = {
  simple: { label: 'Simple', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  ranked: { label: 'Ranked', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
}

export function PollCard({ poll }: PollCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const typeConfig = pollTypeConfig[poll.pollType] ?? pollTypeConfig.simple
  const TypeIcon = poll.pollType === 'ranked' ? ListOrdered : BarChart3
  const voteCount = poll._count?.votes ?? 0

  function handleEdit() {
    router.push(`/polls/${poll.id}`)
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicatePoll({ pollId: poll.id })
      if (result && 'poll' in result && result.poll) {
        router.push(`/polls/${result.poll.id}`)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePoll({ pollId: poll.id })
      if (result && 'success' in result) {
        router.refresh()
      }
    })
  }

  return (
    <>
      <Card className="transition-colors hover:border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
              <TypeIcon className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold">{poll.question}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <PollStatusBadge status={poll.status as PollStatus} />
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.className}`}>
                  {typeConfig.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleEdit}
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDuplicate}
                disabled={isPending}
                title="Duplicate"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isPending}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation modal (same pattern as bracket-status.tsx) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-card-foreground">Delete Poll</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this poll? This cannot be undone.
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
    </>
  )
}
