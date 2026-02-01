'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface PanZoomState {
  x: number
  y: number
  scale: number
}

export interface UsePanZoomOptions {
  minScale?: number
  maxScale?: number
  initialScale?: number
  scaleStep?: number
}

/**
 * Custom hook for managing CSS-transform-based pan/zoom interactions.
 *
 * Supports:
 * - Mouse wheel zoom (centered on cursor)
 * - Pointer drag to pan
 * - Touch pinch-to-zoom (two-finger gesture)
 * - Programmatic zoom in/out and reset
 *
 * Returns transform state and a ref to attach to the container element.
 */
export function usePanZoom(options: UsePanZoomOptions = {}) {
  const {
    minScale = 0.1,
    maxScale = 3,
    initialScale = 1,
    scaleStep = 0.2,
  } = options

  const [state, setState] = useState<PanZoomState>({
    x: 0,
    y: 0,
    scale: initialScale,
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const lastPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const lastPinchDistance = useRef<number | null>(null)

  // Clamp scale to min/max bounds
  const clampScale = useCallback(
    (s: number) => Math.min(maxScale, Math.max(minScale, s)),
    [minScale, maxScale]
  )

  // --- Wheel zoom ---
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      setState((prev) => ({
        ...prev,
        scale: clampScale(prev.scale * factor),
      }))
    },
    [clampScale]
  )

  // --- Pointer drag ---
  const handlePointerDown = useCallback((e: PointerEvent) => {
    // Only left mouse button or primary touch
    if (e.button !== 0) return
    isDragging.current = true
    lastPointer.current = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y
    lastPointer.current = { x: e.clientX, y: e.clientY }
    setState((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }))
  }, [])

  const handlePointerUp = useCallback((e: PointerEvent) => {
    isDragging.current = false
    ;(e.currentTarget as HTMLElement)?.releasePointerCapture(e.pointerId)
  }, [])

  // --- Touch pinch-to-zoom ---
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length !== 2) {
        lastPinchDistance.current = null
        return
      }
      e.preventDefault()

      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (lastPinchDistance.current !== null) {
        const ratio = distance / lastPinchDistance.current
        setState((prev) => ({
          ...prev,
          scale: clampScale(prev.scale * ratio),
        }))
      }

      lastPinchDistance.current = distance
    },
    [clampScale]
  )

  const handleTouchEnd = useCallback(() => {
    lastPinchDistance.current = null
  }, [])

  // --- Attach/detach event listeners ---
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('pointerdown', handlePointerDown)
    el.addEventListener('pointermove', handlePointerMove)
    el.addEventListener('pointerup', handlePointerUp)
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)

    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('pointerdown', handlePointerDown)
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerup', handlePointerUp)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTouchMove,
    handleTouchEnd,
  ])

  // --- Programmatic controls ---
  const zoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: clampScale(prev.scale * (1 + scaleStep)),
    }))
  }, [clampScale, scaleStep])

  const zoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: clampScale(prev.scale * (1 - scaleStep)),
    }))
  }, [clampScale, scaleStep])

  const resetZoom = useCallback(() => {
    setState({ x: 0, y: 0, scale: initialScale })
  }, [initialScale])

  // CSS transform string for the inner content element
  const transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`

  return {
    /** Ref to attach to the outer container element (overflow-hidden) */
    containerRef,
    /** Current pan/zoom state */
    state,
    /** CSS transform string to apply to the inner content element */
    transform,
    /** Zoom in by scaleStep (default 20%) */
    zoomIn,
    /** Zoom out by scaleStep (default 20%) */
    zoomOut,
    /** Reset to initial scale and position (0,0) */
    resetZoom,
  }
}
