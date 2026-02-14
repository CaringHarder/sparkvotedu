'use client'

import { useEffect, useCallback, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import confetti from 'canvas-confetti'
import { Trophy } from 'lucide-react'

interface PodiumEntry {
  rank: 1 | 2 | 3
  name: string
  points: number
  correctPicks: number
}

interface PodiumCelebrationProps {
  top3: PodiumEntry[]
  bracketName: string
  onDismiss: () => void
}

/**
 * Full-screen top-3 podium celebration for predictive bracket reveal.
 *
 * Displays a "PREDICTION CHAMPIONS" header with three podium blocks:
 * - 2nd place (left, shorter)
 * - 1st place (center, tallest)
 * - 3rd place (right, shortest)
 *
 * Staggered entrance: 3rd (delay 0), 2nd (delay 0.5s), 1st (delay 1s).
 * Confetti burst after 1st place reveals.
 * Auto-dismisses after 12 seconds. Respects prefers-reduced-motion.
 *
 * Follows CelebrationScreen pattern from 04-06.
 */
export function PodiumCelebration({ top3, bracketName, onDismiss }: PodiumCelebrationProps) {
  const prefersReducedMotion = useReducedMotion()
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
    }
    onDismiss()
  }, [onDismiss])

  // Confetti bursts after 1st place reveals (delay 1s + entrance animation ~0.5s)
  useEffect(() => {
    const defaults = {
      disableForReducedMotion: true,
    }

    // Center burst after 1st place entrance
    const centerTimer = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 100,
        spread: 70,
        origin: { x: 0.5, y: 0.6 },
      })
    }, 1500)

    // Left burst
    const leftTimer = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 60,
        spread: 55,
        origin: { x: 0.2, y: 0.65 },
        angle: 60,
      })
    }, 1800)

    // Right burst
    const rightTimer = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 60,
        spread: 55,
        origin: { x: 0.8, y: 0.65 },
        angle: 120,
      })
    }, 2100)

    // Auto-dismiss after 12 seconds
    dismissTimerRef.current = setTimeout(handleDismiss, 12000)

    return () => {
      clearTimeout(centerTimer)
      clearTimeout(leftTimer)
      clearTimeout(rightTimer)
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }
    }
  }, [handleDismiss])

  // Find each rank entry (may have fewer than 3 participants)
  const first = top3.find((e) => e.rank === 1)
  const second = top3.find((e) => e.rank === 2)
  const third = top3.find((e) => e.rank === 3)

  // Podium height proportions
  const podiumHeights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' } as const

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80"
      role="dialog"
      aria-label="Prediction Champions"
    >
      {/* Header */}
      <motion.h1
        className="mb-8 text-3xl font-bold uppercase tracking-widest text-white md:text-4xl"
        initial={prefersReducedMotion ? {} : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 150,
          damping: 12,
          delay: 0.2,
        }}
        style={{
          textShadow: '0 0 30px rgba(250, 204, 21, 0.5), 0 0 60px rgba(250, 204, 21, 0.3)',
        }}
      >
        PREDICTION CHAMPIONS
      </motion.h1>

      {/* Bracket name */}
      <motion.p
        className="mb-8 text-lg text-white/60"
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        {bracketName}
      </motion.p>

      {/* Podium arrangement: 2nd (left), 1st (center), 3rd (right) */}
      <div className="flex items-end gap-3 md:gap-6">
        {/* 2nd place - left */}
        {second && (
          <PodiumBlock
            entry={second}
            height={podiumHeights[2]}
            bgAccent="bg-gray-300 dark:bg-gray-500"
            delay={0.5}
            reducedMotion={!!prefersReducedMotion}
          />
        )}

        {/* 1st place - center */}
        {first && (
          <PodiumBlock
            entry={first}
            height={podiumHeights[1]}
            bgAccent="bg-amber-400"
            delay={1}
            reducedMotion={!!prefersReducedMotion}
          />
        )}

        {/* 3rd place - right */}
        {third && (
          <PodiumBlock
            entry={third}
            height={podiumHeights[3]}
            bgAccent="bg-amber-600"
            delay={0}
            reducedMotion={!!prefersReducedMotion}
          />
        )}
      </div>

      {/* Continue button */}
      <motion.button
        type="button"
        onClick={handleDismiss}
        className="mt-10 rounded-lg bg-white/20 px-8 py-3 text-lg font-medium text-white backdrop-blur transition-colors hover:bg-white/30"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.4 }}
      >
        Continue
      </motion.button>
    </div>
  )
}

function PodiumBlock({
  entry,
  height,
  bgAccent,
  delay,
  reducedMotion,
}: {
  entry: PodiumEntry
  height: string
  bgAccent: string
  delay: number
  reducedMotion: boolean
}) {
  return (
    <motion.div
      className="flex w-28 flex-col items-center md:w-36"
      initial={reducedMotion ? {} : { y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
        delay,
      }}
    >
      {/* Rank badge */}
      <div className="mb-2">
        {entry.rank === 1 ? (
          <Trophy className="h-8 w-8 text-amber-400" />
        ) : (
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${bgAccent}`}>
            {entry.rank}
          </span>
        )}
      </div>

      {/* Name */}
      <p className="mb-1 truncate text-center text-sm font-semibold text-white md:text-base">
        {entry.name}
      </p>

      {/* Points */}
      <p className="mb-2 text-xs text-white/70">
        {entry.points} pts ({entry.correctPicks} correct)
      </p>

      {/* Podium block */}
      <div className={`w-full rounded-t-lg ${bgAccent} ${height}`} />
    </motion.div>
  )
}
