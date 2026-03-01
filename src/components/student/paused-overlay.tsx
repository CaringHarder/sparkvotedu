'use client'

import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

interface PausedOverlayProps {
  visible: boolean
}

/**
 * Full-screen cooking-themed pause overlay for student views.
 *
 * Shows a playful "Let it cook!" message with an animated bubbling pot
 * and rising steam wisps when a teacher pauses a bracket or poll.
 * The voting UI stays visible but dimmed/blurred underneath.
 *
 * Entry: fade in with slight scale up.
 * Exit: energetic burst (scale up to 1.1 with quick fade out) to signal resume.
 * Reduced motion: simple opacity fade for both entry and exit.
 *
 * Shared by both bracket and poll student views.
 * No click handlers or dismiss buttons -- only the teacher controls this.
 */
export function PausedOverlay({ visible }: PausedOverlayProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="paused-overlay"
          initial={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.95 }
          }
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: 1 }
          }
          exit={
            prefersReducedMotion
              ? { opacity: 0, transition: { duration: 0.2 } }
              : {
                  opacity: 0,
                  scale: 1.1,
                  transition: { duration: 0.3, ease: 'easeOut' },
                }
          }
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          {/* Cooking pot with steam animation */}
          <div className="relative mb-6">
            {/* Steam wisps */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-3">
              <motion.div
                className="h-8 w-2 rounded-full bg-muted-foreground/20"
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        y: [-4, -18, -4],
                        opacity: [0.3, 0.7, 0.3],
                        scaleY: [0.8, 1.2, 0.8],
                      }
                }
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="h-10 w-2 rounded-full bg-muted-foreground/25"
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        y: [-2, -22, -2],
                        opacity: [0.2, 0.6, 0.2],
                        scaleY: [0.9, 1.3, 0.9],
                      }
                }
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.3,
                }}
              />
              <motion.div
                className="h-7 w-2 rounded-full bg-muted-foreground/15"
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        y: [-3, -16, -3],
                        opacity: [0.25, 0.55, 0.25],
                        scaleY: [0.85, 1.15, 0.85],
                      }
                }
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.6,
                }}
              />
            </div>

            {/* Cooking pot SVG */}
            <motion.div
              animate={
                prefersReducedMotion
                  ? {}
                  : {
                      y: [0, -2, 0],
                      rotate: [0, 0.5, 0, -0.5, 0],
                    }
              }
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <svg
                viewBox="0 0 120 100"
                fill="none"
                className="h-28 w-28 md:h-32 md:w-32"
                aria-hidden="true"
              >
                {/* Pot body */}
                <path
                  d="M20 45 C20 45 18 85 25 88 C32 91 88 91 95 88 C102 85 100 45 100 45"
                  className="fill-muted-foreground/20 stroke-muted-foreground"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Pot rim */}
                <ellipse
                  cx="60"
                  cy="45"
                  rx="42"
                  ry="8"
                  className="fill-muted stroke-muted-foreground"
                  strokeWidth="3"
                />
                {/* Left handle */}
                <path
                  d="M18 55 C10 55 8 65 18 65"
                  className="stroke-muted-foreground"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Right handle */}
                <path
                  d="M102 55 C110 55 112 65 102 65"
                  className="stroke-muted-foreground"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Lid */}
                <ellipse
                  cx="60"
                  cy="42"
                  rx="38"
                  ry="6"
                  className="fill-muted-foreground/30 stroke-muted-foreground"
                  strokeWidth="2"
                />
                {/* Lid knob */}
                <circle
                  cx="60"
                  cy="35"
                  r="5"
                  className="fill-muted-foreground/40 stroke-muted-foreground"
                  strokeWidth="2"
                />
              </svg>
            </motion.div>

            {/* Bubbles inside pot (visible through the rim) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              <motion.div
                className="h-2 w-2 rounded-full bg-primary/30"
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        y: [0, -6, 0],
                        scale: [0.8, 1.2, 0.8],
                        opacity: [0.4, 0.8, 0.4],
                      }
                }
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="h-1.5 w-1.5 rounded-full bg-primary/25"
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        y: [0, -8, 0],
                        scale: [0.7, 1.1, 0.7],
                        opacity: [0.3, 0.7, 0.3],
                      }
                }
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
              />
              <motion.div
                className="h-2.5 w-2.5 rounded-full bg-primary/20"
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        y: [0, -5, 0],
                        scale: [0.9, 1.3, 0.9],
                        opacity: [0.35, 0.65, 0.35],
                      }
                }
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.8,
                }}
              />
            </div>
          </div>

          {/* Dual messaging */}
          <motion.h2
            className="text-3xl font-bold tracking-tight md:text-4xl"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            Let it cook!
          </motion.h2>
          <motion.p
            className="mt-2 text-sm text-muted-foreground"
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.3 }}
          >
            Voting will resume soon
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
