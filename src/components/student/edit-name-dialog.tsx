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
  currentLastInitial: string
  onNameUpdated: (firstName: string, lastInitial: string) => void
}

export function EditNameDialog({
  participantId,
  currentFirstName,
  currentLastInitial,
  onNameUpdated,
}: EditNameDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(currentFirstName)
  const [lastInitial, setLastInitial] = useState(currentLastInitial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) {
      setName(currentFirstName)
      setLastInitial(currentLastInitial)
      setError('')
      setSaving(false)
    }
  }

  async function handleSave() {
    setError('')

    const validation = validateFirstName(name)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    const trimmedLI = lastInitial.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
    if (trimmedLI.length === 0) {
      setError('Last initial is required')
      return
    }

    if (validation.name === currentFirstName && trimmedLI === currentLastInitial) {
      setOpen(false)
      return
    }

    setSaving(true)

    try {
      const result = await updateParticipantName({
        participantId,
        firstName: validation.name,
        lastInitial: trimmedLI,
      })

      if (result.error) {
        setError(result.error)
        setSaving(false)
        return
      }

      if (result.participant) {
        onNameUpdated(result.participant.firstName, result.participant.lastInitial ?? trimmedLI)
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
          <DialogTitle>Fix My Name</DialogTitle>
          <DialogDescription>
            Update your name for this session
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">First Name</label>
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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name, first letter</label>
            <Input
              value={lastInitial}
              onChange={(e) => {
                setLastInitial(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z]/g, '')
                    .slice(0, 2)
                )
                if (error) setError('')
              }}
              placeholder="A-Z"
              maxLength={2}
              className="max-w-[120px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !saving) {
                  handleSave()
                }
              }}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

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
