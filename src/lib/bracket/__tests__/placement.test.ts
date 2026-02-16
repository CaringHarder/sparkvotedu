import { describe, it, expect } from 'vitest'
import {
  buildSlotMap,
  seedToSlot,
  slotToSeed,
  swapSlots,
  autoSeed,
  getByeSlots,
  placeEntrantInSlot,
  type PlacementEntrant,
} from '../placement'

describe('buildSlotMap', () => {
  it('returns correct seed order for bracket size 4', () => {
    expect(buildSlotMap(4)).toEqual([1, 4, 2, 3])
  })

  it('returns correct seed order for bracket size 8', () => {
    expect(buildSlotMap(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
  })

  it('returns correct seed order for bracket size 16', () => {
    const result = buildSlotMap(16)
    expect(result).toHaveLength(16)
    // First matchup: 1 vs 16
    expect(result[0]).toBe(1)
    expect(result[1]).toBe(16)
    // Second matchup: 8 vs 9
    expect(result[2]).toBe(8)
    expect(result[3]).toBe(9)
  })

  it('returns [1, 2] for bracket size 2', () => {
    expect(buildSlotMap(2)).toEqual([1, 2])
  })
})

describe('seedToSlot', () => {
  it('maps seed 1 to slot 0 in an 8-bracket', () => {
    expect(seedToSlot(1, 8)).toBe(0)
  })

  it('maps seed 8 to slot 1 in an 8-bracket', () => {
    expect(seedToSlot(8, 8)).toBe(1)
  })

  it('maps seed 4 to slot 2 in an 8-bracket', () => {
    expect(seedToSlot(4, 8)).toBe(2)
  })

  it('maps seed 5 to slot 3 in an 8-bracket', () => {
    expect(seedToSlot(5, 8)).toBe(3)
  })

  it('maps seed 2 to slot 4 in an 8-bracket', () => {
    expect(seedToSlot(2, 8)).toBe(4)
  })

  it('maps seed 1 to slot 0 in a 4-bracket', () => {
    expect(seedToSlot(1, 4)).toBe(0)
  })

  it('maps seed 4 to slot 1 in a 4-bracket', () => {
    expect(seedToSlot(4, 4)).toBe(1)
  })

  it('maps seed 2 to slot 2 in a 4-bracket', () => {
    expect(seedToSlot(2, 4)).toBe(2)
  })

  it('maps seed 3 to slot 3 in a 4-bracket', () => {
    expect(seedToSlot(3, 4)).toBe(3)
  })

  it('returns -1 for seed not found in bracket', () => {
    expect(seedToSlot(9, 8)).toBe(-1)
  })
})

describe('slotToSeed', () => {
  it('maps slot 0 to seed 1 in an 8-bracket', () => {
    expect(slotToSeed(0, 8)).toBe(1)
  })

  it('maps slot 1 to seed 8 in an 8-bracket', () => {
    expect(slotToSeed(1, 8)).toBe(8)
  })

  it('maps slot 2 to seed 4 in an 8-bracket', () => {
    expect(slotToSeed(2, 8)).toBe(4)
  })

  it('maps slot 4 to seed 2 in an 8-bracket', () => {
    expect(slotToSeed(4, 8)).toBe(2)
  })

  it('returns the seed at any valid slot in a 4-bracket', () => {
    // Slot map for 4: [1, 4, 2, 3]
    expect(slotToSeed(0, 4)).toBe(1)
    expect(slotToSeed(1, 4)).toBe(4)
    expect(slotToSeed(2, 4)).toBe(2)
    expect(slotToSeed(3, 4)).toBe(3)
  })

  it('returns -1 for out-of-bounds slot', () => {
    expect(slotToSeed(8, 8)).toBe(-1)
    expect(slotToSeed(-1, 8)).toBe(-1)
  })
})

describe('swapSlots', () => {
  const makeEntrants = (count: number): PlacementEntrant[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `e${i + 1}`,
      name: `Entrant ${i + 1}`,
      seedPosition: i + 1,
    }))

  it('swaps two entrants in different slots (8-bracket)', () => {
    // 8-bracket slot map: [1, 8, 4, 5, 2, 7, 3, 6]
    // Slot 0 has seed 1 (Entrant 1), slot 1 has seed 8 (Entrant 8)
    const entrants = makeEntrants(8)
    const result = swapSlots(entrants, 0, 1, 8)

    // After swap: entrant that was seed 1 should now be seed 8, and vice versa
    const e1 = result.find((e) => e.id === 'e1')!
    const e8 = result.find((e) => e.id === 'e8')!
    expect(e1.seedPosition).toBe(8)
    expect(e8.seedPosition).toBe(1)
  })

  it('swapping same slot returns unchanged entrants', () => {
    const entrants = makeEntrants(4)
    const result = swapSlots(entrants, 0, 0, 4)
    expect(result).toEqual(entrants)
  })

  it('does not mutate original array', () => {
    const entrants = makeEntrants(8)
    const original = entrants.map((e) => ({ ...e }))
    swapSlots(entrants, 0, 1, 8)
    expect(entrants).toEqual(original)
  })

  it('swaps entrants in a 4-bracket correctly', () => {
    // 4-bracket slot map: [1, 4, 2, 3]
    // Slot 0 has seed 1, slot 2 has seed 2
    const entrants = makeEntrants(4)
    const result = swapSlots(entrants, 0, 2, 4)

    const e1 = result.find((e) => e.id === 'e1')!
    const e2 = result.find((e) => e.id === 'e2')!
    expect(e1.seedPosition).toBe(2) // Was seed 1, now seed 2 (slot 2's seed)
    expect(e2.seedPosition).toBe(1) // Was seed 2, now seed 1 (slot 0's seed)
  })
})

describe('autoSeed', () => {
  it('resets entrants to natural seed order', () => {
    const entrants: PlacementEntrant[] = [
      { id: 'e1', name: 'Entrant 1', seedPosition: 3 },
      { id: 'e2', name: 'Entrant 2', seedPosition: 1 },
      { id: 'e3', name: 'Entrant 3', seedPosition: 4 },
      { id: 'e4', name: 'Entrant 4', seedPosition: 2 },
    ]
    const result = autoSeed(entrants)
    expect(result[0].seedPosition).toBe(1)
    expect(result[1].seedPosition).toBe(2)
    expect(result[2].seedPosition).toBe(3)
    expect(result[3].seedPosition).toBe(4)
  })

  it('preserves entrant ids and names, only changes seedPosition', () => {
    const entrants: PlacementEntrant[] = [
      { id: 'a', name: 'Alpha', seedPosition: 2 },
      { id: 'b', name: 'Beta', seedPosition: 1 },
    ]
    const result = autoSeed(entrants)
    expect(result.find((e) => e.id === 'a')!.name).toBe('Alpha')
    expect(result.find((e) => e.id === 'b')!.name).toBe('Beta')
  })

  it('does not mutate original array', () => {
    const entrants: PlacementEntrant[] = [
      { id: 'a', name: 'A', seedPosition: 2 },
      { id: 'b', name: 'B', seedPosition: 1 },
    ]
    const original = entrants.map((e) => ({ ...e }))
    autoSeed(entrants)
    expect(entrants).toEqual(original)
  })

  it('assigns sequential seeds starting from 1', () => {
    const entrants: PlacementEntrant[] = [
      { id: 'x', name: 'X', seedPosition: 5 },
      { id: 'y', name: 'Y', seedPosition: 3 },
      { id: 'z', name: 'Z', seedPosition: 7 },
    ]
    const result = autoSeed(entrants)
    const seeds = result.map((e) => e.seedPosition).sort((a, b) => a - b)
    expect(seeds).toEqual([1, 2, 3])
  })
})

describe('getByeSlots', () => {
  it('returns empty array for power-of-2 entrant count', () => {
    expect(getByeSlots(8, 8)).toEqual([])
    expect(getByeSlots(4, 4)).toEqual([])
    expect(getByeSlots(16, 16)).toEqual([])
  })

  it('returns bye slot indices for 5 entrants in 8-bracket', () => {
    // 8-bracket slot map: [1, 8, 4, 5, 2, 7, 3, 6]
    // 5 entrants: phantom seeds are 6, 7, 8
    // Seed 8 -> slot 1, seed 7 -> slot 5, seed 6 -> slot 7
    const result = getByeSlots(5, 8)
    expect(result).toHaveLength(3)
    expect(result).toContain(1) // seed 8
    expect(result).toContain(5) // seed 7
    expect(result).toContain(7) // seed 6
  })

  it('returns bye slot indices for 6 entrants in 8-bracket', () => {
    // Phantom seeds: 7, 8
    // Seed 8 -> slot 1, seed 7 -> slot 5
    const result = getByeSlots(6, 8)
    expect(result).toHaveLength(2)
    expect(result).toContain(1) // seed 8
    expect(result).toContain(5) // seed 7
  })

  it('returns bye slot indices for 7 entrants in 8-bracket', () => {
    // Phantom seed: 8
    // Seed 8 -> slot 1
    const result = getByeSlots(7, 8)
    expect(result).toHaveLength(1)
    expect(result).toContain(1) // seed 8
  })

  it('returns correct bye slots for 3 entrants in 4-bracket', () => {
    // 4-bracket slot map: [1, 4, 2, 3]
    // 3 entrants: phantom seed is 4
    // Seed 4 -> slot 1
    const result = getByeSlots(3, 4)
    expect(result).toHaveLength(1)
    expect(result).toContain(1) // seed 4
  })
})

describe('placeEntrantInSlot', () => {
  const makeEntrants = (count: number): PlacementEntrant[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `e${i + 1}`,
      name: `Entrant ${i + 1}`,
      seedPosition: i + 1,
    }))

  it('places entrant into an empty bye slot', () => {
    // 8-bracket, 5 entrants: slots 1, 5, 7 are byes (seeds 8, 7, 6)
    // Place entrant e1 (seed 1, slot 0) into slot 1 (bye, seed 8)
    const entrants = makeEntrants(5)
    const result = placeEntrantInSlot(entrants, 'e1', 1, 8)

    const e1 = result.find((e) => e.id === 'e1')!
    expect(e1.seedPosition).toBe(8) // Moved to seed 8 (slot 1)
  })

  it('swaps entrants when target slot is occupied', () => {
    // 4-bracket: slot map [1, 4, 2, 3]
    // e1 is seed 1 (slot 0), e4 is seed 4 (slot 1)
    const entrants = makeEntrants(4)
    const result = placeEntrantInSlot(entrants, 'e1', 1, 4)

    const e1 = result.find((e) => e.id === 'e1')!
    const e4 = result.find((e) => e.id === 'e4')!
    expect(e1.seedPosition).toBe(4) // Moved to slot 1's seed
    expect(e4.seedPosition).toBe(1) // Moved to slot 0's seed (where e1 was)
  })

  it('does not mutate original array', () => {
    const entrants = makeEntrants(4)
    const original = entrants.map((e) => ({ ...e }))
    placeEntrantInSlot(entrants, 'e1', 1, 4)
    expect(entrants).toEqual(original)
  })

  it('returns unchanged array if entrant is already in target slot', () => {
    // e1 is seed 1, which is slot 0 in any bracket
    const entrants = makeEntrants(4)
    const result = placeEntrantInSlot(entrants, 'e1', 0, 4)
    expect(result).toEqual(entrants)
  })
})
