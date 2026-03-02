'use client'

import { useActionState } from 'react'
import { forceSetPassword } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SetPasswordForm() {
  const [state, formAction, isPending] = useActionState(forceSetPassword, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-center">
        <h2 className="text-xl font-semibold">Set Your Password</h2>
        <p className="text-sm text-muted-foreground">
          Choose a password you&apos;ll remember. You&apos;ll use this to sign in.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          placeholder="At least 8 characters"
          required
          autoComplete="new-password"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          required
          autoComplete="new-password"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Setting password...' : 'Get Started'}
      </Button>
    </form>
  )
}
