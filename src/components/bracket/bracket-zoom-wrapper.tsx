'use client'

import type { ReactNode } from 'react'
import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Options for the BracketZoomWrapper.
 * Kept compatible with the previous UsePanZoomOptions interface
 * so existing consumers don't need changes.
 */
export interface BracketZoomWrapperOptions {
  minScale?: number
  maxScale?: number
  initialScale?: number
  scaleStep?: number
}

interface BracketZoomWrapperProps {
  children: ReactNode
  /** Optional zoom configuration (backwards-compatible with UsePanZoomOptions) */
  options?: BracketZoomWrapperOptions
  /** Additional CSS class for the outer container */
  className?: string
  /** Actual bracket entrant count -- enables section navigation for 32+ brackets */
  bracketSize?: number
}

/**
 * Wrapper component that provides scrollable bracket viewing with zoom controls.
 *
 * Replaces the previous pointer-capture pan/zoom approach with:
 * - Native `overflow: auto` scrolling (no wheel event hijacking)
 * - State-driven CSS scale transform for zoom in/out/reset
 * - No pointer capture -- all child click events work naturally
 * - Floating zoom controls outside the scroll interaction area
 *
 * This fixes:
 * - GAP-R3-04: Zoom buttons not working
 * - Two-finger scroll hijacked for zoom
 * - Students unable to click entrants within the wrapper
 */
export function BracketZoomWrapper({
  children,
  options,
  className = '',
  bracketSize,
}: BracketZoomWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initialScale = options?.initialScale ?? 1
  const minScale = options?.minScale ?? 0.25
  const maxScale = options?.maxScale ?? 3
  const [scale, setScale] = useState(initialScale)

  // Intercept pinch-to-zoom (ctrlKey wheel events) to change bracket scale
  // instead of browser page zoom. Normal scroll wheel events pass through.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return // Let normal scroll pass through
      e.preventDefault()
      const factor = e.deltaY > 0 ? 0.95 : 1.05
      setScale((s) => Math.max(minScale, Math.min(maxScale, s * factor)))
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [minScale, maxScale])

  // Section navigation buttons for large brackets
  const sections = useMemo(() => {
    if (!bracketSize || bracketSize < 32) return []
    if (bracketSize >= 64) {
      return [
        { label: 'TL', title: 'Top-Left', top: 0 as const, left: 0 as const },
        { label: 'TR', title: 'Top-Right', top: 0 as const, left: 'max' as const },
        { label: 'BL', title: 'Bottom-Left', top: 'max' as const, left: 0 as const },
        { label: 'BR', title: 'Bottom-Right', top: 'max' as const, left: 'max' as const },
      ]
    }
    // 32 entrants: top/bottom halves
    return [
      { label: 'Top', title: 'Top Half', top: 0 as const, left: 0 as const },
      { label: 'Bottom', title: 'Bottom Half', top: 'max' as const, left: 0 as const },
    ]
  }, [bracketSize])

  const scrollToSection = useCallback((top: 0 | 'max', left: 0 | 'max') => {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({
      top: top === 'max' ? el.scrollHeight : 0,
      left: left === 'max' ? el.scrollWidth : 0,
      behavior: 'smooth',
    })
  }, [])

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
      {/* Scrollable bracket area -- no pointer capture, no wheel hijack */}
      <div
        ref={containerRef}
        className="overflow-auto rounded-lg border bg-background"
        style={{ maxHeight: '70vh', touchAction: 'pan-x pan-y' }}
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

      {/* Floating zoom controls (outside the scrollable area) */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-sm backdrop-blur-sm">
        {/* Section navigation buttons for 32+ brackets */}
        {sections.length > 0 && (
          <>
            {sections.map((s) => (
              <Button
                key={s.label}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-xs font-medium"
                onClick={() => scrollToSection(s.top, s.left)}
                title={s.title}
              >
                {s.label}
              </Button>
            ))}
            <div className="mx-0.5 h-5 w-px bg-border" />
          </>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={zoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <span className="min-w-[3rem] text-center text-xs font-medium text-muted-foreground">
          {zoomPercent}%
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={zoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <div className="mx-0.5 h-5 w-px bg-border" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={resetZoom}
          title="Reset"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
