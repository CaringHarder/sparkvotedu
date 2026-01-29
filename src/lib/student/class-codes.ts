import { randomInt } from 'crypto'
import { prisma } from '@/lib/prisma'

const MAX_ATTEMPTS = 10

/**
 * Generate a unique 6-digit class code.
 * Uses crypto.randomInt for secure random generation.
 * Checks against active/paused sessions in the database to ensure uniqueness.
 * With 900,000 possible codes and typically <1000 concurrent sessions,
 * collision probability per attempt is <0.1%, so retry is extremely rare.
 */
export async function generateClassCode(): Promise<string> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    // Generate random 6-digit number (100000-999999)
    const code = String(randomInt(100000, 1000000))

    // Check if code is already in use by an active or paused session
    const existing = await prisma.classSession.findFirst({
      where: {
        code,
        status: { in: ['active', 'paused'] },
      },
    })

    if (!existing) return code
  }

  throw new Error('Failed to generate unique class code after max attempts')
}

/**
 * Validate that a class code is in the correct format.
 * Must be exactly 6 digits.
 */
export function validateClassCode(code: string): boolean {
  return /^\d{6}$/.test(code)
}
