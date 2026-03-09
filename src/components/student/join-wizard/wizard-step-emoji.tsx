'use client'

import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { EMOJI_POOL } from '@/lib/student/emoji-pool'

const WIZARD_EMOJIS = EMOJI_POOL.slice(0, 16)

interface WizardStepEmojiProps {
  onSelect: (shortcode: string, emojiChar: string) => void
}

export function WizardStepEmoji({ onSelect }: WizardStepEmojiProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTap = (shortcode: string, emoji: string) => {
    if (selected) return // prevent double-tap
    setSelected(shortcode)

    timerRef.current = setTimeout(() => {
      onSelect(shortcode, emoji)
    }, 600)
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <h2 className="text-2xl font-bold">Pick your emoji!</h2>

      <div className="grid grid-cols-4 gap-3">
        {WIZARD_EMOJIS.map((entry) => (
          <motion.button
            key={entry.shortcode}
            type="button"
            onClick={() => handleTap(entry.shortcode, entry.emoji)}
            disabled={selected !== null && selected !== entry.shortcode}
            className="relative flex h-14 w-14 items-center justify-center rounded-xl text-3xl transition-colors hover:bg-muted/50 active:bg-muted disabled:opacity-40"
            whileTap={{ scale: 1.2 }}
            aria-label={entry.label}
          >
            {entry.emoji}

            {selected === entry.shortcode && (
              <motion.div
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] text-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                ✓
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
