'use client'

import type { ReactNode } from 'react'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePanZoom } from '@/hooks/use-pan-zoom'
import type { UsePanZoomOptions } from '@/hooks/use-pan-zoom'

interface BracketZoomWrapperProps {
  children: ReactNode
  /** Optional pan/zoom configuration */
  options?: UsePanZoomOptions
  /** Additional CSS class for the outer container */
  className?: string
}

/**
 * Wrapper component that applies pan/zoom interactions to its children.
 *
 * Provides:
 * - Wheel zoom, drag pan, and touch pinch-to-zoom via usePanZoom hook
 * - Floating zoom control buttons (zoom in, zoom out, fit/reset)
 * - overflow-hidden container with touch-action: none for proper touch handling
 * - transform-origin: 0 0 for predictable scaling behavior
 */
export function BracketZoomWrapper({
  children,
  options,
  className = '',
}: BracketZoomWrapperProps) {
  const { containerRef, transform, zoomIn, zoomOut, resetZoom, state } =
    usePanZoom(options)

  // Display zoom percentage for accessibility
  const zoomPercent = Math.round(state.scale * 100)

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg border bg-background ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Zoomable content area */}
      <div
        style={{
          transform,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {children}
      </div>

      {/* Floating zoom controls */}
      <div
        className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-sm backdrop-blur-sm"
        onPointerDown={(e) => e.stopPropagation()}
      >
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
          title="Fit to screen"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
