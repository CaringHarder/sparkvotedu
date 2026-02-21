'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { claimIdentity, joinSessionByName } from '@/actions/student'
import { validateFirstName } from '@/lib/validations/first-name'
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
}

export function NameDisambiguation({
  duplicates,
  firstName,
  code,
  sessionInfo,
}: NameDisambiguationProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmCandidate, setConfirmCandidate] = useState<DuplicateCandidate | null>(null)
  const [showDifferentiate, setShowDifferentiate] = useState(false)
  const [newName, setNewName] = useState(firstName)
  const [nameError, setNameError] = useState('')
  const [currentDuplicates, setCurrentDuplicates] = useState(duplicates)
  const router = useRouter()

  const heading =
    currentDuplicates.length === 1
      ? 'Someone with that name is already here'
      : 'Multiple students with that name are here'

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
          try {
            localStorage.setItem(
              `sparkvotedu_session_${result.session.id}`,
              JSON.stringify({
                participantId: result.participant.id,
                firstName: result.participant.firstName,
                funName: result.participant.funName,
                sessionId: result.session.id,
                rerollUsed: result.participant.rerollUsed,
              })
            )
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
      setShowDifferentiate(false)
    }
  }

  function handleCancelConfirm() {
    setConfirmCandidate(null)
  }

  async function handleDifferentiate(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

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
        // More duplicates found -- update the list (recursive handling)
        setCurrentDuplicates(result.duplicates)
        setShowDifferentiate(false)
        setLoading(false)
        return
      }

      if (result.sessionEnded && result.session) {
        router.push(`/session/${result.session.id}`)
        return
      }

      if (result.participant && result.session) {
        try {
          localStorage.setItem(
            `sparkvotedu_session_${result.session.id}`,
            JSON.stringify({
              participantId: result.participant.id,
              firstName: result.participant.firstName,
              funName: result.participant.funName,
              sessionId: result.session.id,
              rerollUsed: result.participant.rerollUsed,
            })
          )
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

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-center">
        <h2 className="text-xl font-bold">{heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Is one of these you?
        </p>
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}

      {/* Candidate list */}
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
                    onClick={handleCancelConfirm}
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

      {/* Differentiate section */}
      {!showDifferentiate ? (
        <button
          type="button"
          onClick={() => {
            setShowDifferentiate(true)
            setConfirmCandidate(null)
          }}
          disabled={loading}
          className="text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
        >
          I&apos;m someone different
        </button>
      ) : (
        <form
          onSubmit={handleDifferentiate}
          className="flex w-full flex-col items-center gap-3"
        >
          <p className="text-sm text-muted-foreground">
            Add something to make your name unique (like a last initial)
          </p>
          <input
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value)
              if (nameError) setNameError('')
            }}
            autoFocus
            disabled={loading}
            className={`w-full rounded-xl border-2 bg-background px-4 py-3 text-center text-xl font-semibold outline-none transition-all placeholder:text-muted-foreground/40 ${
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
            className="min-h-[44px] w-full rounded-xl bg-brand-blue px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
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
              'Join as this name'
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowDifferentiate(false)}
            disabled={loading}
            className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            Back to list
          </button>
        </form>
      )}
    </div>
  )
}
