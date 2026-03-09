'use client'

import { motion } from 'motion/react'

interface WizardHeaderProps {
  funName: string
}

export function WizardHeader({ funName }: WizardHeaderProps) {
  return (
    <motion.div
      className="rounded-lg bg-muted/50 px-4 py-2 text-center text-sm"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      Your name: <span className="font-bold">{funName}</span>
    </motion.div>
  )
}
