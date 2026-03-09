'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'motion/react'

interface NameViewToggleProps {
  value: 'fun' | 'real'
  onChange: (v: 'fun' | 'real') => void
  savedDefault?: 'fun' | 'real'
  onSetDefault?: (v: 'fun' | 'real') => Promise<void>
}

export function NameViewToggle({
  value,
  onChange,
  savedDefault,
  onSetDefault,
}: NameViewToggleProps) {
  const [showToast, setShowToast] = useState(false)
  const [toastLabel, setToastLabel] = useState('')

  const showSetDefault =
    onSetDefault && savedDefault !== undefined && value !== savedDefault

  const handleSetDefault = async () => {
    if (!onSetDefault) return
    const label = value === 'fun' ? 'Fun' : 'Real'
    await onSetDefault(value)
    setToastLabel(label)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <div className="relative flex flex-col items-end gap-0.5">
      <div className="flex rounded-md border bg-muted p-0.5">
        <button
          type="button"
          onClick={() => onChange('fun')}
          className={cn(
            'rounded-sm px-2 py-0.5 text-xs font-medium transition-colors',
            value === 'fun'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Fun
        </button>
        <button
          type="button"
          onClick={() => onChange('real')}
          className={cn(
            'rounded-sm px-2 py-0.5 text-xs font-medium transition-colors',
            value === 'real'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Real
        </button>
      </div>

      {showSetDefault && (
        <button
          type="button"
          onClick={handleSetDefault}
          className="text-xs text-muted-foreground underline cursor-pointer hover:text-foreground transition-colors"
        >
          Set as default
        </button>
      )}

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full right-0 mt-1 whitespace-nowrap rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-800 shadow-sm"
          >
            Default set to {toastLabel} view
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
