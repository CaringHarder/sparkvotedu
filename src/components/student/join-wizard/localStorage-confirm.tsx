'use client'

import { motion } from 'motion/react'
import { shortcodeToEmoji } from '@/lib/student/emoji-pool'
import type { StoredIdentity } from '@/lib/student/identity-store'

interface LocalStorageConfirmProps {
  stored: StoredIdentity
  onConfirm: () => void
  onDeny: () => void
  loading?: boolean
}

export function LocalStorageConfirm({
  stored,
  onConfirm,
  onDeny,
  loading,
}: LocalStorageConfirmProps) {
  const emojiChar = stored.emoji ? shortcodeToEmoji(stored.emoji) ?? '' : ''
  const realName = stored.lastInitial
    ? `${stored.firstName} ${stored.lastInitial}.`
    : stored.firstName

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-lg font-medium text-muted-foreground">
        Is this you?
      </p>

      <div className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-brand-blue/20 bg-brand-blue/5 p-6">
        {emojiChar && (
          <span className="text-5xl" role="img" aria-label={stored.emoji ?? ''}>
            {emojiChar}
          </span>
        )}
        <p className="text-2xl font-bold">{stored.funName}</p>
        <p className="text-sm text-muted-foreground">({realName})</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onConfirm}
          disabled={loading}
          autoFocus
          className="w-full rounded-2xl bg-brand-blue p-4 text-lg font-bold text-white shadow-md disabled:opacity-60"
        >
          {loading ? 'Rejoining...' : "Yes, that's me!"}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onDeny}
          disabled={loading}
          className="w-full rounded-2xl border-2 border-muted p-4 text-lg font-bold shadow-sm"
        >
          Not me
        </motion.button>
      </div>
    </div>
  )
}
