'use client'

import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { EMOJI_POOL } from '@/lib/student/emoji-pool'
import { setParticipantEmoji } from '@/actions/student'

const MIGRATION_EMOJIS = EMOJI_POOL.slice(0, 16)

interface EmojiMigrationProps {
  participantId: string
  funName: string
  sessionId: string
  onComplete: (emoji: string) => void
}

export function EmojiMigration({
  participantId,
  funName,
  sessionId: _sessionId,
  onComplete,
}: EmojiMigrationProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTap = (shortcode: string) => {
    if (selected) return // prevent double-tap
    setSelected(shortcode)

    timerRef.current = setTimeout(async () => {
      const result = await setParticipantEmoji(participantId, shortcode)
      if (result.success) {
        onComplete(shortcode)
      } else {
        // On error, allow retry
        setSelected(null)
      }
    }, 600)
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-4 py-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Pick Your Emoji!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose an emoji that represents you
        </p>
        <p className="mt-2 text-base font-medium">{funName}</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {MIGRATION_EMOJIS.map((entry) => (
          <motion.button
            key={entry.shortcode}
            type="button"
            onClick={() => handleTap(entry.shortcode)}
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
                &#10003;
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
