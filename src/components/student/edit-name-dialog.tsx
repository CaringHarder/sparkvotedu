'use client'

import { useState } from 'react'
import { updateParticipantName } from '@/actions/student'
import { validateFirstName } from '@/lib/validations/first-name'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface EditNameDialogProps {
  participantId: string
  currentFirstName: string
  onNameUpdated: (newName: string) => void
}

export function EditNameDialog({
  participantId,
  currentFirstName,
  onNameUpdated,
}: EditNameDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(currentFirstName)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) {
      // Reset state when opening
      setName(currentFirstName)
      setError('')
      setSaving(false)
    }
  }

  async function handleSave() {
    setError('')

    // Client-side validation
    const validation = validateFirstName(name)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    // If name hasn't changed, just close
    if (validation.name === currentFirstName) {
      setOpen(false)
      return
    }

    setSaving(true)

    try {
      const result = await updateParticipantName({
        participantId,
        firstName: validation.name,
      })

      if (result.error) {
        setError(result.error)
        setSaving(false)
        return
      }

      if (result.participant) {
        onNameUpdated(result.participant.firstName)
        setOpen(false)
      }
    } catch {
      setError('Failed to update name')
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sm"
        >
          Fix My Name
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Your Name</DialogTitle>
          <DialogDescription>
            Update your first name for this session
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError('')
              }}
              placeholder="Your first name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !saving) {
                  handleSave()
                }
              }}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
