'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

interface WinnerRevealProps {
  // Props kept for API compatibility -- callers pass context names
  entrant1Name: string
  entrant2Name: string
  onComplete: () => void
}

/**
 * Countdown-only overlay with brand-blue numbers.
 *
 * Animation sequence:
 * 1. Full-screen overlay fades in
 * 2. Countdown: 3... 2... 1... (brand-blue, large pulsing numbers)
 * 3. Calls onComplete -> CelebrationScreen/PollReveal takes over
 *
 * Total duration: ~3.3 seconds (1.1s per number).
 */
export function WinnerReveal({
  entrant1Name: _entrant1Name,
  entrant2Name: _entrant2Name,
  onComplete,
}: WinnerRevealProps) {
  const prefersReducedMotion = useReducedMotion()
  const [stage, setStage] = useState<'countdown' | 'done'>(
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

  // Countdown sequence: 3, 2, 1, then call onComplete immediately
  useEffect(() => {
    if (prefersReducedMotion) return

    if (stage === 'countdown') {
      if (countdownNumber > 0) {
        const timer = setTimeout(() => {
          setCountdownNumber((n) => n - 1)
        }, 1100)
        return () => clearTimeout(timer)
      } else {
        dismiss()
      }
    }
  }, [stage, countdownNumber, prefersReducedMotion, dismiss])

  // Reduced motion: skip entirely
  if (prefersReducedMotion) {
    return null
  }

  // Background opacity increases through countdown for anticipation buildup
  const bgOpacity =
    stage === 'countdown'
      ? 0.6 + (3 - countdownNumber) * 0.1
      : 0.9

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: `rgba(0, 0, 0, ${bgOpacity})` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={dismiss}
      role="dialog"
      aria-label="Winner reveal countdown"
    >
      <AnimatePresence mode="wait">
        {/* Countdown: 3, 2, 1 -- brand-blue, larger, with pulsing scale */}
        {stage === 'countdown' && countdownNumber > 0 && (
          <motion.div
            key={`countdown-${countdownNumber}`}
            className="relative"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{
              duration: 0.4,
              ease: 'easeOut',
            }}
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
      </AnimatePresence>
    </motion.div>
  )
}
