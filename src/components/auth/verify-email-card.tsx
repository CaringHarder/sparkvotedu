'use client'

import { useActionState, useEffect, useState } from 'react'
import { resendVerification, signOut } from '@/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? ''}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

interface VerifyEmailCardProps {
  email: string | null
  expired: boolean
}

export function VerifyEmailCard({ email, expired }: VerifyEmailCardProps) {
  const [state, formAction, isPending] = useActionState(resendVerification, null)
  const [cooldown, setCooldown] = useState(0)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Start cooldown after successful resend or rate-limit error
  useEffect(() => {
    if (state?.success) {
      setCooldown(60)
    } else if (state?.error) {
      // Parse seconds from Supabase rate-limit message like "...after 60 seconds"
      const match = state.error.match(/after (\d+) second/)
      if (match) {
        setCooldown(parseInt(match[1], 10))
      }
    }
  }, [state?.success, state?.error, state?.sentAt])

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setGoogleLoading(false)
    }
  }

  function getButtonText() {
    if (isPending) return 'Sending...'
    if (cooldown > 0) return `Resend in ${cooldown}s`
    return 'Resend verification email'
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mail icon */}
      <div className="flex justify-center">
        <MailIcon className="size-12 text-muted-foreground" />
      </div>

      {/* Message text */}
      <div className="text-center text-sm text-muted-foreground">
        {expired ? (
          <p>Enter your email below to resend a new verification link.</p>
        ) : email ? (
          <p>
            We sent a verification link to{' '}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        ) : (
          <p>We sent you a verification link. Check your inbox.</p>
        )}
      </div>

      {/* Resend form */}
      <form action={formAction}>
        <input type="hidden" name="email" value={email ?? ''} />
        <Button
          type="submit"
          className="w-full"
          disabled={isPending || cooldown > 0}
        >
          {getButtonText()}
        </Button>
      </form>

      {/* Success feedback */}
      {state?.success && (
        <p className="text-center text-sm text-muted-foreground">
          Verification email sent!
        </p>
      )}

      {/* Error feedback (hide when cooldown is active since button shows timer) */}
      {state?.error && cooldown <= 0 && (
        <p className="text-center text-sm text-destructive">{state.error}</p>
      )}

      {/* Divider */}
      <div className="relative flex items-center gap-4 py-2">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground uppercase">or</span>
        <Separator className="flex-1" />
      </div>

      {/* Google sign-in button */}
      <Button
        variant="outline"
        className="w-full"
        disabled={googleLoading}
        onClick={handleGoogleSignIn}
      >
        {googleLoading ? (
          <LoadingSpinner className="size-4" />
        ) : (
          <GoogleIcon className="size-4" />
        )}
        Sign in with Google instead
      </Button>

      {/* Sign out link */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => signOut()}
          className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
