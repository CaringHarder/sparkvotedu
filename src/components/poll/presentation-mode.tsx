'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface PresentationModeProps {
  children: ReactNode
  title: string
  onExit: () => void
}

/**
 * Full-screen projector view with high contrast and large text.
 *
 * Renders a fixed overlay independently of the Fullscreen API.
 * Fullscreen is requested as an enhancement but the overlay persists
 * regardless of whether the browser grants fullscreen.
 *
 * Exits ONLY on explicit user action:
 * - Esc key press
 * - F key press
 * - Exit button click
 *
 * The fullscreenchange event does NOT trigger overlay closure.
 */
export function PresentationMode({
  children,
  title,
  onExit,
}: PresentationModeProps) {
  // Ref for onExit to avoid re-running effects when the callback identity changes
  const onExitRef = useRef(onExit)
  useEffect(() => {
    onExitRef.current = onExit
  }, [onExit])

  // Request fullscreen on mount (fire-and-forget enhancement)
  useEffect(() => {
    document.documentElement.requestFullscreen().catch(() => {
      // Fullscreen may be blocked by browser -- overlay still works
    })

    return () => {
      // Exit fullscreen on unmount if still active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  // Keyboard handlers: Esc and F exit the presentation overlay
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Browser may exit fullscreen on Esc before this fires --
        // that's fine, we still close the overlay independently.
        e.preventDefault()
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        }
        onExitRef.current()
        return
      }

      if (
        (e.key === 'f' || e.key === 'F') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        }
        onExitRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleExitClick() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    onExitRef.current()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        <button
          type="button"
          onClick={handleExitClick}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/20"
        >
          <X className="h-4 w-4" />
          Exit
        </button>
      </div>

      {/* Content area -- scaled up for projectors */}
      <div className="flex-1 overflow-auto p-6 md:p-10">
        <div className="mx-auto max-w-5xl text-white [&_.text-muted-foreground]:text-white/60 [&_.bg-muted]:bg-white/10 [&_.border]:border-white/20 [&_.bg-card]:bg-white/5 [&_.text-foreground]:text-white [&_.fill-foreground]:fill-white [&_.fill-muted-foreground]:fill-white/60">
          {children}
        </div>
      </div>
    </div>
  )
}
