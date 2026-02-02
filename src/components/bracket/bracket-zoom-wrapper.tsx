'use client'

import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
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
}: BracketZoomWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initialScale = options?.initialScale ?? 1
  const minScale = options?.minScale ?? 0.25
  const maxScale = options?.maxScale ?? 3
  const [scale, setScale] = useState(initialScale)

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
        style={{ maxHeight: '70vh' }}
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
