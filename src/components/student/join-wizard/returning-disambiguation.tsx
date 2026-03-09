'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { claimReturningIdentity } from '@/actions/student'
import { shortcodeToEmoji } from '@/lib/student/emoji-pool'
import type { DuplicateCandidate, LookupResult } from '@/types/student'

interface ReturningDisambiguationProps {
  candidates: DuplicateCandidate[]
  firstName: string
  lastInitial: string
  code: string
  onClaimed: (result: LookupResult) => void
  onNoneOfThese: () => void
}

export function ReturningDisambiguation({
  candidates,
  firstName,
  lastInitial,
  code,
  onClaimed,
  onNoneOfThese,
}: ReturningDisambiguationProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = async (candidate: DuplicateCandidate) => {
    if (loading) return

    setLoading(candidate.id)
    setError(null)

    try {
      const result = await claimReturningIdentity({
        participantId: candidate.id,
        sessionCode: code,
        firstName,
        lastInitial,
      })

      if (result.error) {
        setError(result.error)
        setLoading(null)
        return
      }

      onClaimed(result)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <p className="text-2xl font-bold">Which one is you?</p>

      <div className="flex w-full flex-col gap-3">
        {candidates.map((candidate) => {
          const emojiChar = candidate.emoji
            ? shortcodeToEmoji(candidate.emoji)
            : null
          const isLoading = loading === candidate.id
          const isDisabled = loading !== null && !isLoading

          return (
            <motion.button
              key={candidate.id}
              type="button"
              onClick={() => handleSelect(candidate)}
              disabled={isDisabled || isLoading}
              whileTap={{ scale: 0.97 }}
              className="flex w-full items-center gap-4 rounded-2xl border-2 p-4 transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
            >
              {/* Emoji or placeholder */}
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-3xl">
                {emojiChar ?? (
                  <span className="h-8 w-8 rounded-full bg-muted-foreground/20" />
                )}
              </span>

              {/* Fun name */}
              <span className="flex-1 text-left text-lg font-semibold">
                {candidate.funName}
              </span>

              {/* Loading indicator */}
              {isLoading && (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Error display */}
      {error && (
        <p className="text-center text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {/* None of these */}
      <button
        type="button"
        onClick={onNoneOfThese}
        disabled={loading !== null}
        className="text-sm text-muted-foreground underline transition-colors hover:text-foreground disabled:opacity-50"
      >
        None of these are me
      </button>
    </div>
  )
}
