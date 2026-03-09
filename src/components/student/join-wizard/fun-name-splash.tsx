'use client'

import { useEffect } from 'react'
import { motion } from 'motion/react'

interface FunNameSplashProps {
  funName: string
  onComplete: () => void
}

export function FunNameSplash({ funName, onComplete }: FunNameSplashProps) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 2500)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-6 py-8 text-center">
      <motion.p
        className="text-xl text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        You are...
      </motion.p>

      <motion.p
        className="text-4xl font-bold"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: 0.6,
          type: 'spring',
          stiffness: 200,
          damping: 12,
        }}
      >
        {funName}
      </motion.p>

      <motion.div
        className="mt-4 text-4xl"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: 1.0,
          type: 'spring',
          stiffness: 180,
          damping: 10,
        }}
      >
        ✨
      </motion.div>
    </div>
  )
}
