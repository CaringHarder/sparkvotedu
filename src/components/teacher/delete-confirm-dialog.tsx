'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteSessionPermanentlyAction } from '@/actions/class-session'

interface DeleteConfirmDialogProps {
  sessionId: string
  sessionName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function DeleteConfirmDialog({
  sessionId,
  sessionName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteConfirmDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteSessionPermanentlyAction(sessionId)
      if (result.success) {
        onOpenChange(false)
        onDeleted()
      } else {
        setError(result.error ?? 'Failed to delete session')
      }
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanently delete this session?</DialogTitle>
          <DialogDescription>
            This will permanently delete
            {sessionName ? (
              <> the session <strong className="text-foreground">{sessionName}</strong>,</>
            ) : (
              ' this session,'
            )}{' '}
            all student data, brackets, polls, and votes. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
