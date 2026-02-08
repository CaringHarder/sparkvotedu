'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

interface WinnerRevealProps {
  entrant1Name: string
  entrant2Name: string
  onComplete: () => void
}

/**
 * Dramatic countdown + suspense overlay.
 *
 * Animation sequence:
 * 1. Full-screen overlay fades in
 * 2. Countdown: 3... 2... 1...
 * 3. "And the winner is..." text with matchup names
 * 4. Auto-dismisses → CelebrationScreen reveals the winner
 */
export function WinnerReveal({
  entrant1Name,
  entrant2Name,
  onComplete,
}: WinnerRevealProps) {
  const prefersReducedMotion = useReducedMotion()
  const [stage, setStage] = useState<'countdown' | 'reveal' | 'done'>(
    prefersReducedMotion ? 'done' : 'countdown'
  )
  const [countdownNumber, setCountdownNumber] = useState(3)

  const dismiss = useCallback(() => {
    setStage('done')
    onComplete()
  }, [onComplete])

  // Reduced motion: skip straight to celebration
  useEffect(() => {
    if (prefersReducedMotion && stage === 'done') {
      onComplete()
    }
  }, [prefersReducedMotion, stage, onComplete])

  // Countdown sequence: 3, 2, 1, then reveal
  useEffect(() => {
    if (prefersReducedMotion) return

    if (stage === 'countdown') {
      if (countdownNumber > 0) {
        const timer = setTimeout(() => {
          setCountdownNumber((n) => n - 1)
        }, 1100)
        return () => clearTimeout(timer)
      } else {
        setStage('reveal')
      }
    }
  }, [stage, countdownNumber, prefersReducedMotion])

  // "And the winner is..." -> dismiss after suspense (CelebrationScreen reveals the winner)
  useEffect(() => {
    if (stage === 'reveal') {
      const timer = setTimeout(dismiss, 2000)
      return () => clearTimeout(timer)
    }
  }, [stage, dismiss])

  // Reduced motion: skip entirely
  if (prefersReducedMotion) {
    return null
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={dismiss}
      role="dialog"
      aria-label="Winner reveal countdown"
    >
      <AnimatePresence mode="wait">
        {/* Countdown: 3, 2, 1 */}
        {stage === 'countdown' && countdownNumber > 0 && (
          <motion.span
            key={`countdown-${countdownNumber}`}
            className="text-8xl font-bold text-white md:text-9xl"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.3, opacity: 1 }}
            exit={{ scale: 1.8, opacity: 0 }}
            transition={{
              duration: 0.35,
              ease: 'easeOut',
            }}
          >
            {countdownNumber}
          </motion.span>
        )}

        {/* "And the winner is..." */}
        {stage === 'reveal' && (
          <motion.div
            key="reveal-text"
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <p className="mb-2 text-lg text-white/60">
              {entrant1Name} vs {entrant2Name}
            </p>
            <p className="text-3xl font-semibold text-white md:text-4xl">
              And the winner is...
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  )
}
