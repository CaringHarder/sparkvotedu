'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, ListOrdered } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PollStatusBadge } from '@/components/poll/poll-status'
import { CardContextMenu } from '@/components/shared/card-context-menu'
import { renamePoll } from '@/actions/poll'
import type { PollStatus } from '@/lib/poll/types'

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
  onRemoved?: (type: 'delete' | 'archive') => void
}

const pollTypeConfig: Record<string, { label: string; className: string }> = {
  simple: { label: 'Simple', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  ranked: { label: 'Ranked', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
}

export function PollCard({ poll, onRemoved }: PollCardProps) {
  const router = useRouter()
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(poll.question)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const typeConfig = pollTypeConfig[poll.pollType] ?? pollTypeConfig.simple
  const TypeIcon = poll.pollType === 'ranked' ? ListOrdered : BarChart3
  const voteCount = poll._count?.votes ?? 0

  // Auto-focus rename input
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  function handleRenameSave() {
    setIsRenaming(false)
    const trimmed = renameValue.trim()
    if (trimmed === poll.question || !trimmed) {
      setRenameValue(poll.question)
      return
    }
    startTransition(async () => {
      const result = await renamePoll({ pollId: poll.id, question: trimmed })
      if (result && !('error' in result)) {
        router.refresh()
      } else {
        setRenameValue(poll.question)
      }
    })
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleRenameSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setRenameValue(poll.question)
      setIsRenaming(false)
    }
  }

  return (
    <Card className="relative transition-colors hover:border-primary/30">
      {/* CardContextMenu in top-right corner */}
      <div className="absolute right-2 top-2 z-10">
        <CardContextMenu
          itemId={poll.id}
          itemName={poll.question}
          itemType="poll"
          status={poll.status}
          editHref={`/polls/${poll.id}`}
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

      <Link href={`/polls/${poll.id}`} className="block">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
              <TypeIcon className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div className="min-w-0 flex-1 pr-8">
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
                  className="w-full truncate rounded-md border bg-background px-2 py-0.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <h3 className="truncate text-sm font-semibold">{renameValue}</h3>
              )}
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
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
