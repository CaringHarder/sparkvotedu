'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deactivateTeacherAction } from '@/actions/admin'

interface DeactivateDialogProps {
  teacherName: string
  teacherId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeactivated: () => void
}

const CONFIRM_TEXT = 'DEACTIVATE'

export function DeactivateDialog({
  teacherName,
  teacherId,
  open,
  onOpenChange,
  onDeactivated,
}: DeactivateDialogProps) {
  const [confirmInput, setConfirmInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isConfirmed = confirmInput === CONFIRM_TEXT

  function handleConfirm() {
    if (!isConfirmed) return

    setError(null)
    startTransition(async () => {
      const result = await deactivateTeacherAction(teacherId)
      if (result.success) {
        setConfirmInput('')
        onOpenChange(false)
        onDeactivated()
      } else {
        setError(result.error ?? 'Failed to deactivate')
      }
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setConfirmInput('')
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Deactivate Account
          </DialogTitle>
          <DialogDescription>
            Deactivating this account will block{' '}
            <strong className="text-foreground">{teacherName}</strong> from
            logging in. They will lose access to all their brackets, polls,
            and class sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label htmlFor="confirm-deactivate">
            Type <span className="font-mono font-bold">{CONFIRM_TEXT}</span> to
            confirm
          </Label>
          <Input
            id="confirm-deactivate"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={CONFIRM_TEXT}
            autoComplete="off"
            disabled={isPending}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || isPending}
          >
            {isPending ? 'Deactivating...' : 'Deactivate Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
