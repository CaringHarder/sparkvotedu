'use client'

import { useReducer, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { createWizardParticipant, completeWizardProfile } from '@/actions/student'
import { setSessionParticipant } from '@/lib/student/session-store'
import { PathSelector } from './path-selector'
import { StepDots } from './step-dots'
import { WizardHeader } from './wizard-header'
import { FunNameSplash } from './fun-name-splash'
import { WizardStepFirstName } from './wizard-step-first-name'
import { WizardStepLastInitial } from './wizard-step-last-initial'
import { WizardStepEmoji } from './wizard-step-emoji'
import { WizardWelcome } from './wizard-welcome'
import type { SessionInfo, WizardStep, WizardAction, SlideDirection } from './types'

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
    },
    [step, sessionInfo.id]
  )

  // Handler for entering session after welcome screen
  const handleEnterSession = useCallback(() => {
    router.push(`/session/${sessionInfo.id}`)
  }, [router, sessionInfo.id])

  // Determine step dots and header visibility
  const stepInfo = getStepNumber(step)
  const headerFunName = showHeader(step)

  // Render current step content
  const renderStepContent = () => {
    switch (step.type) {
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
            onSubmit={(lastInitial) => {
              directionRef.current = 1
              dispatch({ type: 'SUBMIT_LAST_INITIAL', lastInitial })
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

      case 'returning-name':
        return (
          <div className="py-4 text-center text-muted-foreground">
            <p>Returning student name entry (Plan 03)</p>
          </div>
        )

      case 'returning-disambiguate':
        return (
          <div className="py-4 text-center text-muted-foreground">
            <p>Returning student disambiguation (Plan 03)</p>
          </div>
        )

      case 'returning-welcome':
        return (
          <div className="py-4 text-center text-muted-foreground">
            <p>Returning student welcome (Plan 03)</p>
          </div>
        )

      default:
        return null
    }
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
