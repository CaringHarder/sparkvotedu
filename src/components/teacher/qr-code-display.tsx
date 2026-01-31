'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useState, useRef, useEffect } from 'react'

interface QRCodeDisplayProps {
  code: string
}

export function QRCodeDisplay({ code }: QRCodeDisplayProps) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${code}`
    : `/join/${code}`

  async function handleCopyCode() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Close panel on outside click
  useEffect(() => {
    if (!visible) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setVisible(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [visible])

  return (
    <div className="relative" ref={panelRef}>
      {/* Join code button — always visible */}
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
        >
          <rect width="5" height="5" x="3" y="3" rx="1" />
          <rect width="5" height="5" x="16" y="3" rx="1" />
          <rect width="5" height="5" x="3" y="16" rx="1" />
          <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
          <path d="M21 21v.01" />
          <path d="M12 7v3a2 2 0 0 1-2 2H7" />
          <path d="M3 12h.01" />
          <path d="M12 3h.01" />
          <path d="M12 16v.01" />
          <path d="M16 12h1" />
          <path d="M21 12v.01" />
          <path d="M12 21v-1" />
        </svg>
        <span className="font-mono tracking-wider">{code}</span>
      </button>

      {/* Expandable QR panel */}
      {visible && (
        <div className="absolute right-0 top-full z-40 mt-2 flex flex-col items-center gap-3 rounded-xl border bg-white p-5 shadow-lg">
          <p className="text-xs font-medium text-muted-foreground">Scan to join</p>
          <QRCodeSVG value={joinUrl} size={200} level="M" />
          <p className="font-mono text-2xl font-bold tracking-widest text-foreground">{code}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/80"
            >
              {copied ? 'Copied!' : 'Copy code'}
            </button>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/80"
            >
              Copy link
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
