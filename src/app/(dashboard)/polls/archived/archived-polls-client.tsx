'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog'
import { unarchivePoll, deletePollPermanently } from '@/actions/poll'

interface ArchivedPollData {
  id: string
  question: string
  pollType: string
  status: string
  updatedAt: string
  _count?: { votes: number }
}

interface ArchivedPollsClientProps {
  polls: ArchivedPollData[]
}

export function ArchivedPollsClient({ polls }: ArchivedPollsClientProps) {
  if (polls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Archive className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold text-muted-foreground">
          No archived polls
        </h2>
        <p className="text-sm text-muted-foreground">
          Polls you archive will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {polls.map((poll) => (
        <ArchivedPollCard key={poll.id} poll={poll} />
      ))}
    </div>
  )
}

function ArchivedPollCard({ poll }: { poll: ArchivedPollData }) {
  const router = useRouter()
  const [isRecovering, startRecoverTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recoverError, setRecoverError] = useState<string | null>(null)

  const updatedDate = new Date(poll.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const pollTypeLabel =
    poll.pollType === 'simple' ? 'Simple' : poll.pollType === 'ranked' ? 'Ranked' : poll.pollType

  function handleRecover() {
    setRecoverError(null)
    startRecoverTransition(async () => {
      const result = await unarchivePoll({ pollId: poll.id })
      if ('success' in result && result.success) {
        router.push('/polls')
      } else {
        setRecoverError(
          ('error' in result ? result.error : null) ?? 'Failed to recover poll'
        )
      }
    })
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deletePollPermanently({ pollId: poll.id })
      if ('success' in result && result.success) {
        setDeleteDialogOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base leading-snug">
            {poll.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {pollTypeLabel}
            </Badge>
            {poll._count && (
              <Badge variant="secondary" className="text-xs">
                {poll._count.votes} vote{poll._count.votes !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Updated {updatedDate}
          </p>

          {recoverError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {recoverError}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecover}
              disabled={isRecovering || isDeleting}
              className="flex-1"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {isRecovering ? 'Recovering...' : 'Recover'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isRecovering || isDeleting}
              className="flex-1"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={poll.question}
        itemType="poll"
        isLive={false}
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </>
  )
}
