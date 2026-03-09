'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { lookupStudent } from '@/actions/student'
import { validateFirstName } from '@/lib/validations/first-name'
import type { LookupResult } from '@/types/student'

interface ReturningNameEntryProps {
  code: string
  onResult: (result: LookupResult) => void
  onRedirectNew: () => void
}

export function ReturningNameEntry({ code, onResult, onRedirectNew }: ReturningNameEntryProps) {
  const [firstName, setFirstName] = useState('')
  const [lastInitial, setLastInitial] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)

  const firstNameRef = useRef<HTMLInputElement>(null)
  const lastInitialRef = useRef<HTMLInputElement>(null)

  // Auto-focus on first name input after 400ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      firstNameRef.current?.focus()
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  const canSubmit = firstName.trim().length > 0 && lastInitial.trim().length > 0

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
      const result = await lookupStudent({
        code,
        firstName: firstName.trim(),
        lastInitial: lastInitial.trim().toUpperCase(),
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

      // Single match (auto-reclaimed) or multiple matches (candidates)
      onResult(result)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [canSubmit, loading, firstName, lastInitial, code, onResult])

  const handleFirstNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      lastInitialRef.current?.focus()
    }
  }

  const handleLastInitialKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <p className="text-2xl font-bold">Welcome back!</p>
      <p className="text-sm text-muted-foreground">
        Enter your name so we can find you
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
          onKeyDown={handleFirstNameKeyDown}
          placeholder="Your first name"
          className="w-full rounded-xl border-2 px-4 py-3 text-center text-2xl font-semibold outline-none transition-colors focus:border-primary"
          autoComplete="off"
        />

        {/* Last initial input */}
        <input
          ref={lastInitialRef}
          type="text"
          value={lastInitial}
          onChange={(e) => {
            const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '')
            setLastInitial(val)
            setError(null)
            setIsNew(false)
          }}
          onKeyDown={handleLastInitialKeyDown}
          placeholder="Last initial (A-Z)"
          maxLength={2}
          className="max-w-[120px] rounded-xl border-2 px-4 py-3 text-center text-2xl font-semibold outline-none transition-colors focus:border-primary"
          autoComplete="off"
        />
      </div>

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
