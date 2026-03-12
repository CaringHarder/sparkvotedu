'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'

interface WizardStepLastInitialProps {
  firstName: string
  onSubmit: (lastInitial: string) => void
}

export function WizardStepLastInitial({
  firstName,
  onSubmit,
}: WizardStepLastInitialProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus after 400ms (wait for slide animation)
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 400)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = useCallback(() => {
    if (value.length > 0) {
      onSubmit(value)
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
      <h2 className="text-2xl font-bold">
        <span className="font-bold underline">Last Name</span>, first letter
      </h2>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) =>
          setValue(
            e.target.value
              .toUpperCase()
              .replace(/[^A-Z]/g, '')
              .slice(0, 2)
          )
        }
        onKeyDown={handleKeyDown}
        placeholder="A-Z"
        maxLength={2}
        className="w-full max-w-[120px] rounded-xl border-2 px-4 py-3 text-center text-2xl font-semibold outline-none transition-colors focus:border-primary"
        autoComplete="off"
      />

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
