'use client'

import { useEffect, useCallback } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import confetti from 'canvas-confetti'

interface CelebrationScreenProps {
  championName: string
  bracketName: string
  onDismiss: () => void
  isTie?: boolean
  tiedNames?: string[]
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
 * Full celebration screen for the bracket champion.
 *
 * Displays a trophy, champion name, and bracket name with multi-wave
 * brand-colored confetti bursts. Enhanced winner name display with
 * scale-up spring animation and ambient glow effect.
 *
 * Dismisses on Continue button click only.
 * Respects prefers-reduced-motion.
 */
export function CelebrationScreen({
  championName,
  bracketName,
  onDismiss,
  isTie = false,
  tiedNames = [],
}: CelebrationScreenProps) {
  const prefersReducedMotion = useReducedMotion()

  const handleDismiss = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  // Multi-wave confetti bursts on mount
  useEffect(() => {
    const defaults = {
      disableForReducedMotion: true,
      colors: BRAND_CONFETTI_COLORS,
    }

    // Wave 1: Initial center burst
    confetti({
      ...defaults,
      particleCount: 120,
      spread: 80,
      origin: { x: 0.5, y: 0.6 },
      startVelocity: 45,
    })

    // Wave 1: Left burst after 300ms
    const leftTimer1 = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 70,
        spread: 60,
        origin: { x: 0.15, y: 0.65 },
        angle: 60,
      })
    }, 300)

    // Wave 1: Right burst after 500ms
    const rightTimer1 = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 70,
        spread: 60,
        origin: { x: 0.85, y: 0.65 },
        angle: 120,
      })
    }, 500)

    // Wave 2: Delayed secondary burst for sustained celebration
    const centerTimer2 = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 80,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        startVelocity: 35,
        gravity: 0.8,
      })
    }, 1800)

    // Wave 2: Left side
    const leftTimer2 = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 50,
        spread: 50,
        origin: { x: 0.25, y: 0.55 },
        angle: 75,
      })
    }, 2200)

    // Wave 2: Right side
    const rightTimer2 = setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 50,
        spread: 50,
        origin: { x: 0.75, y: 0.55 },
        angle: 105,
      })
    }, 2500)

    return () => {
      clearTimeout(leftTimer1)
      clearTimeout(rightTimer1)
      clearTimeout(centerTimer2)
      clearTimeout(leftTimer2)
      clearTimeout(rightTimer2)
    }
  }, [handleDismiss])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
      role="dialog"
      aria-label={isTie ? `Co-Champions: ${tiedNames.join(', ')}` : `Champion: ${championName}`}
    >
      {/* Ambient glow effect behind content */}
      <motion.div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 1 }}
      >
        <div
          className="h-64 w-64 rounded-full blur-[100px] md:h-96 md:w-96"
          style={{ background: 'radial-gradient(circle, var(--brand-amber) 0%, transparent 70%)' }}
        />
      </motion.div>

      {/* Trophy icon */}
      <motion.div
        className="relative mb-6 text-8xl"
        initial={prefersReducedMotion ? {} : { scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 180,
          damping: 10,
          delay: 0.2,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-24 w-24 text-brand-amber drop-shadow-lg md:h-32 md:w-32"
          aria-hidden="true"
        >
          <path d="M5 3h14a1 1 0 011 1v2a5 5 0 01-3 4.584V13a5 5 0 01-4 4.9V20h2a1 1 0 110 2H9a1 1 0 110-2h2v-2.1A5 5 0 017 13v-2.416A5 5 0 014 6V4a1 1 0 011-1zm0 2v1a3 3 0 002 2.83V5H5zm14 0h-2v3.83A3 3 0 0019 6V5zm-4 0H9v8a3 3 0 006 0V5z" />
        </svg>
        {/* Sparkle effects around trophy */}
        <motion.div
          className="absolute -right-2 -top-2 h-3 w-3 rounded-full bg-brand-amber"
          animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
        />
        <motion.div
          className="absolute -left-1 top-4 h-2 w-2 rounded-full bg-brand-amber-light"
          animate={{ scale: [0, 1, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 0.8 }}
        />
        <motion.div
          className="absolute -right-3 bottom-6 h-2.5 w-2.5 rounded-full bg-brand-blue"
          animate={{ scale: [0, 1.1, 0], opacity: [0, 0.9, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: 1.1 }}
        />
      </motion.div>

      {/* CHAMPION text */}
      <motion.h1
        className="mb-4 text-4xl font-extrabold uppercase tracking-widest text-brand-amber md:text-6xl"
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
            '0 0 30px var(--brand-amber), 0 0 60px color-mix(in oklch, var(--brand-amber) 40%, transparent)',
        }}
      >
        {isTie ? 'CO-CHAMPIONS!' : 'CHAMPION!'}
      </motion.h1>

      {/* Champion name -- dramatic scale-up spring entrance */}
      <motion.p
        className="relative mb-3 text-3xl font-bold text-white md:text-5xl"
        initial={prefersReducedMotion ? {} : { scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 120,
          damping: 8,
          delay: 0.7,
        }}
      >
        {isTie && tiedNames.length > 0
          ? (tiedNames.length <= 3
              ? tiedNames.join(' & ')
              : tiedNames.slice(0, -1).join(', ') + ' & ' + tiedNames[tiedNames.length - 1])
          : championName}
      </motion.p>

      {/* Bracket name */}
      <motion.p
        className="mb-10 text-lg text-white/60 md:text-xl"
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.4 }}
      >
        {bracketName}
      </motion.p>

      {/* Continue button */}
      <motion.button
        type="button"
        onClick={handleDismiss}
        className="rounded-xl bg-brand-blue/30 px-8 py-3 text-lg font-medium text-white backdrop-blur-sm transition-colors hover:bg-brand-blue/50"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.4 }}
      >
        Continue
      </motion.button>
    </div>
  )
}
