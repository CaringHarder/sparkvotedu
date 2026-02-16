'use client'

import type { ReactNode } from 'react'
import { useRef, useState, useEffect, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize, Hand } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Options for the BracketZoomWrapper.
 */
export interface BracketZoomWrapperOptions {
  minScale?: number
  maxScale?: number
  initialScale?: number
  scaleStep?: number
}

interface BracketZoomWrapperProps {
  children: ReactNode
  /** Optional zoom configuration */
  options?: BracketZoomWrapperOptions
  /** Additional CSS class for the outer container */
  className?: string
  /** Actual bracket entrant count (informational only) */
  bracketSize?: number
}

const HINT_STORAGE_KEY = 'sparkvotedu_bracket_mobile_hint_seen'

/**
 * Wrapper component that provides scrollable bracket viewing with zoom controls.
 *
 * - Native `overflow: auto` scrolling (no wheel event hijacking)
 * - State-driven CSS scale transform for zoom in/out/reset
 * - No pointer capture -- all child click events work naturally
 * - Floating zoom controls outside the scroll interaction area
 * - Mobile: larger touch-friendly zoom buttons (44px) + first-visit hint
 */
export function BracketZoomWrapper({
  children,
  options,
  className = '',
}: BracketZoomWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initialScale = options?.initialScale ?? 1
  const minScale = options?.minScale ?? 0.25
  const maxScale = options?.maxScale ?? 3
  const [scale, setScale] = useState(initialScale)
  const [showMobileHint, setShowMobileHint] = useState(false)

  // Show mobile hint on first visit (touch device only)
  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (!isTouchDevice) return

    try {
      const seen = localStorage.getItem(HINT_STORAGE_KEY)
      if (!seen) {
        setShowMobileHint(true)
      }
    } catch {
      // localStorage not available
    }
  }, [])

  const dismissHint = useCallback(() => {
    setShowMobileHint(false)
    try {
      localStorage.setItem(HINT_STORAGE_KEY, '1')
    } catch {
      // localStorage not available
    }
  }, [])

  // Auto-dismiss hint after 5 seconds
  useEffect(() => {
    if (!showMobileHint) return
    const timer = setTimeout(dismissHint, 5000)
    return () => clearTimeout(timer)
  }, [showMobileHint, dismissHint])

  // Intercept pinch-to-zoom (ctrlKey wheel events) to change bracket scale
  // instead of browser page zoom. Normal scroll wheel events pass through.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const factor = e.deltaY > 0 ? 0.95 : 1.05
      setScale((s) => Math.max(minScale, Math.min(maxScale, s * factor)))
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [minScale, maxScale])

  const zoomIn = () => setScale((s) => Math.min(maxScale, s * 1.2))
  const zoomOut = () => setScale((s) => Math.max(minScale, s / 1.2))
  const resetZoom = () => {
    setScale(initialScale)
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0
      containerRef.current.scrollTop = 0
    }
  }

  const zoomPercent = Math.round(scale * 100)

  return (
    <div className={`relative ${className}`}>
      {/* Mobile hint overlay */}
      {showMobileHint && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm"
          onClick={dismissHint}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && dismissHint()}
        >
          <div className="flex flex-col items-center gap-2 rounded-xl bg-background/95 px-5 py-4 shadow-lg">
            <Hand className="h-6 w-6 text-brand-blue" />
            <p className="text-center text-sm font-medium text-foreground">
              Pinch to zoom, drag to pan
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Tap anywhere to dismiss
            </p>
          </div>
        </div>
      )}

      {/* Scrollable bracket area */}
      <div
        ref={containerRef}
        className="overflow-auto rounded-lg border bg-background"
        style={{ maxHeight: '70vh', touchAction: 'pan-x pan-y' }}
        onTouchStart={showMobileHint ? dismissHint : undefined}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
        >
          {children}
        </div>
      </div>

      {/* Floating zoom controls -- larger on mobile for 44px touch targets */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-sm backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 md:h-8 md:w-8"
          onClick={zoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-5 w-5 md:h-4 md:w-4" />
        </Button>

        <span className="hidden min-w-[3rem] text-center text-xs font-medium text-muted-foreground sm:inline-block">
          {zoomPercent}%
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 md:h-8 md:w-8"
          onClick={zoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-5 w-5 md:h-4 md:w-4" />
        </Button>

        <div className="mx-0.5 h-5 w-px bg-border" />

        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 md:h-8 md:w-8"
          onClick={resetZoom}
          title="Reset"
        >
          <Maximize className="h-5 w-5 md:h-4 md:w-4" />
        </Button>
      </div>
    </div>
  )
}
