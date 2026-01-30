'use client'

import { useState, useTransition } from 'react'
import { removeStudent, banStudent } from '@/actions/class-session'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface StudentManagementProps {
  participantId: string
  funName: string
  banned: boolean
  onAction: () => void
}

type ActionType = 'remove' | 'ban' | null

export function StudentManagement({
  participantId,
  funName,
  banned,
  onAction,
}: StudentManagementProps) {
  const [confirmAction, setConfirmAction] = useState<ActionType>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    if (!confirmAction) return

    startTransition(async () => {
      if (confirmAction === 'remove') {
        await removeStudent(participantId)
      } else if (confirmAction === 'ban') {
        await banStudent(participantId)
      }
      setConfirmAction(null)
      onAction()
    })
  }

  if (banned) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
            <span className="sr-only">Actions for {funName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setConfirmAction('remove')}>
            Remove
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmAction('ban')}
            className="text-destructive focus:text-destructive"
          >
            Ban Device
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'remove'
                ? `Remove ${funName}?`
                : `Ban ${funName}'s device?`}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'remove'
                ? `Remove ${funName} from this session? They can rejoin with the class code.`
                : `Ban ${funName}'s device from rejoining this session? This prevents the student from re-entering.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending
                ? 'Processing...'
                : confirmAction === 'remove'
                  ? 'Remove'
                  : 'Ban Device'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
