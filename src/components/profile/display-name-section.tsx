'use client'

import { useActionState } from 'react'
import { updateDisplayName } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DisplayNameSectionProps {
  name: string
}

export function DisplayNameSection({ name }: DisplayNameSectionProps) {
  const [state, formAction, isPending] = useActionState(updateDisplayName, null)

  return (
    <form action={formAction} className="space-y-4">
      <h3 className="text-lg font-semibold">Display Name</h3>

      <div className="space-y-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          name="name"
          defaultValue={name}
          placeholder="Enter your display name"
          required
          maxLength={100}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
