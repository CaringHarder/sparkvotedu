'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface WelcomeScreenProps {
  funName: string
  teacherName: string | null
  returning: boolean
  sessionId: string
}

export function WelcomeScreen({
  funName,
  teacherName,
  returning,
  sessionId,
}: WelcomeScreenProps) {
  const router = useRouter()
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (returning) return

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          router.push(`/session/${sessionId}`)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [returning, sessionId, router])

  if (returning) {
    return (
      <div className="flex flex-col items-center gap-8 pt-16 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="mb-2 text-4xl">*</div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
          <p className="text-4xl font-extrabold text-primary mt-2">
            {funName}
          </p>
        </div>

        <p className="text-muted-foreground">
          Good to see you again. Your name is still reserved.
        </p>

        <Button
          size="lg"
          className="text-lg px-8"
          onClick={() => router.push(`/session/${sessionId}`)}
        >
          Rejoin Session
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8 pt-16 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="mb-2 text-4xl">*</div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome!</h1>
        <p className="text-4xl font-extrabold text-primary mt-2">{funName}</p>
      </div>

      <p className="text-muted-foreground">
        You&apos;re joining{' '}
        <span className="font-medium text-foreground">
          {teacherName ? `${teacherName}'s class` : 'a class'}
        </span>
      </p>

      <div className="flex flex-col items-center gap-2">
        <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${((3 - countdown) / 3) * 100}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Loading session...
        </p>
      </div>
    </div>
  )
}
