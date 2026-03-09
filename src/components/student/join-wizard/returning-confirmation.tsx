'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { claimReturningIdentity } from '@/actions/student'
import { shortcodeToEmoji } from '@/lib/student/emoji-pool'
import type { DuplicateCandidate, LookupResult } from '@/types/student'

interface ReturningConfirmationProps {
  candidate: DuplicateCandidate
  code: string
  firstName: string
  onClaim: (result: LookupResult) => void
  onNoneOfThese: () => void
}

export function ReturningConfirmation({
  candidate,
  code,
  firstName,
  onClaim,
  onNoneOfThese,
}: ReturningConfirmationProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emojiChar = candidate.emoji
    ? shortcodeToEmoji(candidate.emoji)
    : null

  const displayName = candidate.lastInitial
    ? `${firstName} ${candidate.lastInitial}.`
    : firstName

  const handleClaim = async () => {
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const result = await claimReturningIdentity({
        participantId: candidate.id,
        sessionCode: code,
        firstName,
        lastInitial: candidate.lastInitial ?? '',
      })

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      onClaim(result)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <p className="text-2xl font-bold">Welcome back!</p>
      <p className="text-sm text-muted-foreground">Is this you?</p>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-6"
      >
        {/* Emoji */}
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-4xl">
          {emojiChar ?? (
            <span className="h-10 w-10 rounded-full bg-muted-foreground/20" />
          )}
        </span>

        {/* Fun name */}
        <span className="text-xl font-bold">{candidate.funName}</span>

        {/* Real name with last initial */}
        <span className="text-sm text-muted-foreground">{displayName}</span>
      </motion.div>

      {/* Error display */}
      {error && (
        <p className="text-center text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {/* Primary action: That's me! */}
      <button
        type="button"
        onClick={handleClaim}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl bg-green-500 px-8 py-3 text-lg font-bold text-white shadow-md transition-colors hover:bg-green-600 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Joining...
          </>
        ) : (
          "That's me!"
        )}
      </button>

      {/* Secondary action: Not me */}
      <button
        type="button"
        onClick={onNoneOfThese}
        disabled={loading}
        className="text-sm text-muted-foreground underline transition-colors hover:text-foreground disabled:opacity-50"
      >
        Not me -- join as new student
      </button>
    </div>
  )
}
