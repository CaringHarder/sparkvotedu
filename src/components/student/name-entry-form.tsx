'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinSessionByName } from '@/actions/student'
import { validateFirstName } from '@/lib/validations/first-name'
import { setSessionParticipant } from '@/lib/student/session-store'
import { NameDisambiguation } from '@/components/student/name-disambiguation'
import type { DuplicateCandidate } from '@/types/student'

interface SessionInfo {
  id: string
  name: string | null
  teacherName: string | null
  status: string
}

interface NameEntryFormProps {
  code: string
  sessionInfo: SessionInfo
}

export function NameEntryForm({ code, sessionInfo }: NameEntryFormProps) {
  const [firstName, setFirstName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[] | null>(null)
  const router = useRouter()

  // Derive session context display
  const sessionLabel = sessionInfo.teacherName
    ? `${sessionInfo.teacherName}'s class`
    : sessionInfo.name
      ? sessionInfo.name
      : 'session'

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFirstName(e.target.value)
    if (error) setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    // Client-side validation
    const validation = validateFirstName(firstName)
    if (!validation.valid) {
      setError(validation.error)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }

    setError('')
    setLoading(true)

    try {
      const result = await joinSessionByName({ code, firstName })

      if (result.error) {
        setError(result.error)
        setShake(true)
        setTimeout(() => setShake(false), 500)
        setLoading(false)
        return
      }

      if (result.duplicates && result.session) {
        // Switch to disambiguation mode
        setDuplicates(result.duplicates)
        setLoading(false)
        return
      }

      if (result.sessionEnded && result.session) {
        // Ended session -- navigate to results
        router.push(`/session/${result.session.id}`)
        return
      }

      if (result.participant && result.session) {
        // Success -- store participant identity in sessionStorage (per-tab)
        setSessionParticipant(result.session.id, {
          participantId: result.participant.id,
          firstName: result.participant.firstName,
          funName: result.participant.funName,
          sessionId: result.session.id,
          rerollUsed: result.participant.rerollUsed,
        })
        // Keep last session code in localStorage (convenience auto-fill, not identity)
        try {
          localStorage.setItem('sparkvotedu_last_session_code', code)
        } catch {
          // localStorage unavailable -- fail-silent
        }

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
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setLoading(false)
    }
  }

  // If we have duplicates, show disambiguation UI
  if (duplicates) {
    return (
      <NameDisambiguation
        duplicates={duplicates}
        firstName={firstName}
        code={code}
        sessionInfo={sessionInfo}
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-sm text-muted-foreground">
        Joining{' '}
        <span className="font-medium text-foreground">{sessionLabel}</span>
      </p>

      <form onSubmit={handleSubmit} className="flex w-full flex-col items-center gap-5">
        <div className={`w-full ${shake ? 'animate-shake' : ''}`}>
          <input
            type="text"
            placeholder="Your first name"
            value={firstName}
            onChange={handleNameChange}
            autoFocus
            disabled={loading}
            className={`w-full rounded-xl border-2 bg-background px-4 py-4 text-center text-2xl font-semibold outline-none transition-all placeholder:text-muted-foreground/40 ${
              error
                ? 'border-destructive focus:border-destructive'
                : 'border-input focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20'
            }`}
          />
        </div>

        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={firstName.trim().length < 2 || loading}
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

      <button
        type="button"
        onClick={() => router.push('/join')}
        className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Back to code entry
      </button>
    </div>
  )
}
