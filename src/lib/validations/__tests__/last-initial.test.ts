import { describe, it, expect } from 'vitest'
import { lastInitialSchema } from '../last-initial'

describe('lastInitialSchema', () => {
  it('trims whitespace and uppercases', () => {
    expect(lastInitialSchema.parse(' r ')).toBe('R')
  })

  it('accepts single letter', () => {
    expect(lastInitialSchema.parse('R')).toBe('R')
  })

  it('accepts two letters', () => {
    expect(lastInitialSchema.parse('Re')).toBe('RE')
  })

  it('accepts lowercase and converts to uppercase', () => {
    expect(lastInitialSchema.parse('m')).toBe('M')
  })

  it('rejects empty string', () => {
    const result = lastInitialSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only string', () => {
    const result = lastInitialSchema.safeParse('   ')
    expect(result.success).toBe(false)
  })

  it('rejects numbers', () => {
    const result = lastInitialSchema.safeParse('1')
    expect(result.success).toBe(false)
  })

  it('rejects special characters', () => {
    const result = lastInitialSchema.safeParse('!')
    expect(result.success).toBe(false)
  })

  it('rejects 3+ characters', () => {
    const result = lastInitialSchema.safeParse('ABC')
    expect(result.success).toBe(false)
  })
})
