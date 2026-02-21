'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
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
  const prefersReducedMotion = useReducedMotion()

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
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand-blue"
            >
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
              <path d="M9 18h6" />
              <path d="M10 22h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
          <p className="mt-2 text-4xl font-extrabold text-brand-amber">
            {funName}
          </p>
        </motion.div>

        <motion.p
          className="text-muted-foreground"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          Good to see you again. Your name is still reserved.
        </motion.p>

        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Button
            size="lg"
            className="min-h-[48px] bg-brand-blue px-8 text-lg text-white hover:bg-brand-blue-dark"
            onClick={() => router.push(`/session/${sessionId}`)}
          >
            Rejoin Session
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8 pt-16 text-center">
      <motion.div
        className="flex flex-col items-center gap-2"
        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-brand-amber/15">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand-amber"
          >
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
            <path d="M9 18h6" />
            <path d="M10 22h4" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome!</h1>
        <motion.p
          className="mt-2 text-4xl font-extrabold text-brand-amber"
          initial={prefersReducedMotion ? {} : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 180,
            damping: 12,
            delay: 0.2,
          }}
        >
          You&apos;re now {funName}!
        </motion.p>
      </motion.div>

      <motion.p
        className="text-muted-foreground"
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        You&apos;re joining{' '}
        <span className="font-medium text-foreground">
          {teacherName ? `${teacherName}'s class` : 'a class'}
        </span>
      </motion.p>

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        {/* Circular progress indicator */}
        <div className="relative flex h-14 w-14 items-center justify-center">
          <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted/50"
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={2 * Math.PI * 24}
              strokeDashoffset={2 * Math.PI * 24 * (countdown / 3)}
              strokeLinecap="round"
              className="text-brand-blue transition-all duration-1000 ease-linear"
            />
          </svg>
          <span className="absolute text-lg font-bold text-brand-blue">
            {countdown}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Entering session...
        </p>
      </motion.div>
    </div>
  )
}
