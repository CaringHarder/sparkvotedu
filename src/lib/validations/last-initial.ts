import { z } from 'zod'

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

/**
 * Zod schema for a last initial.
 *
 * Pipeline:
 *  1. Accept string
 *  2. Trim whitespace and uppercase
 *  3. Validate length (1-2 letter chars)
 *  4. Return cleaned string
 */
export const lastInitialSchema = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(
    z
      .string()
      .min(1, 'Last initial is required')
      .max(2, 'Last initial must be 1-2 characters')
      .regex(/^[A-Z]{1,2}$/, 'Last initial must be a letter')
  )
