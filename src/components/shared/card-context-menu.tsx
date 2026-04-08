'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreVertical,
  Pencil,
  SquarePen,
  Link,
  Copy,
  Archive,
  Trash2,
  RotateCcw,
  FolderInput,
  CopyPlus,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog'
import { SessionPickerDialog } from '@/components/teacher/session-picker-dialog'
import { renameBracket, duplicateBracket, archiveBracket, deleteBracket, assignBracketToSession } from '@/actions/bracket'
import { renamePoll, duplicatePoll, archivePoll, deletePoll, reopenPoll, assignPollToSession } from '@/actions/poll'
import { reopenBracket } from '@/actions/bracket-advance'

interface CardContextMenuProps {
  itemId: string
  itemName: string
  itemType: 'poll' | 'bracket'
  status: string
  editHref: string
  sessionCode?: string | null
  onStartRename: () => void
  onDuplicated?: (newId: string) => void
  onArchived?: () => void
  onDeleted?: () => void
  onReopened?: () => void
  sessions?: Array<{ id: string; name: string | null; status: string; code: string; _count: { participants: number } }>
  currentSessionId?: string | null
  onMoved?: () => void
}

export function CardContextMenu({
  itemId,
  itemName,
  itemType,
  status,
  editHref,
  sessionCode,
  onStartRename,
  onDuplicated,
  onArchived,
  onDeleted,
  onReopened,
  sessions,
  currentSessionId,
  onMoved,
}: CardContextMenuProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)

  function handleEdit(e: Event) {
    e.stopPropagation()
    router.push(editHref)
  }

  function handleCopyLink(e: Event) {
    e.stopPropagation()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url =
      status === 'active' && sessionCode
        ? `${origin}/join/${sessionCode}`
        : `${origin}${editHref}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDuplicate(e: Event) {
    e.stopPropagation()
    startTransition(async () => {
      if (itemType === 'bracket') {
        const result = await duplicateBracket({ bracketId: itemId })
        if ('bracket' in result && result.bracket) {
          onDuplicated?.(result.bracket.id)
        }
      } else {
        const result = await duplicatePoll({ pollId: itemId })
        if ('poll' in result && result.poll) {
          onDuplicated?.(result.poll.id)
        }
      }
    })
  }

  function handleArchive(e: Event) {
    e.stopPropagation()
    startTransition(async () => {
      if (itemType === 'bracket') {
        const result = await archiveBracket({ bracketId: itemId })
        if ('success' in result && result.success) {
          onArchived?.()
        }
      } else {
        const result = await archivePoll({ pollId: itemId })
        if ('success' in result && result.success) {
          onArchived?.()
        }
      }
    })
  }

  function handleReopen(e: Event) {
    e.stopPropagation()
    startTransition(async () => {
      if (itemType === 'bracket') {
        const result = await reopenBracket({ bracketId: itemId })
        if ('success' in result && result.success) {
          onReopened?.()
        }
      } else {
        const result = await reopenPoll({ pollId: itemId })
        if ('success' in result && result.success) {
          onReopened?.()
        }
      }
    })
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      if (itemType === 'bracket') {
        const result = await deleteBracket({ bracketId: itemId })
        if ('success' in result && result.success) {
          setShowDeleteDialog(false)
          onDeleted?.()
        }
      } else {
        const result = await deletePoll({ pollId: itemId })
        if ('success' in result && result.success) {
          setShowDeleteDialog(false)
          onDeleted?.()
        }
      }
    })
  }

  async function handleMoveToSession(targetSessionId: string) {
    if (itemType === 'bracket') {
      const result = await assignBracketToSession({ bracketId: itemId, sessionId: targetSessionId })
      if (!('error' in result)) {
        setShowMoveDialog(false)
        onMoved?.()
        router.refresh()
      }
    } else {
      const result = await assignPollToSession({ pollId: itemId, sessionId: targetSessionId })
      if (!('error' in result)) {
        setShowMoveDialog(false)
        onMoved?.()
        router.refresh()
      }
    }
  }

  async function handleDuplicateToSession(targetSessionId: string) {
    if (itemType === 'bracket') {
      const result = await duplicateBracket({ bracketId: itemId, targetSessionId })
      if ('bracket' in result && result.bracket) {
        setShowDuplicateDialog(false)
        router.refresh()
      }
    } else {
      const result = await duplicatePoll({ pollId: itemId, targetSessionId })
      if ('poll' in result && result.poll) {
        setShowDuplicateDialog(false)
        router.refresh()
      }
    }
  }

  const isLive = status === 'active'
  const isArchived = status === 'archived'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">
              {itemType === 'poll' ? 'Poll' : 'Bracket'} options
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={isPending}
            onSelect={(e) => {
              e.stopPropagation()
              onStartRename()
            }}
          >
            <Pencil className="h-4 w-4" />
            Rename
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={isPending}
            onSelect={handleEdit}
          >
            <SquarePen className="h-4 w-4" />
            Edit
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={isPending}
            onSelect={handleCopyLink}
          >
            <Link className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy Link'}
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={isPending}
            onSelect={handleDuplicate}
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </DropdownMenuItem>

          {sessions && sessions.length > 0 && (
            <>
              <DropdownMenuItem
                disabled={isPending}
                onSelect={(e) => {
                  e.stopPropagation()
                  setShowMoveDialog(true)
                }}
              >
                <FolderInput className="h-4 w-4" />
                Move to session...
              </DropdownMenuItem>

              <DropdownMenuItem
                disabled={isPending}
                onSelect={(e) => {
                  e.stopPropagation()
                  setShowDuplicateDialog(true)
                }}
              >
                <CopyPlus className="h-4 w-4" />
                Duplicate to session...
              </DropdownMenuItem>
            </>
          )}

          {(status === 'completed' || status === 'closed') && !isArchived && (
            <DropdownMenuItem
              disabled={isPending}
              onSelect={handleReopen}
            >
              <RotateCcw className="h-4 w-4" />
              Reopen
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {!isArchived ? (
            <DropdownMenuItem
              variant="destructive"
              disabled={isPending}
              onSelect={handleArchive}
            >
              <Archive className="h-4 w-4" />
              Archive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              disabled={isPending}
              onSelect={(e) => {
                e.stopPropagation()
                setShowDeleteDialog(true)
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete Permanently
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        itemName={itemName}
        itemType={itemType}
        isLive={isLive}
        onConfirm={handleDeleteConfirm}
        isPending={isPending}
      />

      {sessions && (
        <>
          <SessionPickerDialog
            open={showMoveDialog}
            onOpenChange={setShowMoveDialog}
            sessions={sessions}
            currentSessionId={currentSessionId ?? null}
            onConfirm={handleMoveToSession}
            title="Move to session"
            confirmLabel="Move Activity"
            isPending={isPending}
          />
          <SessionPickerDialog
            open={showDuplicateDialog}
            onOpenChange={setShowDuplicateDialog}
            sessions={sessions}
            currentSessionId={currentSessionId ?? null}
            onConfirm={handleDuplicateToSession}
            title="Duplicate to session"
            confirmLabel="Duplicate Activity"
            isPending={isPending}
          />
        </>
      )}
    </>
  )
}
