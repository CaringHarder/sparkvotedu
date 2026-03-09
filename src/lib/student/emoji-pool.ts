/**
 * Curated pool of K-12 safe emoji identities for student participants.
 * No people, faces, or skin-tone-variable emojis.
 * Shortcodes stored without colons (e.g., "rocket" not ":rocket:").
 */

export interface EmojiEntry {
  /** Plain shortcode without colons, max 20 chars */
  shortcode: string
  /** Unicode emoji character */
  emoji: string
  /** Accessible label for screen readers */
  label: string
}

/**
 * 24 curated K-12-safe emojis. Mix of playful, animals, nature, and objects.
 * No people, faces, or skin-tone-variable emojis.
 */
export const EMOJI_POOL: EmojiEntry[] = [
  // Playful
  { shortcode: 'rocket', emoji: '\u{1F680}', label: 'rocket' },
  { shortcode: 'unicorn', emoji: '\u{1F984}', label: 'unicorn' },
  { shortcode: 'pizza', emoji: '\u{1F355}', label: 'pizza' },
  { shortcode: 'rainbow', emoji: '\u{1F308}', label: 'rainbow' },
  { shortcode: 'fire', emoji: '\u{1F525}', label: 'fire' },
  { shortcode: 'lightning', emoji: '\u{26A1}', label: 'lightning' },
  { shortcode: 'sparkles', emoji: '\u{2728}', label: 'sparkles' },
  { shortcode: 'balloon', emoji: '\u{1F388}', label: 'balloon' },

  // Animals
  { shortcode: 'butterfly', emoji: '\u{1F98B}', label: 'butterfly' },
  { shortcode: 'dolphin', emoji: '\u{1F42C}', label: 'dolphin' },
  { shortcode: 'owl', emoji: '\u{1F989}', label: 'owl' },
  { shortcode: 'penguin', emoji: '\u{1F427}', label: 'penguin' },
  { shortcode: 'turtle', emoji: '\u{1F422}', label: 'turtle' },
  { shortcode: 'octopus', emoji: '\u{1F419}', label: 'octopus' },

  // Nature
  { shortcode: 'star', emoji: '\u{2B50}', label: 'star' },
  { shortcode: 'moon', emoji: '\u{1F319}', label: 'crescent moon' },
  { shortcode: 'sun', emoji: '\u{2600}\u{FE0F}', label: 'sun' },
  { shortcode: 'evergreen', emoji: '\u{1F332}', label: 'evergreen tree' },
  { shortcode: 'sunflower', emoji: '\u{1F33B}', label: 'sunflower' },
  { shortcode: 'mushroom', emoji: '\u{1F344}', label: 'mushroom' },

  // Objects
  { shortcode: 'gem', emoji: '\u{1F48E}', label: 'gem stone' },
  { shortcode: 'globe', emoji: '\u{1F30D}', label: 'globe' },
  { shortcode: 'paintbrush', emoji: '\u{1F58C}\u{FE0F}', label: 'paintbrush' },
  { shortcode: 'music', emoji: '\u{1F3B5}', label: 'musical note' },
]

/**
 * Sentinel shortcode assigned to pre-existing participants who never chose an emoji.
 * Not in EMOJI_POOL — triggers the migration picker on next sign-in.
 */
export const MIGRATION_SENTINEL = 'question'

/** Unicode for the migration sentinel (❓) */
export const MIGRATION_SENTINEL_EMOJI = '\u{2753}'

/** Check whether a shortcode needs emoji migration */
export function needsEmojiMigration(shortcode: string | null | undefined): boolean {
  return shortcode === null || shortcode === undefined || shortcode === MIGRATION_SENTINEL
}

/** Lookup map for O(1) shortcode resolution */
const shortcodeMap = new Map<string, string>(
  EMOJI_POOL.map((e) => [e.shortcode, e.emoji])
)

/**
 * Pick an emoji deterministically based on the student's first name.
 * Uses a djb2-style hash to map name -> pool index.
 */
export function pickEmoji(firstName: string): EmojiEntry {
  let hash = 5381
  for (let i = 0; i < firstName.length; i++) {
    hash = ((hash << 5) + hash + firstName.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % EMOJI_POOL.length
  return EMOJI_POOL[index]
}

/**
 * Resolve a shortcode to its emoji character.
 * Returns null if the shortcode is not in the pool.
 */
export function shortcodeToEmoji(shortcode: string): string | null {
  if (shortcode === MIGRATION_SENTINEL) return MIGRATION_SENTINEL_EMOJI
  return shortcodeMap.get(shortcode) ?? null
}
