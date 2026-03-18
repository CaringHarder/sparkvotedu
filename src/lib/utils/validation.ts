import { z } from 'zod'

export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
})

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>

// Bracket validation schemas
export const bracketSizeSchema = z.number().int().min(3).max(128)

export const bracketTypeSchema = z.enum([
  'single_elimination',
  'double_elimination',
  'round_robin',
  'predictive',
])

export const createBracketSchema = z.object({
  name: z
    .string()
    .min(1, 'Bracket name is required')
    .max(100, 'Bracket name must be 100 characters or less'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  size: bracketSizeSchema,
  bracketType: bracketTypeSchema.default('single_elimination'),
  sessionId: z.string().uuid().optional(),
  // Round-robin options (only used when bracketType is round_robin)
  roundRobinPacing: z.enum(['round_by_round', 'all_at_once']).optional(),
  roundRobinVotingStyle: z.enum(['simple', 'advanced']).optional(),
  roundRobinStandingsMode: z.enum(['live', 'suspenseful']).optional(),
  // Predictive options (only used when bracketType is predictive)
  predictiveMode: z.enum(['simple', 'advanced']).optional(),
  predictiveResolutionMode: z.enum(['manual', 'vote_based', 'auto']).optional(),
  // Play-in option (only used for double_elimination)
  playInEnabled: z.boolean().optional(),
  // Viewing mode (only used for single_elimination)
  viewingMode: z.enum(['simple', 'advanced']).optional(),
  // Seed number visibility
  showSeedNumbers: z.boolean().optional(),
})

export const entrantSchema = z.object({
  name: z
    .string()
    .min(1, 'Entrant name is required')
    .max(100, 'Entrant name must be 100 characters or less'),
  seedPosition: z.number().int().positive(),
  logoUrl: z.string().url().nullable().optional(),
})

export const updateEntrantsSchema = z.object({
  bracketId: z.string().uuid(),
  entrants: z
    .array(entrantSchema)
    .min(3, 'At least 3 entrants required')
    .max(128, 'Maximum 128 entrants'),
})

export const updateBracketStatusSchema = z.object({
  bracketId: z.string().uuid(),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
})

export const deleteBracketSchema = z.object({
  bracketId: z.string().uuid(),
})

export type CreateBracketInput = z.infer<typeof createBracketSchema>
export type EntrantInput = z.infer<typeof entrantSchema>
export type UpdateEntrantsInput = z.infer<typeof updateEntrantsSchema>
export type UpdateBracketStatusInput = z.infer<typeof updateBracketStatusSchema>
export type DeleteBracketInput = z.infer<typeof deleteBracketSchema>

// Vote validation schemas
export const castVoteSchema = z.object({
  matchupId: z.string().uuid(),
  participantId: z.string().uuid(),
  entrantId: z.string().uuid(),
})

export const advanceMatchupSchema = z.object({
  bracketId: z.string().uuid(),
  matchupId: z.string().uuid(),
  winnerId: z.string().uuid(),
})

export const openVotingSchema = z.object({
  bracketId: z.string().uuid(),
  matchupIds: z.array(z.string().uuid()).min(1),
})

export const updateBracketVotingSettingsSchema = z.object({
  bracketId: z.string().uuid(),
  viewingMode: z.enum(['simple', 'advanced']).optional(),
  showVoteCounts: z.boolean().optional(),
  showSeedNumbers: z.boolean().optional(),
  votingTimerSeconds: z.number().int().positive().nullable().optional(),
})

export type CastVoteInput = z.infer<typeof castVoteSchema>
export type AdvanceMatchupInput = z.infer<typeof advanceMatchupSchema>
export type OpenVotingInput = z.infer<typeof openVotingSchema>
export type UpdateBracketVotingSettingsInput = z.infer<typeof updateBracketVotingSettingsSchema>

// Prediction validation schemas
export const submitPredictionSchema = z.object({
  bracketId: z.string().uuid(),
  participantId: z.string().uuid(),
  predictions: z.array(z.object({
    matchupId: z.string().uuid(),
    predictedWinnerId: z.string().uuid(),
  })).min(1),
})

export const updatePredictionStatusSchema = z.object({
  bracketId: z.string().uuid(),
  status: z.enum(['predictions_open', 'active', 'tabulating', 'previewing', 'revealing', 'completed']),
})

export const revealRoundSchema = z.object({
  bracketId: z.string().uuid(),
  round: z.number().int().min(1),
})

export const overrideMatchupWinnerSchema = z.object({
  bracketId: z.string().uuid(),
  matchupId: z.string().uuid(),
  winnerId: z.string().uuid(),
})

export const prepareResultsSchema = z.object({
  bracketId: z.string().uuid(),
})

// Undo round advancement validation schema
export const undoRoundSchema = z.object({
  bracketId: z.string().uuid(),
  round: z.number().int().positive(),
  region: z.enum(['winners', 'losers', 'grand_finals']).optional(),
})

export type UndoRoundInput = z.infer<typeof undoRoundSchema>

// Reopen completed bracket validation schema
export const reopenBracketSchema = z.object({
  bracketId: z.string().uuid(),
})

export type ReopenBracketInput = z.infer<typeof reopenBracketSchema>

// Update bracket viewing mode schema
export const updateBracketViewingModeSchema = z.object({
  bracketId: z.string().uuid(),
  viewingMode: z.enum(['simple', 'advanced']),
})

export type UpdateBracketViewingModeInput = z.infer<typeof updateBracketViewingModeSchema>

// Consolidated bracket settings schema (replaces updateBracketViewingModeSchema for callers)
export const updateBracketSettingsSchema = z.object({
  bracketId: z.string().uuid(),
  viewingMode: z.enum(['simple', 'advanced']).optional(),
  showSeedNumbers: z.boolean().optional(),
  showVoteCounts: z.boolean().optional(),
  finalFourPairing: z.string().optional(),
})
export type UpdateBracketSettingsInput = z.infer<typeof updateBracketSettingsSchema>

// Reopen closed poll validation schema
export const reopenPollSchema = z.object({
  pollId: z.string().uuid(),
})

export type ReopenPollInput = z.infer<typeof reopenPollSchema>

// Round-robin validation schemas
export const recordRoundRobinResultSchema = z.object({
  bracketId: z.string().uuid(),
  matchupId: z.string().uuid(),
  winnerId: z.string().uuid().nullable(), // null = tie
})

export type SubmitPredictionInput = z.infer<typeof submitPredictionSchema>
export type UpdatePredictionStatusInput = z.infer<typeof updatePredictionStatusSchema>
export type RecordRoundRobinResultInput = z.infer<typeof recordRoundRobinResultSchema>
export type RevealRoundInput = z.infer<typeof revealRoundSchema>
export type OverrideMatchupWinnerInput = z.infer<typeof overrideMatchupWinnerSchema>
export type PrepareResultsInput = z.infer<typeof prepareResultsSchema>

// Poll validation schemas
export const createPollSchema = z.object({
  question: z
    .string()
    .min(1, 'Poll question is required')
    .max(300, 'Question must be 300 characters or less'),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional(),
  pollType: z.enum(['simple', 'ranked']),
  allowVoteChange: z.boolean().optional(),
  showLiveResults: z.boolean().optional(),
  rankingDepth: z.number().int().positive().nullable().optional(),
  sessionId: z.string().uuid().optional(),
})

export const pollOptionSchema = z.object({
  text: z
    .string()
    .min(1, 'Option text is required')
    .max(200, 'Option text must be 200 characters or less'),
  imageUrl: z.string().url().nullable().optional(),
  position: z.number().int().min(0),
})

export const castPollVoteSchema = z.object({
  pollId: z.string().uuid(),
  participantId: z.string().uuid(),
  optionId: z.string().uuid(),
})

export const castRankedPollVoteSchema = z.object({
  pollId: z.string().uuid(),
  participantId: z.string().uuid(),
  rankings: z
    .array(
      z.object({
        optionId: z.string().uuid(),
        rank: z.number().int().positive(),
      })
    )
    .min(1),
})

export const updatePollStatusSchema = z.object({
  pollId: z.string().uuid(),
  status: z.enum(['draft', 'active', 'paused', 'closed', 'archived']),
})

export const deletePollSchema = z.object({
  pollId: z.string().uuid(),
})

export type CreatePollInput = z.infer<typeof createPollSchema>
export type PollOptionInput = z.infer<typeof pollOptionSchema>
export type CastPollVoteInput = z.infer<typeof castPollVoteSchema>
export type CastRankedPollVoteInput = z.infer<typeof castRankedPollVoteSchema>
export type UpdatePollStatusInput = z.infer<typeof updatePollStatusSchema>
export type DeletePollInput = z.infer<typeof deletePollSchema>

// Sports integration validation schemas
export const importTournamentSchema = z.object({
  tournamentId: z.string().min(1),
  season: z.number().int().min(2020),
  sessionId: z.string().uuid(),
})

export type ImportTournamentInput = z.infer<typeof importTournamentSchema>
