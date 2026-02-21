import { z } from 'zod'
import { Profanity, ProfanityOptions } from '@2toad/profanity'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FIRST_NAME_MIN_LENGTH = 2
export const FIRST_NAME_MAX_LENGTH = 50

// ---------------------------------------------------------------------------
// Profanity filter (whole-word matching to reduce false positives)
// ---------------------------------------------------------------------------

const profanityOptions = new ProfanityOptions()
profanityOptions.wholeWord = true

const profanity = new Profanity(profanityOptions)

// Whitelist legitimate names that might trigger the filter
profanity.whitelist.addWords(['Dick', 'Fanny', 'Willy', 'Randy', 'Gaylord'])

// ---------------------------------------------------------------------------
// Emoji regex -- comprehensive Unicode ranges
// ---------------------------------------------------------------------------

const EMOJI_REGEX =
  // eslint-disable-next-line no-misleading-character-class
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/u

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Trim leading/trailing whitespace and collapse internal runs to a single space. */
function normalizeWhitespace(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

// ---------------------------------------------------------------------------
// Error messages
// ---------------------------------------------------------------------------

const ERRORS = {
  tooShort: `Name must be at least ${FIRST_NAME_MIN_LENGTH} characters`,
  tooLong: `Name must be ${FIRST_NAME_MAX_LENGTH} characters or less`,
  hasEmoji: 'Please use letters only -- no emojis',
  profanity: 'Please enter your real first name',
} as const

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

/**
 * Zod schema for a first name.
 *
 * Pipeline:
 *  1. Accept string
 *  2. Trim + collapse whitespace
 *  3. Validate length (2-50)
 *  4. Reject emojis
 *  5. Reject profanity
 *  6. Return cleaned string
 */
export const firstNameSchema = z
  .string()
  .transform(normalizeWhitespace)
  .pipe(
    z
      .string()
      .min(FIRST_NAME_MIN_LENGTH, ERRORS.tooShort)
      .max(FIRST_NAME_MAX_LENGTH, ERRORS.tooLong)
      .refine((val) => !EMOJI_REGEX.test(val), ERRORS.hasEmoji)
      .refine((val) => !profanity.exists(val), ERRORS.profanity),
  )

// ---------------------------------------------------------------------------
// Standalone validation function
// ---------------------------------------------------------------------------

type ValidationResult =
  | { valid: true; name: string }
  | { valid: false; error: string }

/**
 * Validate and normalise a first-name string.
 *
 * Returns a discriminated union so callers can handle success/failure without
 * depending on Zod.
 */
export function validateFirstName(raw: string): ValidationResult {
  const result = firstNameSchema.safeParse(raw)

  if (result.success) {
    return { valid: true, name: result.data }
  }

  // Return the first validation error
  const firstIssue = result.error.issues[0]
  return { valid: false, error: firstIssue?.message ?? 'Invalid name' }
}
