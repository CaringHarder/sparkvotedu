'use client'

import { useEffect, useCallback, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import confetti from 'canvas-confetti'

interface CelebrationScreenProps {
  championName: string
  bracketName: string
  onDismiss: () => void
}

/**
 * Full celebration screen for the bracket champion.
 *
 * Displays a trophy, champion name, and bracket name with confetti
 * bursts from left, center, and right. Auto-dismisses after 10 seconds
 * or on "Continue" button click.
 */
export function CelebrationScreen({
  championName,
  bracketName,
  onDismiss,
}: CelebrationScreenProps) {
  const prefersReducedMotion = useReducedMotion()
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
    }
    onDismiss()
  }, [onDismiss])

  // Confetti bursts on mount
  useEffect(() => {
    // canvas-confetti has built-in disableForReducedMotion support
    const defaults = {
      disableForReducedMotion: true,
    }

    // Center burst
    confetti({
      ...defaults,
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.6 },
    })

    // Left burst after 300ms
    const leftTimer = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 60,
        spread: 55,
        origin: { x: 0.2, y: 0.65 },
        angle: 60,
      })
    }, 300)

    // Right burst after 600ms
    const rightTimer = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 60,
        spread: 55,
        origin: { x: 0.8, y: 0.65 },
        angle: 120,
      })
    }, 600)

    // Auto-dismiss after 10 seconds
    dismissTimerRef.current = setTimeout(handleDismiss, 10000)

    return () => {
      clearTimeout(leftTimer)
      clearTimeout(rightTimer)
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }
    }
  }, [handleDismiss])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80"
      role="dialog"
      aria-label={`Champion: ${championName}`}
    >
      {/* Trophy icon */}
      <motion.div
        className="mb-6 text-8xl"
        initial={prefersReducedMotion ? {} : { scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 10,
          delay: 0.2,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-24 w-24 text-yellow-400 drop-shadow-lg md:h-32 md:w-32"
          aria-hidden="true"
        >
          <path d="M5 3h14a1 1 0 011 1v2a5 5 0 01-3 4.584V13a5 5 0 01-4 4.9V20h2a1 1 0 110 2H9a1 1 0 110-2h2v-2.1A5 5 0 017 13v-2.416A5 5 0 014 6V4a1 1 0 011-1zm0 2v1a3 3 0 002 2.83V5H5zm14 0h-2v3.83A3 3 0 0019 6V5zm-4 0H9v8a3 3 0 006 0V5z" />
        </svg>
      </motion.div>

      {/* CHAMPION text */}
      <motion.h1
        className="mb-4 text-4xl font-extrabold uppercase tracking-widest text-yellow-400 md:text-6xl"
        initial={prefersReducedMotion ? {} : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 150,
          damping: 12,
          delay: 0.4,
        }}
        style={{
          textShadow:
            '0 0 30px rgba(250, 204, 21, 0.5), 0 0 60px rgba(250, 204, 21, 0.3)',
        }}
      >
        CHAMPION!
      </motion.h1>

      {/* Champion name */}
      <motion.p
        className="mb-3 text-3xl font-bold text-white md:text-5xl"
        initial={prefersReducedMotion ? {} : { y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5, ease: 'easeOut' }}
      >
        {championName}
      </motion.p>

      {/* Bracket name */}
      <motion.p
        className="mb-10 text-lg text-white/60 md:text-xl"
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.4 }}
      >
        {bracketName}
      </motion.p>

      {/* Continue button */}
      <motion.button
        type="button"
        onClick={handleDismiss}
        className="rounded-lg bg-white/20 px-8 py-3 text-lg font-medium text-white backdrop-blur transition-colors hover:bg-white/30"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.4 }}
      >
        Continue
      </motion.button>
    </div>
  )
}
