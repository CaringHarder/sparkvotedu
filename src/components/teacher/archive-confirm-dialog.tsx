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
import { archiveSessionAction } from '@/actions/class-session'

interface ArchiveConfirmDialogProps {
  sessionId: string
  sessionName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onArchived: () => void
}

export function ArchiveConfirmDialog({
  sessionId,
  sessionName,
  open,
  onOpenChange,
  onArchived,
}: ArchiveConfirmDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await archiveSessionAction(sessionId)
      if (result.success) {
        onOpenChange(false)
        onArchived()
      } else {
        setError(result.error ?? 'Failed to archive session')
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
          <DialogTitle>Archive this session?</DialogTitle>
          <DialogDescription>
            {sessionName ? (
              <>
                <strong className="text-foreground">{sessionName}</strong> will
                be hidden from the main list. Students will no longer be able to
                join using the class code. You can recover the session at any
                time.
              </>
            ) : (
              <>
                This session and all its activities will be hidden from the main
                list. Students will no longer be able to join using the class
                code. You can recover the session at any time.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
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
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? 'Archiving...' : 'Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
