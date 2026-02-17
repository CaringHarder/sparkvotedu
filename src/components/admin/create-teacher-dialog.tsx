'use client'

import { useActionState, useState } from 'react'
import { UserPlus, Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTeacherAccountAction } from '@/actions/admin'

const tierOptions = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'pro_plus', label: 'Pro Plus' },
]

export function CreateTeacherDialog() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const [state, formAction, isPending] = useActionState(
    createTeacherAccountAction,
    null
  )

  function handleCopy() {
    if (state?.tempPassword) {
      navigator.clipboard.writeText(state.tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setCopied(false)
    }
  }

  // After successful creation, show temp password view
  const showPasswordView = state?.success && state?.tempPassword

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4" />
          Create Teacher
        </Button>
      </DialogTrigger>

      <DialogContent>
        {showPasswordView ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-emerald-600 dark:text-emerald-400">
                Account Created
              </DialogTitle>
              <DialogDescription>{state.success}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                <p className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Temporary Password
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm dark:bg-background">
                    {state.tempPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Save this password -- it will not be shown again.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create Teacher Account</DialogTitle>
              <DialogDescription>
                Create a new teacher account with a temporary password. The
                teacher can change their password after first login.
              </DialogDescription>
            </DialogHeader>

            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  name="name"
                  placeholder="Teacher name"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  name="email"
                  type="email"
                  placeholder="teacher@school.edu"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-tier">Plan Tier</Label>
                <select
                  id="create-tier"
                  name="tier"
                  defaultValue="free"
                  disabled={isPending}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
                >
                  {tierOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Creating...' : 'Create Account'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
