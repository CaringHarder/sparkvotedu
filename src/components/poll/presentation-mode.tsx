'use client'

import { useEffect, useCallback, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface PresentationModeProps {
  children: ReactNode
  title: string
  onExit: () => void
}

/**
 * Full-screen projector view with high contrast and large text.
 *
 * Uses the Fullscreen API for true full-screen experience.
 * Renders a fixed overlay with dark background and the results content.
 * Exits on Escape key or "Exit" button click.
 */
export function PresentationMode({
  children,
  title,
  onExit,
}: PresentationModeProps) {
  const handleExit = useCallback(() => {
    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        // Ignore -- user may have already exited
      })
    }
    onExit()
  }, [onExit])

  // Request fullscreen on mount
  useEffect(() => {
    document.documentElement.requestFullscreen().catch(() => {
      // Fullscreen may be blocked by browser -- continue in overlay mode
    })

    // Listen for fullscreen exit (Escape key or browser controls)
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        onExit()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      // Exit fullscreen on unmount if still active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [onExit])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        <button
          type="button"
          onClick={handleExit}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/20"
        >
          <X className="h-4 w-4" />
          Exit
        </button>
      </div>

      {/* Content area -- scaled up for projectors */}
      <div className="flex-1 overflow-auto p-6 md:p-10">
        <div className="mx-auto max-w-5xl [&_*]:text-white [&_.text-muted-foreground]:text-white/60 [&_.bg-muted]:bg-white/10 [&_.border]:border-white/20 [&_.bg-card]:bg-white/5 [&_.text-foreground]:text-white [&_.fill-foreground]:fill-white [&_.fill-muted-foreground]:fill-white/60">
          {children}
        </div>
      </div>
    </div>
  )
}
