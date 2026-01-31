'use client'

import { useEffect, useCallback, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import confetti from 'canvas-confetti'

interface PollRevealProps {
  winnerText: string
  onDismiss: () => void
}

/**
 * Winner reveal animation with confetti.
 *
 * Sequence:
 * 1. Dark overlay fades in
 * 2. Winner text scales up with spring animation
 * 3. 500ms pause
 * 4. canvas-confetti burst
 * 5. Auto-dismiss after 5 seconds or on click/tap
 *
 * Follows the 04-06 pattern: onDismiss clears reveal state.
 */
export function PollReveal({ winnerText, onDismiss }: PollRevealProps) {
  const prefersReducedMotion = useReducedMotion()
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
    }
    onDismiss()
  }, [onDismiss])

  // Confetti burst after delay, then auto-dismiss
  useEffect(() => {
    const confettiDefaults = {
      disableForReducedMotion: true,
    }

    // Confetti after 500ms pause (matching plan's sequence)
    const confettiTimer = setTimeout(() => {
      confetti({
        ...confettiDefaults,
        particleCount: 80,
        spread: 70,
        origin: { x: 0.5, y: 0.55 },
      })

      // Side bursts after 300ms
      setTimeout(() => {
        confetti({
          ...confettiDefaults,
          particleCount: 40,
          spread: 50,
          origin: { x: 0.25, y: 0.6 },
          angle: 60,
        })
        confetti({
          ...confettiDefaults,
          particleCount: 40,
          spread: 50,
          origin: { x: 0.75, y: 0.6 },
          angle: 120,
        })
      }, 300)
    }, 500)

    // Auto-dismiss after 5 seconds
    dismissTimerRef.current = setTimeout(handleDismiss, 5000)

    return () => {
      clearTimeout(confettiTimer)
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }
    }
  }, [handleDismiss])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 cursor-pointer"
      onClick={handleDismiss}
      role="dialog"
      aria-label={`Winner: ${winnerText}`}
    >
      {/* "Winner!" label */}
      <motion.h2
        className="mb-4 text-3xl font-extrabold uppercase tracking-widest text-yellow-400 md:text-5xl"
        initial={prefersReducedMotion ? {} : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: 0.1,
        }}
        style={{
          textShadow:
            '0 0 30px rgba(250, 204, 21, 0.5), 0 0 60px rgba(250, 204, 21, 0.3)',
        }}
      >
        Winner!
      </motion.h2>

      {/* Winner text */}
      <motion.p
        className="mb-8 max-w-lg px-4 text-center text-2xl font-bold text-white md:text-4xl"
        initial={prefersReducedMotion ? {} : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: 0.3,
        }}
      >
        {winnerText}
      </motion.p>

      {/* Dismiss hint */}
      <motion.p
        className="text-sm text-white/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.4 }}
      >
        Tap anywhere to dismiss
      </motion.p>
    </div>
  )
}
