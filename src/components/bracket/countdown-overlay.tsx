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
  const [stage, setStage] = useState<'countdown' | 'pause' | 'title' | 'done'>(
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

  // Countdown sequence: 3, 2, 1, then pause, then title
  useEffect(() => {
    if (prefersReducedMotion) return

    if (stage === 'countdown') {
      if (countdownNumber > 0) {
        const timer = setTimeout(() => {
          setCountdownNumber((n) => n - 1)
        }, 1100)
        return () => clearTimeout(timer)
      } else {
        setStage('pause')
      }
    }
  }, [stage, countdownNumber, prefersReducedMotion])

  // Brief pause after countdown (matching WinnerReveal pattern)
  useEffect(() => {
    if (stage === 'pause') {
      const timer = setTimeout(() => setStage('title'), 800)
      return () => clearTimeout(timer)
    }
  }, [stage])

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
          {/* Countdown: 3, 2, 1 -- brand-blue glow matching WinnerReveal */}
          {stage === 'countdown' && countdownNumber > 0 && (
            <motion.div
              key={`countdown-${countdownNumber}`}
              className="relative"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {/* Glow behind number */}
              <div
                className="absolute inset-0 flex items-center justify-center blur-[40px]"
                style={{ color: 'var(--brand-blue)' }}
              >
                <span className="text-[10rem] font-black md:text-[14rem]">
                  {countdownNumber}
                </span>
              </div>
              <span
                className="relative text-[10rem] font-black leading-none text-brand-blue md:text-[14rem]"
                style={{
                  textShadow: '0 0 40px var(--brand-blue), 0 0 80px color-mix(in oklch, var(--brand-blue) 40%, transparent)',
                }}
              >
                {countdownNumber}
              </span>
            </motion.div>
          )}

          {/* Brief pause -- pulsing dots matching WinnerReveal */}
          {stage === 'pause' && (
            <motion.div
              key="pause"
              className="flex gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-3 w-3 rounded-full bg-brand-amber"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
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
