'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

interface WinnerRevealProps {
  winnerName: string
  entrant1Name: string
  entrant2Name: string
  onComplete: () => void
  showVoteCounts?: boolean
  entrant1Votes?: number
  entrant2Votes?: number
}

/**
 * Dramatic countdown + winner announcement overlay.
 *
 * Animation sequence:
 * 1. Full-screen overlay fades in
 * 2. Countdown: 3... 2... 1...
 * 3. "And the winner is..." text fades in
 * 4. Brief suspenseful pause
 * 5. Winner name with scale-up + glow animation
 * 6. Optional vote count display
 * 7. Auto-dismisses after 3 seconds, or click/tap to dismiss early
 */
export function WinnerReveal({
  winnerName,
  entrant1Name,
  entrant2Name,
  onComplete,
  showVoteCounts = false,
  entrant1Votes = 0,
  entrant2Votes = 0,
}: WinnerRevealProps) {
  const prefersReducedMotion = useReducedMotion()
  const [stage, setStage] = useState<'countdown' | 'reveal' | 'winner' | 'done'>(
    prefersReducedMotion ? 'winner' : 'countdown'
  )
  const [countdownNumber, setCountdownNumber] = useState(3)

  const dismiss = useCallback(() => {
    setStage('done')
    onComplete()
  }, [onComplete])

  // Countdown sequence: 3, 2, 1, then reveal
  useEffect(() => {
    if (prefersReducedMotion) return

    if (stage === 'countdown') {
      if (countdownNumber > 0) {
        const timer = setTimeout(() => {
          setCountdownNumber((n) => n - 1)
        }, 1100) // Allow enough time for enter + display + exit animations
        return () => clearTimeout(timer)
      } else {
        // Countdown done, move to reveal text
        setStage('reveal')
      }
    }
  }, [stage, countdownNumber, prefersReducedMotion])

  // "And the winner is..." -> winner name after delay
  useEffect(() => {
    if (stage === 'reveal') {
      const timer = setTimeout(() => {
        setStage('winner')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [stage])

  // Auto-dismiss after showing winner
  useEffect(() => {
    if (stage === 'winner') {
      const timer = setTimeout(dismiss, 3000)
      return () => clearTimeout(timer)
    }
  }, [stage, dismiss])

  // Reduced motion: show result immediately, auto-dismiss
  if (prefersReducedMotion) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70"
        onClick={dismiss}
        role="dialog"
        aria-label={`Winner: ${winnerName}`}
      >
        <p className="mb-2 text-lg text-white/80">
          {entrant1Name} vs {entrant2Name}
        </p>
        <p className="text-5xl font-bold text-primary md:text-7xl">{winnerName}</p>
        {showVoteCounts && (
          <p className="mt-4 text-lg text-white/80">
            {entrant1Votes} votes to {entrant2Votes}
          </p>
        )}
        <p className="mt-6 text-sm text-white/50">Tap anywhere to continue</p>
      </div>
    )
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={dismiss}
      role="dialog"
      aria-label={`Winner reveal: ${winnerName}`}
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

        {/* Winner name */}
        {stage === 'winner' && (
          <motion.div
            key="winner"
            className="text-center"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 150,
              damping: 12,
              duration: 0.7,
            }}
          >
            <p className="mb-3 text-lg text-white/60">Winner</p>
            <p
              className="text-5xl font-bold text-primary md:text-7xl"
              style={{
                textShadow: '0 0 40px color-mix(in oklch, var(--primary) 50%, transparent), 0 0 80px color-mix(in oklch, var(--primary) 30%, transparent)',
              }}
            >
              {winnerName}
            </p>
            {showVoteCounts && (
              <motion.p
                className="mt-6 text-lg text-white/80"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                {entrant1Votes} votes to {entrant2Votes}
              </motion.p>
            )}
            <motion.p
              className="mt-8 text-sm text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Tap anywhere to continue
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
