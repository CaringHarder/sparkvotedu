'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

const BANNER_KEY = 'sparkvotedu_upgrade_banner_dismissed'

export function UpgradeBanner() {
  const [visible, setVisible] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(BANNER_KEY)) {
        setVisible(true)
      }
    } catch {
      // localStorage unavailable (private browsing, SSR) -- don't show
    }
  }, [])

  const dismiss = useCallback(() => {
    setDismissing(true)

    // Allow the fade-out transition to complete before removing from DOM
    setTimeout(() => {
      setVisible(false)
      try {
        localStorage.setItem(BANNER_KEY, new Date().toISOString())
      } catch {
        // Silently fail if localStorage is unavailable
      }
    }, 300)
  }, [])

  if (!visible) return null

  return (
    <div
      className={`mb-4 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm transition-opacity duration-300 dark:border-blue-800 dark:bg-blue-950/30 ${
        dismissing ? 'opacity-0' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
        We&apos;ve upgraded! Previous sessions have been cleared.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/50 dark:hover:text-blue-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
