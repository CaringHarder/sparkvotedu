'use client'

import { useTransition } from 'react'
import { signOut } from '@/actions/auth'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      disabled={isPending}
      className={isPending ? 'opacity-50' : ''}
    >
      {isPending ? 'Signing out...' : 'Sign Out'}
    </Button>
  )
}
