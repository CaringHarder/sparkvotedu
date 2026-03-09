'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmojiAvatar } from '@/components/student/emoji-avatar'
import { validateFirstName } from '@/lib/validations/first-name'
import { teacherUpdateStudentName } from '@/actions/student'

interface TeacherEditNameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participantId: string
  currentFirstName: string
  funName: string
  emoji: string | null
}

export function TeacherEditNameDialog({
  open,
  onOpenChange,
  participantId,
  currentFirstName,
  funName,
  emoji,
}: TeacherEditNameDialogProps) {
  const [firstName, setFirstName] = useState(currentFirstName)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Reset state when dialog opens with new participant
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setFirstName(currentFirstName)
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  const handleSave = () => {
    const result = validateFirstName(firstName)
    if (!result.valid) {
      setError(result.error)
      return
    }

    setError(null)
    startTransition(async () => {
      const res = await teacherUpdateStudentName({
        participantId,
        firstName: result.name,
      })
      if (res.error) {
        setError(res.error)
      } else {
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Student Name</DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-1.5">
              <EmojiAvatar shortcode={emoji} size="sm" />
              <span>{funName}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="teacher-edit-name" className="text-sm font-medium">
            First Name
          </label>
          <Input
            id="teacher-edit-name"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
            }}
            placeholder="Student first name"
            autoFocus
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
