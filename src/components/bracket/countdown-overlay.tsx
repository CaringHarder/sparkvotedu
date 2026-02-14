'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

interface CountdownOverlayProps {
  roundNumber: number
  onComplete: () => void
}

/**
 * Full-screen 3-2-1 countdown overlay shown between round reveals.
 *
 * Animation sequence:
 * 1. Overlay fades in
 * 2. 3... 2... 1... with scale + fade animation
 * 3. "Round {N} Results" text with fade-in
 * 4. Auto-calls onComplete after 1.5s pause
 *
 * Respects prefers-reduced-motion: skips animation and calls onComplete immediately.
 * Follows WinnerReveal countdown pattern from 04-06.
 */
export function CountdownOverlay({ roundNumber, onComplete }: CountdownOverlayProps) {
  const prefersReducedMotion = useReducedMotion()
  const [stage, setStage] = useState<'countdown' | 'title' | 'done'>(
    prefersReducedMotion ? 'done' : 'countdown'
  )
  const [countdownNumber, setCountdownNumber] = useState(3)

  const dismiss = useCallback(() => {
    setStage('done')
    onComplete()
  }, [onComplete])

  // Reduced motion: skip straight to completion
  useEffect(() => {
    if (prefersReducedMotion && stage === 'done') {
      onComplete()
    }
  }, [prefersReducedMotion, stage, onComplete])

  // Countdown sequence: 3, 2, 1, then title
  useEffect(() => {
    if (prefersReducedMotion) return

    if (stage === 'countdown') {
      if (countdownNumber > 0) {
        const timer = setTimeout(() => {
          setCountdownNumber((n) => n - 1)
        }, 1100)
        return () => clearTimeout(timer)
      } else {
        setStage('title')
      }
    }
  }, [stage, countdownNumber, prefersReducedMotion])

  // "Round N Results" -> dismiss after 1.5s
  useEffect(() => {
    if (stage === 'title') {
      const timer = setTimeout(dismiss, 1500)
      return () => clearTimeout(timer)
    }
  }, [stage, dismiss])

  // Reduced motion: skip entirely
  if (prefersReducedMotion) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={dismiss}
        role="dialog"
        aria-label={`Round ${roundNumber} reveal countdown`}
      >
        <AnimatePresence mode="wait">
          {/* Countdown: 3, 2, 1 */}
          {stage === 'countdown' && countdownNumber > 0 && (
            <motion.span
              key={`countdown-${countdownNumber}`}
              className="text-8xl font-bold text-white md:text-9xl"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 1.8, opacity: 0 }}
              transition={{
                duration: 0.35,
                ease: 'easeOut',
              }}
            >
              {countdownNumber}
            </motion.span>
          )}

          {/* "Round N Results" */}
          {stage === 'title' && (
            <motion.div
              key="title-text"
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <p className="text-3xl font-bold text-white md:text-4xl">
                Round {roundNumber} Results
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
