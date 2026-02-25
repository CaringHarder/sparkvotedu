'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemType: 'poll' | 'bracket'
  isLive: boolean
  onConfirm: () => void
  isPending: boolean
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemName,
  itemType,
  isLive,
  onConfirm,
  isPending,
}: DeleteConfirmDialogProps) {
  const typeLabel = itemType === 'poll' ? 'Poll' : 'Bracket'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {typeLabel}?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{itemName}&rdquo;? This
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {isLive && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            This {itemType} is currently live. Students will lose access
            immediately.
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Deleting...' : `Delete ${typeLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
