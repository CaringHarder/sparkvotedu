'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { validateFirstName } from '@/lib/validations/first-name'

interface WizardStepFirstNameProps {
  onSubmit: (firstName: string) => void
}

export function WizardStepFirstName({ onSubmit }: WizardStepFirstNameProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus after 400ms (wait for slide animation)
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 400)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = useCallback(() => {
    const result = validateFirstName(value)
    if (result.valid) {
      setError(null)
      onSubmit(result.name)
    } else {
      setError(result.error)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }, [value, onSubmit])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.length > 0) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <h2 className="text-2xl font-bold">What&apos;s your first name?</h2>

      <div className={`w-full ${shake ? 'animate-shake' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type your name..."
          className="w-full rounded-xl border-2 px-4 py-3 text-center text-2xl font-semibold outline-none transition-colors focus:border-primary"
          autoComplete="given-name"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <AnimatePresence>
        {value.length > 0 && (
          <motion.button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-xl bg-green-500 px-6 py-3.5 text-lg font-semibold text-white hover:bg-green-600"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            Continue
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
