'use client'

import { useEffect } from 'react'
import { motion } from 'motion/react'

interface WizardWelcomeProps {
  funName: string
  emojiChar: string
  firstName: string
  onComplete: () => void
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}

export function WizardWelcome({
  funName,
  emojiChar,
  firstName,
  onComplete,
}: WizardWelcomeProps) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 3000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      className="flex min-h-[300px] flex-col items-center justify-center gap-4 py-8 text-center"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div className="text-6xl" variants={fadeInUp}>
        {emojiChar}
      </motion.div>

      <motion.h2 className="text-2xl font-bold" variants={fadeInUp}>
        Welcome, {firstName}!
      </motion.h2>

      <motion.p
        className="text-lg text-muted-foreground"
        variants={fadeInUp}
      >
        Your class name is <span className="font-bold">{funName}</span>
      </motion.p>
    </motion.div>
  )
}
