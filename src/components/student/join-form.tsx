'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDeviceIdentity } from '@/hooks/use-device-identity'
import { joinSession } from '@/actions/student'

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
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-5">
      <div className={`w-full ${shake ? 'animate-shake' : ''}`}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={handleCodeChange}
          autoFocus
          disabled={loading}
          className={`w-full rounded-xl border-2 bg-background px-4 py-5 text-center text-4xl font-bold tracking-[0.4em] outline-none transition-all placeholder:text-muted-foreground/30 placeholder:tracking-[0.4em] ${
            error
              ? 'border-destructive focus:border-destructive'
              : 'border-input focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20'
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

      <button
        type="submit"
        disabled={!isValid || !ready || loading}
        className="min-h-[48px] w-full rounded-xl bg-brand-blue px-6 py-3.5 text-lg font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Joining...
          </span>
        ) : (
          'Join Session'
        )}
      </button>
    </form>
  )
}
