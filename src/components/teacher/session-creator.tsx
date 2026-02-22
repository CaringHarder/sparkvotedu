'use client'

import { useState, useTransition } from 'react'
import { createSession } from '@/actions/class-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QRCodeDisplay } from './qr-code-display'

interface CreatedSession {
  id: string
  code: string
  name: string | null
  status: string
}

export function SessionCreator() {
  const [name, setName] = useState('')
  const [createdSession, setCreatedSession] = useState<CreatedSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const result = await createSession(name || undefined)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.session) {
        setCreatedSession(result.session as CreatedSession)
        setName('')
      }
    })
  }

  async function handleCopy() {
    if (!createdSession) return
    await navigator.clipboard.writeText(createdSession.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (createdSession) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Created</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Share this code with students:</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-mono font-bold tracking-widest">
                {createdSession.code}
              </span>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
          <QRCodeDisplay code={createdSession.code} />
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setCreatedSession(null)}
            >
              Create Another
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Session</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Session name <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <Input
              placeholder="e.g., Period 3 History"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button onClick={handleCreate} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Session'}
          </Button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
