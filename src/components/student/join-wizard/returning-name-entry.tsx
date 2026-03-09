'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { lookupStudentByFirstName } from '@/actions/student'
import { validateFirstName } from '@/lib/validations/first-name'
import { getStoredIdentity } from '@/lib/student/identity-store'
import type { LookupResult, DuplicateCandidate } from '@/types/student'

interface ReturningNameEntryProps {
  code: string
  sessionId: string
  onSingleMatch: (candidate: DuplicateCandidate, firstName: string) => void
  onMultipleMatches: (candidates: DuplicateCandidate[], firstName: string) => void
  onAutoReclaim: (result: LookupResult) => void
  onRedirectNew: () => void
}

export function ReturningNameEntry({
  code,
  sessionId,
  onSingleMatch,
  onMultipleMatches,
  onAutoReclaim,
  onRedirectNew,
}: ReturningNameEntryProps) {
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [impersonationWarning, setImpersonationWarning] = useState<string | null>(null)

  const firstNameRef = useRef<HTMLInputElement>(null)

  // Auto-focus on first name input after 400ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      firstNameRef.current?.focus()
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  const canSubmit = firstName.trim().length > 0

  // Impersonation guard: check if student already in session under different name
  useEffect(() => {
    const stored = getStoredIdentity(sessionId)
    if (
      stored &&
      firstName.trim().length > 0 &&
      stored.firstName &&
      stored.firstName.toLowerCase() !== firstName.trim().toLowerCase()
    ) {
      setImpersonationWarning(
        `You're already in this session as ${stored.funName}. Looking up a different name?`
      )
    } else {
      setImpersonationWarning(null)
    }
  }, [firstName, sessionId])

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || loading) return

    // Client-side validation
    const validation = validateFirstName(firstName)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    setError(null)
    setIsNew(false)
    setLoading(true)

    try {
      const result = await lookupStudentByFirstName({
        code,
        firstName: firstName.trim(),
      })

      if (result.sessionEnded) {
        setError('This session has ended')
        setLoading(false)
        return
      }

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      if (result.isNew) {
        setIsNew(true)
        setLoading(false)
        return
      }

      // Already in current session (auto-reclaim)
      if (result.participant) {
        onAutoReclaim(result)
        return
      }

      // Single match -- confirmation card
      if (result.candidates?.length === 1) {
        onSingleMatch(result.candidates[0], firstName.trim())
        return
      }

      // Multiple matches -- disambiguation
      if (result.candidates && result.candidates.length > 1) {
        onMultipleMatches(result.candidates, firstName.trim())
        return
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [canSubmit, loading, firstName, code, onSingleMatch, onMultipleMatches, onAutoReclaim])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <p className="text-2xl font-bold">Welcome back!</p>
      <p className="text-sm text-muted-foreground">
        Enter your first name so we can find you
      </p>

      <div className="flex w-full flex-col items-center gap-3">
        {/* First name input */}
        <input
          ref={firstNameRef}
          type="text"
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value)
            setError(null)
            setIsNew(false)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Your first name"
          className="w-full rounded-xl border-2 px-4 py-3 text-center text-2xl font-semibold outline-none transition-colors focus:border-primary"
          autoComplete="off"
        />
      </div>

      {/* Impersonation warning */}
      {impersonationWarning && (
        <p className="text-center text-xs font-medium text-amber-600">
          {impersonationWarning}
        </p>
      )}

      {/* Error display */}
      {error && (
        <p className="text-center text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {/* "Not found" message with redirect to new student */}
      {isNew && (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-4">
          <p className="text-center text-sm text-muted-foreground">
            We couldn&apos;t find you. Would you like to join as a new student?
          </p>
          <button
            type="button"
            onClick={onRedirectNew}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Join as new student
          </button>
          <button
            type="button"
            onClick={() => {
              setIsNew(false)
              setFirstName('')
              setTimeout(() => firstNameRef.current?.focus(), 100)
            }}
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            Oops, I misspelled my name -- try again
          </button>
        </div>
      )}

      {/* Submit button */}
      <AnimatePresence>
        {canSubmit && !isNew && (
          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 rounded-xl bg-green-500 px-8 py-3 text-lg font-bold text-white shadow-md transition-colors hover:bg-green-600 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Looking...
              </>
            ) : (
              'Find me'
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
