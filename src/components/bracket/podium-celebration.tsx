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

// Brand colors for confetti (oklch approximated to hex for canvas-confetti)
const BRAND_CONFETTI_COLORS = [
  '#4A90D9', // brand-blue
  '#D4A843', // brand-amber
  '#FFFFFF', // white
  '#3B7ACC', // brand-blue-dark
  '#C09A2E', // brand-amber-dark
]

/**
 * Full-screen top-3 podium celebration for predictive bracket reveal.
 *
 * Displays a "PREDICTION CHAMPIONS" header with three podium blocks:
 * - 2nd place (left, shorter)
 * - 1st place (center, tallest)
 * - 3rd place (right, shortest)
 *
 * Staggered dramatic reveal order: 3rd (delay 0.5s), 2nd (delay 1.5s), 1st (delay 2.5s).
 * Brand-colored confetti burst when 1st place fully enters.
 * Auto-dismisses after 14 seconds. Respects prefers-reduced-motion.
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

  // Brand-colored confetti bursts after 1st place reveals
  useEffect(() => {
    const defaults = {
      disableForReducedMotion: true,
      colors: BRAND_CONFETTI_COLORS,
    }

    // Center burst after 1st place entrance (delay 2.5s + animation ~0.6s)
    const centerTimer = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 120,
        spread: 80,
        origin: { x: 0.5, y: 0.55 },
        startVelocity: 45,
      })
    }, 3200)

    // Left burst
    const leftTimer = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 60,
        spread: 55,
        origin: { x: 0.2, y: 0.6 },
        angle: 60,
      })
    }, 3500)

    // Right burst
    const rightTimer = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 60,
        spread: 55,
        origin: { x: 0.8, y: 0.6 },
        angle: 120,
      })
    }, 3800)

    // Second wave for sustained celebration
    const wave2Timer = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 80,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        startVelocity: 35,
        gravity: 0.8,
      })
    }, 4500)

    // Auto-dismiss after 14 seconds (longer for staggered entries)
    dismissTimerRef.current = setTimeout(handleDismiss, 14000)

    return () => {
      clearTimeout(centerTimer)
      clearTimeout(leftTimer)
      clearTimeout(rightTimer)
      clearTimeout(wave2Timer)
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }
    }
  }, [handleDismiss])

  // Find each rank entry (may have fewer than 3 participants)
  const first = top3.find((e) => e.rank === 1)
  const second = top3.find((e) => e.rank === 2)
  const third = top3.find((e) => e.rank === 3)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85"
      role="dialog"
      aria-label="Prediction Champions"
    >
      {/* Ambient glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1.5 }}
      >
        <div
          className="h-64 w-64 rounded-full blur-[100px] md:h-80 md:w-80"
          style={{ background: 'radial-gradient(circle, var(--brand-amber) 0%, transparent 70%)' }}
        />
      </motion.div>

      {/* Header */}
      <motion.h1
        className="mb-3 text-3xl font-bold uppercase tracking-widest text-brand-amber md:text-4xl"
        initial={prefersReducedMotion ? {} : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 150,
          damping: 12,
          delay: 0.2,
        }}
        style={{
          textShadow: '0 0 30px var(--brand-amber), 0 0 60px color-mix(in oklch, var(--brand-amber) 40%, transparent)',
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

      {/* Podium arrangement: 2nd (left), 1st (center), 3rd (right)
          Dramatic reveal order: 3rd first, then 2nd, then 1st */}
      <div className="flex items-end gap-3 md:gap-6">
        {/* 2nd place - left (reveals second) */}
        {second && (
          <PodiumBlock
            entry={second}
            heightClass="h-24"
            accentClass="bg-brand-blue"
            textAccentClass="text-brand-blue"
            delay={1.5}
            reducedMotion={!!prefersReducedMotion}
          />
        )}

        {/* 1st place - center (reveals last for maximum drama) */}
        {first && (
          <PodiumBlock
            entry={first}
            heightClass="h-32"
            accentClass="bg-brand-amber"
            textAccentClass="text-brand-amber"
            delay={2.5}
            reducedMotion={!!prefersReducedMotion}
            isFirst
          />
        )}

        {/* 3rd place - right (reveals first) */}
        {third && (
          <PodiumBlock
            entry={third}
            heightClass="h-20"
            accentClass="bg-brand-blue-light dark:bg-brand-blue-dark"
            textAccentClass="text-brand-blue-dark dark:text-brand-blue-light"
            delay={0.5}
            reducedMotion={!!prefersReducedMotion}
          />
        )}
      </div>

      {/* Continue button */}
      <motion.button
        type="button"
        onClick={handleDismiss}
        className="mt-10 rounded-xl bg-brand-blue/30 px-8 py-3 text-lg font-medium text-white backdrop-blur-sm transition-colors hover:bg-brand-blue/50"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.5, duration: 0.4 }}
      >
        Continue
      </motion.button>
    </div>
  )
}

function PodiumBlock({
  entry,
  heightClass,
  accentClass,
  textAccentClass,
  delay,
  reducedMotion,
  isFirst = false,
}: {
  entry: PodiumEntry
  heightClass: string
  accentClass: string
  textAccentClass: string
  delay: number
  reducedMotion: boolean
  isFirst?: boolean
}) {
  return (
    <motion.div
      className="flex w-28 flex-col items-center md:w-36"
      initial={reducedMotion ? {} : { y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 160,
        damping: 14,
        delay,
      }}
    >
      {/* Rank badge */}
      <div className="mb-2">
        {isFirst ? (
          <motion.div
            initial={reducedMotion ? {} : { scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 10,
              delay: delay + 0.3,
            }}
          >
            <Trophy className="h-9 w-9 text-brand-amber drop-shadow-md" />
          </motion.div>
        ) : (
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${accentClass}`}>
            {entry.rank}
          </span>
        )}
      </div>

      {/* Name */}
      <p className={`mb-1 w-full truncate text-center text-sm font-semibold md:text-base ${isFirst ? 'text-brand-amber' : 'text-white'}`}>
        {entry.name}
      </p>

      {/* Points */}
      <p className="mb-2 text-xs text-white/70">
        {entry.points} pts ({entry.correctPicks} correct)
      </p>

      {/* Podium block - rises up from bottom */}
      <motion.div
        className={`w-full rounded-t-lg ${accentClass} ${heightClass}`}
        initial={reducedMotion ? {} : { scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{
          type: 'spring',
          stiffness: 120,
          damping: 15,
          delay: delay + 0.15,
        }}
        style={{ transformOrigin: 'bottom' }}
      >
        {/* Rank number on podium */}
        <div className="flex h-full items-center justify-center">
          <span className={`text-2xl font-black md:text-3xl ${isFirst ? 'text-brand-amber-dark' : textAccentClass} opacity-30`}>
            {entry.rank}
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
