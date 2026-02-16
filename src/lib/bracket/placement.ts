import { buildSeedOrder } from './engine'
import { calculateBracketSizeWithByes } from './byes'

/**
 * Entrant data for placement operations.
 * Minimal interface: id, name, and current seedPosition.
 */
export interface PlacementEntrant {
  id: string
  name: string
  seedPosition: number
}

/**
 * Build the seed-to-slot mapping array for a bracket size.
 * Returns the same array as buildSeedOrder: index = slot, value = seed.
 *
 * @param bracketSize - Power-of-2 bracket size
 * @returns Array where index is slot and value is seed number
 *
 * @example
 * buildSlotMap(4) // [1, 4, 2, 3]
 * buildSlotMap(8) // [1, 8, 4, 5, 2, 7, 3, 6]
 */
export function buildSlotMap(bracketSize: number): number[] {
  return buildSeedOrder(bracketSize)
}

/**
 * Convert a seed position to a bracket slot index.
 *
 * @param seedPosition - 1-indexed seed number
 * @param bracketSize - Power-of-2 bracket size
 * @returns 0-indexed slot index, or -1 if seed not found
 *
 * @example
 * seedToSlot(1, 8) // 0
 * seedToSlot(8, 8) // 1
 */
export function seedToSlot(seedPosition: number, bracketSize: number): number {
  const slotMap = buildSeedOrder(bracketSize)
  const index = slotMap.indexOf(seedPosition)
  return index
}

/**
 * Convert a bracket slot index to a seed position.
 *
 * @param slotIndex - 0-indexed slot in the bracket
 * @param bracketSize - Power-of-2 bracket size
 * @returns 1-indexed seed number, or -1 if slot out of bounds
 *
 * @example
 * slotToSeed(0, 8) // 1
 * slotToSeed(1, 8) // 8
 */
export function slotToSeed(slotIndex: number, bracketSize: number): number {
  const slotMap = buildSeedOrder(bracketSize)
  if (slotIndex < 0 || slotIndex >= slotMap.length) {
    return -1
  }
  return slotMap[slotIndex]
}

/**
 * Swap two entrants between bracket slots.
 *
 * Finds which entrants occupy slotA and slotB (via their seedPositions),
 * then swaps their seedPositions. Returns a new array (immutable).
 *
 * @param entrants - Current entrant list
 * @param slotA - First slot index
 * @param slotB - Second slot index
 * @param bracketSize - Power-of-2 bracket size
 * @returns New entrant array with swapped seedPositions
 */
export function swapSlots(
  entrants: PlacementEntrant[],
  slotA: number,
  slotB: number,
  bracketSize: number
): PlacementEntrant[] {
  if (slotA === slotB) {
    return entrants
  }

  const seedA = slotToSeed(slotA, bracketSize)
  const seedB = slotToSeed(slotB, bracketSize)

  return entrants.map((e) => {
    if (e.seedPosition === seedA) {
      return { ...e, seedPosition: seedB }
    }
    if (e.seedPosition === seedB) {
      return { ...e, seedPosition: seedA }
    }
    return e
  })
}

/**
 * Auto-seed entrants in natural order (1, 2, 3, ...).
 *
 * Sorts entrants by their current array index and assigns sequential
 * seedPositions starting from 1. Returns a new array (immutable).
 *
 * @param entrants - Current entrant list
 * @returns New entrant array with sequential seedPositions
 */
export function autoSeed(entrants: PlacementEntrant[]): PlacementEntrant[] {
  return entrants.map((e, i) => ({
    ...e,
    seedPosition: i + 1,
  }))
}

/**
 * Get the bracket slot indices that are bye positions.
 *
 * Bye positions are slots occupied by phantom seeds (seeds > entrantCount).
 * These are the positions where no real entrant exists.
 *
 * @param entrantCount - Number of actual entrants
 * @param bracketSize - Power-of-2 bracket size (>= entrantCount)
 * @returns Array of 0-indexed slot indices that are byes
 *
 * @example
 * getByeSlots(5, 8) // [1, 5, 7] (seeds 8, 7, 6)
 * getByeSlots(8, 8) // []
 */
export function getByeSlots(
  entrantCount: number,
  bracketSize: number
): number[] {
  if (entrantCount >= bracketSize) {
    return []
  }

  const slotMap = buildSeedOrder(bracketSize)
  const byeSlots: number[] = []

  for (let i = 0; i < slotMap.length; i++) {
    if (slotMap[i] > entrantCount) {
      byeSlots.push(i)
    }
  }

  return byeSlots
}

/**
 * Place an entrant into a specific bracket slot.
 *
 * If the target slot is unoccupied (bye or empty), the entrant's seedPosition
 * is updated to the target slot's seed. If occupied, the two entrants swap
 * seedPositions. Returns a new array (immutable).
 *
 * @param entrants - Current entrant list
 * @param entrantId - ID of entrant to place
 * @param targetSlot - Target bracket slot index
 * @param bracketSize - Power-of-2 bracket size
 * @returns New entrant array with updated seedPositions
 */
export function placeEntrantInSlot(
  entrants: PlacementEntrant[],
  entrantId: string,
  targetSlot: number,
  bracketSize: number
): PlacementEntrant[] {
  const targetSeed = slotToSeed(targetSlot, bracketSize)
  const entrant = entrants.find((e) => e.id === entrantId)

  if (!entrant) {
    return entrants
  }

  // If already in the target slot, no-op
  if (entrant.seedPosition === targetSeed) {
    return entrants
  }

  // Find the current slot of the entrant
  const currentSlot = seedToSlot(entrant.seedPosition, bracketSize)

  // Swap the two slots (handles both entrant-entrant and entrant-bye cases)
  return swapSlots(entrants, currentSlot, targetSlot, bracketSize)
}
