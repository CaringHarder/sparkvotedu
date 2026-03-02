'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { claimIdentity, joinSessionByName } from '@/actions/student'
import { validateFirstName } from '@/lib/validations/first-name'
import { setSessionParticipant } from '@/lib/student/session-store'
import type { DuplicateCandidate } from '@/types/student'

interface SessionInfo {
  id: string
  name: string | null
  teacherName: string | null
  status: string
}

interface NameDisambiguationProps {
  duplicates: DuplicateCandidate[]
  firstName: string
  code: string
  sessionInfo: SessionInfo
  /** Callback to update the name in the parent form */
  onNameChange?: (name: string) => void
}

export function NameDisambiguation({
  duplicates,
  firstName,
  code,
  sessionInfo,
  onNameChange,
}: NameDisambiguationProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState(firstName)
  const [nameError, setNameError] = useState('')
  const [currentDuplicates, setCurrentDuplicates] = useState(duplicates)
  const [showReturning, setShowReturning] = useState(false)
  const [confirmCandidate, setConfirmCandidate] = useState<DuplicateCandidate | null>(null)
  const router = useRouter()

  async function handleSubmitNewName(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    const trimmed = newName.trim()

    // Block exact same name resubmission (case-insensitive)
    if (trimmed.toLowerCase() === firstName.toLowerCase()) {
      setNameError('Name taken. Add your last initial to join.')
      return
    }

    // Client-side validation
    const validation = validateFirstName(newName)
    if (!validation.valid) {
      setNameError(validation.error)
      return
    }

    setNameError('')
    setLoading(true)
    setError('')

    try {
      const result = await joinSessionByName({ code, firstName: newName })

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      if (result.duplicates && result.session) {
        // Still duplicates -- update state and re-prompt
        setCurrentDuplicates(result.duplicates)
        setNameError('Name taken. Add your last initial to join.')
        setLoading(false)
        return
      }

      if (result.sessionEnded && result.session) {
        router.push(`/session/${result.session.id}`)
        return
      }

      if (result.participant && result.session) {
        // Store identity in sessionStorage (per-tab)
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

  async function handleClaim(candidate: DuplicateCandidate) {
    if (confirmCandidate?.id === candidate.id) {
      // Second click -- confirmed, claim identity
      setLoading(true)
      setError('')

      try {
        const result = await claimIdentity({
          participantId: candidate.id,
          sessionCode: code,
        })

        if (result.error) {
          setError(result.error)
          setLoading(false)
          setConfirmCandidate(null)
          return
        }

        if (result.participant && result.session) {
          // Store identity in sessionStorage (per-tab)
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
            returning: 'true',
          })
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
        setConfirmCandidate(null)
      }
    } else {
      // First click -- show confirmation
      setConfirmCandidate(candidate)
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Primary: "Name taken" prompt with input */}
      <form
        onSubmit={handleSubmitNewName}
        className="flex w-full flex-col items-center gap-3"
      >
        <p className="text-center text-sm font-medium text-destructive">
          Name taken. Add your last initial to join.
        </p>

        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}

        <input
          type="text"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value)
            if (onNameChange) onNameChange(e.target.value)
            if (nameError) setNameError('')
          }}
          autoFocus
          disabled={loading}
          className={`w-full rounded-xl border-2 bg-background px-4 py-4 text-center text-2xl font-semibold outline-none transition-all placeholder:text-muted-foreground/40 ${
            nameError
              ? 'border-destructive focus:border-destructive'
              : 'border-input focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20'
          }`}
        />
        {nameError && (
          <p className="text-sm font-medium text-destructive">{nameError}</p>
        )}
        <button
          type="submit"
          disabled={newName.trim().length < 2 || loading}
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

      {/* Secondary: Returning student path */}
      {!showReturning ? (
        <button
          type="button"
          onClick={() => {
            setShowReturning(true)
            setConfirmCandidate(null)
          }}
          disabled={loading}
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
        >
          Returning student? Tap here
        </button>
      ) : (
        <div className="flex w-full flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Select your name to rejoin:
          </p>

          <div className="flex w-full flex-col gap-3">
            {currentDuplicates.map((candidate) => (
              <div
                key={candidate.id}
                className="w-full rounded-xl border-2 border-input bg-background p-4 transition-all"
              >
                {confirmCandidate?.id === candidate.id ? (
                  // Confirmation view
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      You&apos;ll rejoin as{' '}
                      <span className="font-bold text-brand-amber">
                        {candidate.funName}
                      </span>
                      . Is that right?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleClaim(candidate)}
                        disabled={loading}
                        className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
                      >
                        {loading ? (
                          <span className="inline-flex items-center gap-1">
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Confirming...
                          </span>
                        ) : (
                          'Confirm'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCandidate(null)}
                        disabled={loading}
                        className="rounded-lg border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Selection view
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-brand-amber">
                      {candidate.funName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleClaim(candidate)}
                      disabled={loading}
                      className="rounded-lg bg-brand-blue/10 px-3 py-1.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue/20 disabled:opacity-50"
                    >
                      That&apos;s me!
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setShowReturning(false)
              setConfirmCandidate(null)
            }}
            disabled={loading}
            className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            Back
          </button>
        </div>
      )}
    </div>
  )
}
