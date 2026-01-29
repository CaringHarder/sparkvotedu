'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDeviceIdentity } from '@/hooks/use-device-identity'
import { joinSession } from '@/actions/student'
import { Button } from '@/components/ui/button'

export function JoinForm({ initialCode = '' }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const router = useRouter()
  const { deviceId, fingerprint, ready } = useDeviceIdentity()

  const isValid = /^\d{6}$/.test(code)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || !ready) return

    setError('')
    setLoading(true)

    try {
      const result = await joinSession({ code, deviceId, fingerprint })

      if (result.error) {
        setError(result.error)
        setShake(true)
        setTimeout(() => setShake(false), 500)
        setLoading(false)
        return
      }

      if (result.participant && result.session) {
        // Store participant data in localStorage for session pages
        localStorage.setItem(
          `sparkvotedu_session_${result.session.id}`,
          JSON.stringify({
            participantId: result.participant.id,
            funName: result.participant.funName,
            sessionId: result.session.id,
            rerollUsed: result.participant.rerollUsed,
          })
        )

        const params = new URLSearchParams({
          name: result.participant.funName,
          participantId: result.participant.id,
        })
        if (result.returning) {
          params.set('returning', 'true')
        }
        if (result.session.teacherName) {
          params.set('teacher', result.session.teacherName)
        }

        router.push(
          `/session/${result.session.id}/welcome?${params.toString()}`
        )
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    if (error) setError('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
      <div className={`w-full ${shake ? 'animate-shake' : ''}`}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="Enter class code"
          value={code}
          onChange={handleCodeChange}
          autoFocus
          disabled={loading}
          className={`w-full rounded-lg border-2 bg-background px-4 py-4 text-center text-3xl font-bold tracking-[0.3em] outline-none transition-colors placeholder:text-lg placeholder:font-normal placeholder:tracking-normal ${
            error
              ? 'border-destructive focus:border-destructive'
              : 'border-input focus:border-ring'
          }`}
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}

      {!ready && (
        <p className="text-xs text-muted-foreground">
          Preparing your device identity...
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!isValid || !ready || loading}
        className="w-full text-lg"
      >
        {loading ? 'Joining...' : 'Join'}
      </Button>
    </form>
  )
}
