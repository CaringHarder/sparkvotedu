'use client'

import { useState, useTransition } from 'react'
import { removeStudent, banStudent, unbanStudent } from '@/actions/class-session'
import { TeacherEditNameDialog } from './teacher-edit-name-dialog'
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
  firstName: string
  lastInitial: string | null
  emoji: string | null
  banned: boolean
  sessionActive: boolean
  onAction: () => void
}

type ActionType = 'remove' | 'ban' | 'unban' | null

export function StudentManagement({
  participantId,
  funName,
  firstName,
  lastInitial,
  emoji,
  banned,
  sessionActive,
  onAction,
}: StudentManagementProps) {
  const [confirmAction, setConfirmAction] = useState<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    if (!confirmAction) return

    startTransition(async () => {
      if (confirmAction === 'remove') {
        await removeStudent(participantId)
      } else if (confirmAction === 'ban') {
        await banStudent(participantId)
      } else if (confirmAction === 'unban') {
        await unbanStudent(participantId)
      }
      setConfirmAction(null)
      onAction()
    })
  }

  // Nothing to show if not banned and session is not active
  if (!banned && !sessionActive) return null

  const threeDotsIcon = (
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
  )

  function getDialogTitle() {
    if (confirmAction === 'remove') return `Remove ${funName}?`
    if (confirmAction === 'ban') return `Ban ${funName}'s device?`
    if (confirmAction === 'unban') return `Allow ${funName}'s device?`
    return ''
  }

  function getDialogDescription() {
    if (confirmAction === 'remove')
      return `Remove ${funName} from this session? They can rejoin with the class code.`
    if (confirmAction === 'ban')
      return `Ban ${funName}'s device from rejoining this session? This prevents the student from re-entering.`
    if (confirmAction === 'unban')
      return `This will allow ${funName}'s device to rejoin the session.`
    return ''
  }

  function getConfirmLabel() {
    if (isPending) return 'Processing...'
    if (confirmAction === 'remove') return 'Remove'
    if (confirmAction === 'ban') return 'Ban Device'
    if (confirmAction === 'unban') return 'Allow Device'
    return ''
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {threeDotsIcon}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {banned ? (
            <DropdownMenuItem onClick={() => setConfirmAction('unban')}>
              Allow Device
            </DropdownMenuItem>
          ) : (
            <>
              {sessionActive && (
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  Edit Name
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setConfirmAction('remove')}>
                Remove
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmAction('ban')}
                className="text-destructive focus:text-destructive"
              >
                Ban Device
              </DropdownMenuItem>
            </>
          )}
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
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
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
              variant={confirmAction === 'unban' ? 'default' : 'destructive'}
              onClick={handleConfirm}
              disabled={isPending}
            >
              {getConfirmLabel()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TeacherEditNameDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) onAction()
        }}
        participantId={participantId}
        currentFirstName={firstName}
        currentLastInitial={lastInitial}
        funName={funName}
        emoji={emoji}
      />
    </>
  )
}
