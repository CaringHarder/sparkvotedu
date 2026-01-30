'use client'

import { useState } from 'react'
import { getRecoveryCode } from '@/actions/student'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface RecoveryCodeDialogProps {
  participantId: string
}

export function RecoveryCodeDialog({
  participantId,
}: RecoveryCodeDialogProps) {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleOpen(open: boolean) {
    if (open && !code) {
      setLoading(true)
      setError('')

      try {
        const result = await getRecoveryCode(participantId)

        if (result.error) {
          setError(result.error)
        } else if (result.recoveryCode) {
          setCode(result.recoveryCode)
        }
      } catch {
        setError('Failed to load recovery code')
      } finally {
        setLoading(false)
      }
    }
  }

  async function handleCopy() {
    if (!code) return

    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sm"
        >
          Recovery Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Recovery Code</DialogTitle>
          <DialogDescription>
            Save this code to recover your identity on a different device
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {code && (
            <>
              <div className="rounded-lg border-2 border-dashed bg-muted/50 px-6 py-4">
                <span className="font-mono text-2xl font-bold tracking-[0.2em]">
                  {code}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
