'use client'

import { motion } from 'motion/react'

interface PathSelectorProps {
  onSelectNew: () => void
  onSelectReturning: () => void
}

export function PathSelector({ onSelectNew, onSelectReturning }: PathSelectorProps) {
  return (
    <div className="flex flex-col gap-4">
      <motion.button
        type="button"
        className="rounded-2xl bg-brand-blue p-6 text-center text-xl font-bold text-white shadow-md"
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02 }}
        onClick={onSelectNew}
      >
        I&apos;m new here!
      </motion.button>

      <motion.button
        type="button"
        className="rounded-2xl border-2 border-muted p-6 text-center text-xl font-bold shadow-sm"
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02 }}
        onClick={onSelectReturning}
      >
        I&apos;ve been here before
      </motion.button>
    </div>
  )
}
