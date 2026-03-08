import { describe, it, expect } from 'vitest'
import { EMOJI_POOL, pickEmoji, shortcodeToEmoji } from './emoji-pool'

describe('EMOJI_POOL', () => {
  it('has exactly 24 entries', () => {
    expect(EMOJI_POOL).toHaveLength(24)
  })

  it('every entry has shortcode, emoji, and label fields', () => {
    for (const entry of EMOJI_POOL) {
      expect(entry).toHaveProperty('shortcode')
      expect(entry).toHaveProperty('emoji')
      expect(entry).toHaveProperty('label')
      expect(typeof entry.shortcode).toBe('string')
      expect(typeof entry.emoji).toBe('string')
      expect(typeof entry.label).toBe('string')
    }
  })

  it('no shortcode contains colons', () => {
    for (const entry of EMOJI_POOL) {
      expect(entry.shortcode).not.toContain(':')
    }
  })

  it('all shortcodes are <= 20 characters (fits VARCHAR 20)', () => {
    for (const entry of EMOJI_POOL) {
      expect(entry.shortcode.length).toBeLessThanOrEqual(20)
    }
  })

  it('all shortcodes are unique', () => {
    const codes = EMOJI_POOL.map((e) => e.shortcode)
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('pickEmoji', () => {
  it('returns the same EmojiEntry every time for a given name (deterministic)', () => {
    const result1 = pickEmoji('Alice')
    const result2 = pickEmoji('Alice')
    expect(result1).toEqual(result2)
  })

  it('returns different results for different names (distribution)', () => {
    const names = [
      'Alice', 'Bob', 'Charlie', 'Diana', 'Eve',
      'Frank', 'Grace', 'Henry', 'Ivy', 'Jack',
    ]
    const results = new Set(names.map((n) => pickEmoji(n).shortcode))
    expect(results.size).toBeGreaterThanOrEqual(3)
  })

  it('always returns a valid EmojiEntry from the pool', () => {
    const testNames = ['Alice', 'Bob', 'Zara', 'X', '']
    for (const name of testNames) {
      const result = pickEmoji(name)
      expect(EMOJI_POOL).toContainEqual(result)
    }
  })
})

describe('shortcodeToEmoji', () => {
  it('resolves a known shortcode to its emoji character', () => {
    const first = EMOJI_POOL[0]
    expect(shortcodeToEmoji(first.shortcode)).toBe(first.emoji)
  })

  it('returns null for an unknown shortcode', () => {
    expect(shortcodeToEmoji('nonexistent_code_xyz')).toBeNull()
  })

  it('resolves all pool shortcodes', () => {
    for (const entry of EMOJI_POOL) {
      expect(shortcodeToEmoji(entry.shortcode)).toBe(entry.emoji)
    }
  })
})
