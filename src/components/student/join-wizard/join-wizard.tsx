'use client'

import { useReducer, useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { createWizardParticipant, completeWizardProfile, lookupStudent, rejoinWithStoredIdentity } from '@/actions/student'
import { shortcodeToEmoji } from '@/lib/student/emoji-pool'
import { setSessionParticipant } from '@/lib/student/session-store'
import { getStoredIdentity, setStoredIdentity, clearStoredIdentity } from '@/lib/student/identity-store'
import { LocalStorageConfirm } from './localStorage-confirm'
import { PathSelector } from './path-selector'
import { StepDots } from './step-dots'
import { WizardHeader } from './wizard-header'
import { FunNameSplash } from './fun-name-splash'
import { WizardStepFirstName } from './wizard-step-first-name'
import { WizardStepLastInitial } from './wizard-step-last-initial'
import { WizardStepEmoji } from './wizard-step-emoji'
import { WizardWelcome } from './wizard-welcome'
import { ReturningNameEntry } from './returning-name-entry'
import { ReturningDisambiguation } from './returning-disambiguation'
import { ReturningWelcome } from './returning-welcome'
import type { SessionInfo, WizardStep, WizardAction, SlideDirection } from './types'
import type { LookupResult } from '@/types/student'

// ---------------------------------------------------------------------------
// Slide animation variants
// ---------------------------------------------------------------------------

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function wizardReducer(state: WizardStep, action: WizardAction): WizardStep {
  switch (action.type) {
    case 'SELECT_NEW':
      // Transition handled by component after server call -- stay on path-select
      return state

    case 'SELECT_RETURNING':
      return { type: 'returning-name' }

    case 'SET_FUN_NAME':
      return {
        type: 'fun-name-splash',
        funName: action.funName,
        participantId: action.participantId,
      }

    case 'SPLASH_COMPLETE':
      if (state.type === 'fun-name-splash') {
        return {
          type: 'first-name',
          funName: state.funName,
          participantId: state.participantId,
        }
      }
      return state

    case 'SUBMIT_FIRST_NAME':
      if (state.type === 'first-name') {
        return {
          type: 'last-initial',
          funName: state.funName,
          participantId: state.participantId,
          firstName: action.firstName,
        }
      }
      return state

    case 'SUBMIT_LAST_INITIAL':
      // Note: actual transition is handled async in component (lookup check)
      // This is only called as a fallback -- normally SET_NEW_MATCH_FOUND or direct emoji-pick dispatch
      if (state.type === 'last-initial') {
        return {
          type: 'emoji-pick',
          funName: state.funName,
          participantId: state.participantId,
          firstName: state.firstName,
          lastInitial: action.lastInitial,
        }
      }
      return state

    case 'SET_NEW_MATCH_FOUND':
      if (state.type === 'last-initial') {
        return {
          type: 'new-match-found',
          funName: state.funName,
          participantId: state.participantId,
          firstName: state.firstName,
          lastInitial: action.lastInitial,
          candidates: action.candidates,
        }
      }
      return state

    case 'DECLINE_MATCH':
      if (state.type === 'new-match-found') {
        return {
          type: 'emoji-pick',
          funName: state.funName,
          participantId: state.participantId,
          firstName: state.firstName,
          lastInitial: state.lastInitial,
        }
      }
      return state

    case 'SELECT_EMOJI':
      if (state.type === 'emoji-pick') {
        return {
          type: 'welcome',
          funName: state.funName,
          emoji: action.emoji,
          emojiChar: action.emojiChar,
          participantId: state.participantId,
          firstName: state.firstName,
          lastInitial: state.lastInitial,
        }
      }
      return state

    case 'SET_RETURNING_DISAMBIGUATE':
      return {
        type: 'returning-disambiguate',
        candidates: action.candidates,
        firstName: action.firstName,
        lastInitial: action.lastInitial,
      }

    case 'SET_RETURNING_WELCOME':
      return {
        type: 'returning-welcome',
        funName: action.funName,
        emoji: action.emoji,
        emojiChar: action.emojiChar,
        participantId: action.participantId,
      }

    case 'REDIRECT_TO_NEW':
      return { type: 'path-select' }

    case 'SET_STORED_IDENTITY':
      return { type: 'localStorage-confirm', stored: action.stored }

    case 'CONFIRM_IDENTITY':
      return state // async handler manages transition

    case 'DENY_IDENTITY':
      return { type: 'path-select' }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Step number mapping for StepDots (new student wizard steps only)
// ---------------------------------------------------------------------------

function getStepNumber(step: WizardStep): { current: number; total: number } | null {
  switch (step.type) {
    case 'first-name':
      return { current: 1, total: 3 }
    case 'last-initial':
      return { current: 2, total: 3 }
    case 'emoji-pick':
      return { current: 3, total: 3 }
    default:
      return null
  }
}

/** Steps where the fun name header should be visible */
function showHeader(step: WizardStep): string | null {
  switch (step.type) {
    case 'first-name':
      return step.funName
    case 'last-initial':
      return step.funName
    case 'emoji-pick':
      return step.funName
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface JoinWizardProps {
  code: string
  sessionInfo: SessionInfo
}

export function JoinWizard({ code, sessionInfo }: JoinWizardProps) {
  const router = useRouter()
  const [step, dispatch] = useReducer(wizardReducer, { type: 'path-select' } as WizardStep)
  const directionRef = useRef<SlideDirection>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialCheckDone, setInitialCheckDone] = useState(false)

  // Check localStorage for stored identity on mount
  useEffect(() => {
    const stored = getStoredIdentity(sessionInfo.id)
    if (stored) {
      dispatch({ type: 'SET_STORED_IDENTITY', stored })
    }
    setInitialCheckDone(true)
  }, [sessionInfo.id])

  // Handler for confirming stored identity ("Yes, that's me!")
  const handleConfirmIdentity = useCallback(async () => {
    if (step.type !== 'localStorage-confirm') return
    setLoading(true)
    setError(null)

    const result = await rejoinWithStoredIdentity({
      participantId: step.stored.participantId,
      sessionId: sessionInfo.id,
    })

    if (result.error) {
      // Stored identity is stale -- clear it, fall through to wizard
      clearStoredIdentity(sessionInfo.id)
      setError(null)
      dispatch({ type: 'DENY_IDENTITY' })
      setLoading(false)
      return
    }

    if (result.participant) {
      // Set sessionStorage for in-session use
      setSessionParticipant(sessionInfo.id, {
        participantId: result.participant.id,
        firstName: result.participant.firstName,
        funName: result.participant.funName,
        sessionId: sessionInfo.id,
        rerollUsed: result.participant.rerollUsed,
        emoji: result.participant.emoji,
        lastInitial: result.participant.lastInitial,
      })

      // Update localStorage with fresh server data
      setStoredIdentity({
        participantId: result.participant.id,
        funName: result.participant.funName,
        emoji: result.participant.emoji,
        firstName: result.participant.firstName,
        lastInitial: result.participant.lastInitial,
        sessionId: sessionInfo.id,
        joinedAt: Date.now(),
      })

      // Navigate directly to session (skip welcome -- they already know who they are)
      router.push(`/session/${sessionInfo.id}`)
    }

    setLoading(false)
  }, [step, sessionInfo.id, router])

  // Handler for denying stored identity ("Not me")
  const handleDenyIdentity = useCallback(() => {
    if (step.type !== 'localStorage-confirm') return
    clearStoredIdentity(sessionInfo.id)
    directionRef.current = 1
    dispatch({ type: 'DENY_IDENTITY' })
  }, [step, sessionInfo.id])

  // Handler for "I'm new here!" path
  const handleSelectNew = useCallback(async () => {
    setLoading(true)
    setError(null)
    directionRef.current = 1

    const result = await createWizardParticipant({ code })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    if (result.participant) {
      dispatch({
        type: 'SET_FUN_NAME',
        funName: result.participant.funName,
        participantId: result.participant.id,
      })
    }

    setLoading(false)
  }, [code])

  // Handler for "I've been here before" path
  const handleSelectReturning = useCallback(() => {
    directionRef.current = 1
    dispatch({ type: 'SELECT_RETURNING' })
  }, [])

  // Handler for emoji selection -- dispatches and saves profile in background
  const handleEmojiSelect = useCallback(
    (emoji: string, emojiChar: string) => {
      if (step.type !== 'emoji-pick') return

      directionRef.current = 1
      dispatch({ type: 'SELECT_EMOJI', emoji, emojiChar })

      // Save profile to DB in the background (don't block UI transition)
      completeWizardProfile({
        participantId: step.participantId,
        firstName: step.firstName,
        lastInitial: step.lastInitial,
        emoji,
      }).catch(() => {
        // Profile save failed -- non-blocking, will be retried on session entry
      })

      // Store identity in sessionStorage for the session page
      setSessionParticipant(sessionInfo.id, {
        participantId: step.participantId,
        firstName: step.firstName,
        funName: step.funName,
        sessionId: sessionInfo.id,
        rerollUsed: false,
        emoji,
        lastInitial: step.lastInitial,
      })

      // Persist to localStorage for auto-rejoin
      setStoredIdentity({
        participantId: step.participantId,
        funName: step.funName,
        emoji,
        firstName: step.firstName,
        lastInitial: step.lastInitial,
        sessionId: sessionInfo.id,
        joinedAt: Date.now(),
      })
    },
    [step, sessionInfo.id]
  )

  // Handler for entering session after welcome screen
  const handleEnterSession = useCallback(() => {
    router.push(`/session/${sessionInfo.id}`)
  }, [router, sessionInfo.id])

  // Handler for returning student lookup result
  const handleReturningResult = useCallback((result: LookupResult) => {
    directionRef.current = 1

    // Single match -- auto-reclaimed
    if (result.participant) {
      const emojiChar = result.participant.emoji
        ? shortcodeToEmoji(result.participant.emoji) ?? ''
        : ''

      // Store identity in sessionStorage
      setSessionParticipant(sessionInfo.id, {
        participantId: result.participant.id,
        firstName: result.participant.firstName,
        funName: result.participant.funName,
        sessionId: sessionInfo.id,
        rerollUsed: result.participant.rerollUsed,
        emoji: result.participant.emoji,
        lastInitial: result.participant.lastInitial,
      })

      // Persist to localStorage for auto-rejoin
      setStoredIdentity({
        participantId: result.participant.id,
        funName: result.participant.funName,
        emoji: result.participant.emoji,
        firstName: result.participant.firstName,
        lastInitial: result.participant.lastInitial,
        sessionId: sessionInfo.id,
        joinedAt: Date.now(),
      })

      dispatch({
        type: 'SET_RETURNING_WELCOME',
        funName: result.participant.funName,
        emoji: result.participant.emoji ?? '',
        emojiChar,
        participantId: result.participant.id,
      })
      return
    }

    // Multiple matches -- disambiguation
    if (result.candidates) {
      dispatch({
        type: 'SET_RETURNING_DISAMBIGUATE',
        candidates: result.candidates,
        firstName: '',
        lastInitial: '',
      })
    }
  }, [sessionInfo.id])

  // Handler for disambiguation claim result
  const handleReturningClaimed = useCallback((result: LookupResult) => {
    directionRef.current = 1

    if (result.participant) {
      const emojiChar = result.participant.emoji
        ? shortcodeToEmoji(result.participant.emoji) ?? ''
        : ''

      // Store identity in sessionStorage
      setSessionParticipant(sessionInfo.id, {
        participantId: result.participant.id,
        firstName: result.participant.firstName,
        funName: result.participant.funName,
        sessionId: sessionInfo.id,
        rerollUsed: result.participant.rerollUsed,
        emoji: result.participant.emoji,
        lastInitial: result.participant.lastInitial,
      })

      // Persist to localStorage for auto-rejoin
      setStoredIdentity({
        participantId: result.participant.id,
        funName: result.participant.funName,
        emoji: result.participant.emoji,
        firstName: result.participant.firstName,
        lastInitial: result.participant.lastInitial,
        sessionId: sessionInfo.id,
        joinedAt: Date.now(),
      })

      dispatch({
        type: 'SET_RETURNING_WELCOME',
        funName: result.participant.funName,
        emoji: result.participant.emoji ?? '',
        emojiChar,
        participantId: result.participant.id,
      })
    }
  }, [sessionInfo.id])

  // Handler for "None of these" or "Not found, join as new"
  const handleRedirectToNew = useCallback(() => {
    directionRef.current = -1
    dispatch({ type: 'REDIRECT_TO_NEW' })
  }, [])

  // Handler for declining a match in new-student flow (continue as new)
  const handleDeclineMatch = useCallback(() => {
    directionRef.current = 1
    dispatch({ type: 'DECLINE_MATCH' })
  }, [])

  // Determine step dots and header visibility
  const stepInfo = getStepNumber(step)
  const headerFunName = showHeader(step)

  // Render current step content
  const renderStepContent = () => {
    switch (step.type) {
      case 'localStorage-confirm':
        return (
          <LocalStorageConfirm
            stored={step.stored}
            onConfirm={handleConfirmIdentity}
            onDeny={handleDenyIdentity}
            loading={loading}
          />
        )

      case 'path-select':
        return (
          <div className="flex flex-col gap-4">
            <PathSelector
              onSelectNew={handleSelectNew}
              onSelectReturning={handleSelectReturning}
            />
            {loading && (
              <p className="text-center text-sm text-muted-foreground">
                Setting things up...
              </p>
            )}
          </div>
        )

      case 'fun-name-splash':
        return (
          <FunNameSplash
            funName={step.funName}
            onComplete={() => {
              directionRef.current = 1
              dispatch({ type: 'SPLASH_COMPLETE' })
            }}
          />
        )

      case 'first-name':
        return (
          <WizardStepFirstName
            onSubmit={(firstName) => {
              directionRef.current = 1
              dispatch({ type: 'SUBMIT_FIRST_NAME', firstName })
            }}
          />
        )

      case 'last-initial':
        return (
          <WizardStepLastInitial
            firstName={step.firstName}
            onSubmit={async (lastInitial) => {
              directionRef.current = 1
              // Check if this student already exists across teacher's sessions
              const result = await lookupStudent({ code, firstName: step.firstName, lastInitial })
              if (result.candidates && result.candidates.length > 0) {
                // Multiple matches -- show "is this you?" interstitial
                dispatch({ type: 'SET_NEW_MATCH_FOUND', candidates: result.candidates, firstName: step.firstName, lastInitial })
              } else if (result.participant) {
                // Single match auto-reclaimed -- treat as returning
                const emojiChar = result.participant.emoji
                  ? shortcodeToEmoji(result.participant.emoji) ?? ''
                  : ''
                setSessionParticipant(sessionInfo.id, {
                  participantId: result.participant.id,
                  firstName: result.participant.firstName,
                  funName: result.participant.funName,
                  sessionId: sessionInfo.id,
                  rerollUsed: result.participant.rerollUsed,
                  emoji: result.participant.emoji,
                  lastInitial: result.participant.lastInitial,
                })
                // Persist to localStorage for auto-rejoin
                setStoredIdentity({
                  participantId: result.participant.id,
                  funName: result.participant.funName,
                  emoji: result.participant.emoji,
                  firstName: result.participant.firstName,
                  lastInitial: result.participant.lastInitial,
                  sessionId: sessionInfo.id,
                  joinedAt: Date.now(),
                })
                dispatch({
                  type: 'SET_RETURNING_WELCOME',
                  funName: result.participant.funName,
                  emoji: result.participant.emoji ?? '',
                  emojiChar,
                  participantId: result.participant.id,
                })
              } else {
                // No matches -- continue to emoji picker
                dispatch({ type: 'SUBMIT_LAST_INITIAL', lastInitial })
              }
            }}
          />
        )

      case 'emoji-pick':
        return (
          <WizardStepEmoji
            onSelect={(emoji, emojiChar) => handleEmojiSelect(emoji, emojiChar)}
          />
        )

      case 'welcome':
        return (
          <WizardWelcome
            funName={step.funName}
            emojiChar={step.emojiChar}
            firstName={step.firstName}
            onComplete={handleEnterSession}
          />
        )

      case 'new-match-found':
        return (
          <div className="flex flex-col items-center gap-0">
            <ReturningDisambiguation
              candidates={step.candidates}
              firstName={step.firstName}
              lastInitial={step.lastInitial}
              code={code}
              onClaimed={(result) => {
                // Reclaim existing identity instead of creating new
                if (result.participant) {
                  const emojiChar = result.participant.emoji
                    ? shortcodeToEmoji(result.participant.emoji) ?? ''
                    : ''
                  setSessionParticipant(sessionInfo.id, {
                    participantId: result.participant.id,
                    firstName: result.participant.firstName,
                    funName: result.participant.funName,
                    sessionId: sessionInfo.id,
                    rerollUsed: result.participant.rerollUsed,
                    emoji: result.participant.emoji,
                    lastInitial: result.participant.lastInitial,
                  })
                  // Persist to localStorage for auto-rejoin
                  setStoredIdentity({
                    participantId: result.participant.id,
                    funName: result.participant.funName,
                    emoji: result.participant.emoji,
                    firstName: result.participant.firstName,
                    lastInitial: result.participant.lastInitial,
                    sessionId: sessionInfo.id,
                    joinedAt: Date.now(),
                  })
                  directionRef.current = 1
                  dispatch({
                    type: 'SET_RETURNING_WELCOME',
                    funName: result.participant.funName,
                    emoji: result.participant.emoji ?? '',
                    emojiChar,
                    participantId: result.participant.id,
                  })
                }
              }}
              onNoneOfThese={handleDeclineMatch}
            />
          </div>
        )

      case 'returning-name':
        return (
          <ReturningNameEntry
            code={code}
            onResult={handleReturningResult}
            onRedirectNew={handleRedirectToNew}
          />
        )

      case 'returning-disambiguate':
        return (
          <ReturningDisambiguation
            candidates={step.candidates}
            firstName={step.firstName}
            lastInitial={step.lastInitial}
            code={code}
            onClaimed={handleReturningClaimed}
            onNoneOfThese={handleRedirectToNew}
          />
        )

      case 'returning-welcome':
        return (
          <ReturningWelcome
            funName={step.funName}
            emojiChar={step.emojiChar}
            onComplete={handleEnterSession}
          />
        )

      default:
        return null
    }
  }

  // Wait for initial localStorage check to prevent flash of path-select
  if (!initialCheckDone) {
    return <div className="mx-auto flex min-h-[400px] w-full max-w-md flex-col items-stretch gap-4" />
  }

  return (
    <div className="mx-auto flex min-h-[400px] w-full max-w-md flex-col items-stretch gap-4">
      {/* Session info */}
      <div className="text-center text-sm text-muted-foreground">
        {sessionInfo.name && (
          <p className="font-medium">{sessionInfo.name}</p>
        )}
        {sessionInfo.teacherName && (
          <p>{sessionInfo.teacherName}&apos;s class</p>
        )}
      </div>

      {/* Fun name header (visible during wizard steps) */}
      {headerFunName && <WizardHeader funName={headerFunName} />}

      {/* Step dots (visible during wizard steps) */}
      {stepInfo && (
        <StepDots currentStep={stepInfo.current} totalSteps={stepInfo.total} />
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Animated step content */}
      <div className="relative flex-1">
        <AnimatePresence mode="wait" custom={directionRef.current}>
          <motion.div
            key={step.type}
            custom={directionRef.current}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
