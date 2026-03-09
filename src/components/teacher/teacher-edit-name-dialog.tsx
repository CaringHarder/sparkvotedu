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
  currentLastInitial?: string | null
  funName: string
  emoji: string | null
}

export function TeacherEditNameDialog({
  open,
  onOpenChange,
  participantId,
  currentFirstName,
  currentLastInitial,
  funName,
  emoji,
}: TeacherEditNameDialogProps) {
  const [firstName, setFirstName] = useState(currentFirstName)
  const [lastInitial, setLastInitial] = useState(currentLastInitial ?? '')
  const [error, setError] = useState<string | null>(null)
  const [lastInitialError, setLastInitialError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Reset state when dialog opens with new participant
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setFirstName(currentFirstName)
      setLastInitial(currentLastInitial ?? '')
      setError(null)
      setLastInitialError(null)
    }
    onOpenChange(nextOpen)
  }

  const handleSave = () => {
    const result = validateFirstName(firstName)
    if (!result.valid) {
      setError(result.error)
      return
    }

    // Validate lastInitial: must be 1-2 uppercase letters if provided
    const trimmedInitial = lastInitial.trim()
    if (trimmedInitial.length === 0) {
      setLastInitialError('Last initial is required')
      return
    }
    if (!/^[A-Z]{1,2}$/.test(trimmedInitial)) {
      setLastInitialError('Must be 1-2 uppercase letters')
      return
    }

    setError(null)
    setLastInitialError(null)
    startTransition(async () => {
      const res = await teacherUpdateStudentName({
        participantId,
        firstName: result.name,
        lastInitial: trimmedInitial,
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

        <div className="space-y-3">
          <div className="space-y-1">
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

          <div className="space-y-1">
            <label htmlFor="teacher-edit-initial" className="text-sm font-medium">
              Last Initial
            </label>
            <Input
              id="teacher-edit-initial"
              value={lastInitial}
              onChange={(e) => {
                // Uppercase only, max 2 chars
                const filtered = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
                setLastInitial(filtered)
                setLastInitialError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
              placeholder="e.g. S"
              maxLength={2}
              className="w-20"
            />
            {lastInitialError && (
              <p className="text-sm text-destructive">{lastInitialError}</p>
            )}
          </div>
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
