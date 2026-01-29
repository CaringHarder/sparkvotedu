import { ADJECTIVES, ANIMALS } from './fun-names-words'

const MAX_ATTEMPTS = 100

/**
 * Generate a unique alliterative fun name for a class session.
 * Names follow the pattern "Adjective Animal" where both start with the same letter.
 *
 * Strategy:
 * 1. Pick a random letter that has both adjectives and animals
 * 2. Pick a random adjective and animal starting with that letter
 * 3. Check uniqueness within the session via the existingNames Set
 * 4. Retry with different combinations if collision occurs
 *
 * @param existingNames - Set of fun names already used in the session
 * @returns A unique alliterative fun name (e.g., "Daring Dragon", "Mighty Moose")
 */
export function generateFunName(existingNames: Set<string>): string {
  const letters = Object.keys(ADJECTIVES).filter(
    (letter) => ANIMALS[letter]?.length > 0
  )

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const letter = letters[Math.floor(Math.random() * letters.length)]
    const adj =
      ADJECTIVES[letter][Math.floor(Math.random() * ADJECTIVES[letter].length)]
    const animal =
      ANIMALS[letter][Math.floor(Math.random() * ANIMALS[letter].length)]
    const name = `${adj} ${animal}`

    if (!existingNames.has(name)) return name
  }

  // Fallback: append a number (extremely unlikely with large word lists)
  return `Student ${Math.floor(Math.random() * 9000) + 1000}`
}
