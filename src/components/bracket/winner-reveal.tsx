'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

interface WinnerRevealProps {
  entrant1Name: string
  entrant2Name: string
  onComplete: () => void
}

/**
 * Dramatic countdown + suspense overlay with brand-blue numbers
 * and darkening background during countdown.
 *
 * Animation sequence:
 * 1. Full-screen overlay fades in
 * 2. Countdown: 3... 2... 1... (brand-blue, large pulsing numbers)
 * 3. Brief pause for maximum impact
 * 4. "And the winner is..." text with matchup names
 * 5. Auto-dismisses -> CelebrationScreen reveals the winner
 */
export function WinnerReveal({
  entrant1Name,
  entrant2Name,
  onComplete,
}: WinnerRevealProps) {
  const prefersReducedMotion = useReducedMotion()
  const [stage, setStage] = useState<'countdown' | 'pause' | 'reveal' | 'done'>(
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

  // Countdown sequence: 3, 2, 1, then brief pause, then reveal
  useEffect(() => {
    if (prefersReducedMotion) return

    if (stage === 'countdown') {
      if (countdownNumber > 0) {
        const timer = setTimeout(() => {
          setCountdownNumber((n) => n - 1)
        }, 1100)
        return () => clearTimeout(timer)
      } else {
        // Brief pause after "1" for maximum impact before reveal
        setStage('pause')
      }
    }
  }, [stage, countdownNumber, prefersReducedMotion])

  // Pause stage: brief 800ms silence after countdown ends
  useEffect(() => {
    if (stage === 'pause') {
      const timer = setTimeout(() => setStage('reveal'), 800)
      return () => clearTimeout(timer)
    }
  }, [stage])

  // "And the winner is..." -> dismiss after suspense
  useEffect(() => {
    if (stage === 'reveal') {
      const timer = setTimeout(dismiss, 2200)
      return () => clearTimeout(timer)
    }
  }, [stage, dismiss])

  // Reduced motion: skip entirely
  if (prefersReducedMotion) {
    return null
  }

  // Background opacity increases through countdown for anticipation buildup
  const bgOpacity =
    stage === 'countdown'
      ? 0.6 + (3 - countdownNumber) * 0.05
      : stage === 'pause'
        ? 0.8
        : 0.85

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

        {/* Brief pause -- subtle pulsing dots to maintain tension */}
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
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </motion.div>
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
            <p className="mb-3 text-lg text-white/50">
              {entrant1Name} vs {entrant2Name}
            </p>
            <motion.p
              className="text-4xl font-bold text-white md:text-5xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 150,
                damping: 12,
                delay: 0.2,
              }}
              style={{
                textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
              }}
            >
              And the winner is...
            </motion.p>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  )
}
