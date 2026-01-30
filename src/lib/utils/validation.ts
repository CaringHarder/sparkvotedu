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
export const bracketSizeSchema = z.union([z.literal(4), z.literal(8), z.literal(16)])

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
  sessionId: z.string().uuid().optional(),
})

export const entrantSchema = z.object({
  name: z
    .string()
    .min(1, 'Entrant name is required')
    .max(100, 'Entrant name must be 100 characters or less'),
  seedPosition: z.number().int().positive(),
})

export const updateEntrantsSchema = z.object({
  bracketId: z.string().uuid(),
  entrants: z
    .array(entrantSchema)
    .min(4, 'At least 4 entrants required')
    .max(16, 'Maximum 16 entrants'),
})

export const updateBracketStatusSchema = z.object({
  bracketId: z.string().uuid(),
  status: z.enum(['draft', 'active', 'completed']),
})

export const deleteBracketSchema = z.object({
  bracketId: z.string().uuid(),
})

export type CreateBracketInput = z.infer<typeof createBracketSchema>
export type EntrantInput = z.infer<typeof entrantSchema>
export type UpdateEntrantsInput = z.infer<typeof updateEntrantsSchema>
export type UpdateBracketStatusInput = z.infer<typeof updateBracketStatusSchema>
export type DeleteBracketInput = z.infer<typeof deleteBracketSchema>
