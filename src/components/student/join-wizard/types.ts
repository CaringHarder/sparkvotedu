import type { DuplicateCandidate } from '@/types/student'
import type { StoredIdentity } from '@/lib/student/identity-store'

/** Session info passed to the wizard from the join page */
export interface SessionInfo {
  id: string
  name: string | null
  teacherName: string | null
  status: string
}

/** Slide direction: 1 = forward (slide left), -1 = backward (slide right) */
export type SlideDirection = 1 | -1

/** Discriminated union of every wizard screen */
export type WizardStep =
  | { type: 'path-select' }
  | { type: 'fun-name-splash'; funName: string; participantId: string }
  | { type: 'first-name'; funName: string; participantId: string }
  | {
      type: 'last-initial'
      funName: string
      participantId: string
      firstName: string
    }
  | {
      type: 'emoji-pick'
      funName: string
      participantId: string
      firstName: string
      lastInitial: string
    }
  | {
      type: 'welcome'
      funName: string
      emoji: string
      emojiChar: string
      participantId: string
      firstName: string
      lastInitial: string
    }
  | { type: 'returning-name' }
  | {
      type: 'returning-disambiguate'
      candidates: DuplicateCandidate[]
      firstName: string
      lastInitial: string
    }
  | {
      type: 'new-match-found'
      funName: string
      participantId: string
      firstName: string
      lastInitial: string
      candidates: DuplicateCandidate[]
    }
  | {
      type: 'returning-welcome'
      funName: string
      emoji: string
      emojiChar: string
      participantId: string
    }
  | {
      type: 'localStorage-confirm'
      stored: StoredIdentity
    }

/** Reducer actions for wizard state transitions */
export type WizardAction =
  | { type: 'SELECT_NEW' }
  | { type: 'SELECT_RETURNING' }
  | { type: 'SET_FUN_NAME'; funName: string; participantId: string }
  | { type: 'SUBMIT_FIRST_NAME'; firstName: string }
  | { type: 'SUBMIT_LAST_INITIAL'; lastInitial: string }
  | { type: 'SELECT_EMOJI'; emoji: string; emojiChar: string }
  | {
      type: 'SET_RETURNING_DISAMBIGUATE'
      candidates: DuplicateCandidate[]
      firstName: string
      lastInitial: string
    }
  | {
      type: 'SET_RETURNING_WELCOME'
      funName: string
      emoji: string
      emojiChar: string
      participantId: string
    }
  | { type: 'SPLASH_COMPLETE' }
  | {
      type: 'SET_NEW_MATCH_FOUND'
      candidates: DuplicateCandidate[]
      firstName: string
      lastInitial: string
    }
  | { type: 'DECLINE_MATCH' }
  | { type: 'REDIRECT_TO_NEW' }
  | { type: 'SET_STORED_IDENTITY'; stored: StoredIdentity }
  | { type: 'CONFIRM_IDENTITY' }
  | { type: 'DENY_IDENTITY' }
