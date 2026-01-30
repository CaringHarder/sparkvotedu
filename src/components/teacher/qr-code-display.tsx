'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface QRCodeDisplayProps {
  code: string
}

export function QRCodeDisplay({ code }: QRCodeDisplayProps) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${code}`
    : `/join/${code}`

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        variant="outline"
        onClick={() => setVisible(!visible)}
      >
        {visible ? 'Hide QR Code' : 'Show QR Code'}
      </Button>
      {visible && (
        <div className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-white">
          <QRCodeSVG value={joinUrl} size={200} level="M" />
          <button
            onClick={handleCopyUrl}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {copied ? 'Copied!' : joinUrl}
          </button>
        </div>
      )}
    </div>
  )
}
