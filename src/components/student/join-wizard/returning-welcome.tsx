'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'

interface ReturningWelcomeProps {
  funName: string
  emojiChar: string
  onComplete: () => void
}

export function ReturningWelcome({ funName, emojiChar, onComplete }: ReturningWelcomeProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-advance after 2.5 seconds
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onComplete()
    }, 2500)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center gap-4 py-8 text-center"
    >
      <span className="text-6xl">{emojiChar}</span>
      <p className="text-2xl font-bold">Welcome back!</p>
      <p className="text-lg text-muted-foreground">
        You&apos;re still <span className="font-semibold">{funName}</span>
      </p>
    </motion.div>
  )
}
