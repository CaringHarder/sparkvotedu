'use client'

import { useActionState, useRef, useEffect } from 'react'
import { changePassword } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PasswordChangeSection() {
  const [state, formAction, isPending] = useActionState(changePassword, null)
  const formRef = useRef<HTMLFormElement>(null)

  // Clear form fields on successful password change
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
    }
  }, [state?.success])

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <h3 className="text-lg font-semibold">Change Password</h3>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="current-password">Current Password</Label>
          <Input
            id="current-password"
            name="currentPassword"
            type="password"
            placeholder="Enter current password"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <Input
            id="new-password"
            name="newPassword"
            type="password"
            placeholder="At least 8 characters"
            required
            minLength={8}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            required
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Changing...' : 'Change Password'}
        </Button>
      </div>
    </form>
  )
}
