/**
 * localStorage identity persistence for returning students.
 *
 * Stores participant identities keyed by sessionId so students
 * returning to the same class code on the same device can auto-rejoin
 * without going through the full wizard.
 *
 * Single localStorage key: `sparkvotedu_identities`
 * Schema versioned (v: 1) for future migration.
 * TTL of 90 days (semester-length for school use).
 * Max 50 entries cap to prevent unbounded growth.
 *
 * All read/write operations wrapped in try/catch for graceful
 * degradation when localStorage is unavailable (ephemeral
 * Chromebooks, private browsing, SSR).
 */

const STORAGE_KEY = 'sparkvotedu_identities'
const SCHEMA_VERSION = 1
const TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 days
const MAX_ENTRIES = 50

export interface StoredIdentity {
  participantId: string
  funName: string
  emoji: string | null
  firstName: string
  lastInitial: string | null
  sessionId: string
  joinedAt: number
}

interface IdentityStore {
  v: number
  identities: Record<string, StoredIdentity>
}

function readStore(): IdentityStore {
  if (typeof window === 'undefined') return { v: SCHEMA_VERSION, identities: {} }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { v: SCHEMA_VERSION, identities: {} }
    const parsed = JSON.parse(raw) as IdentityStore
    if (!parsed || typeof parsed !== 'object' || parsed.v !== SCHEMA_VERSION) {
      return { v: SCHEMA_VERSION, identities: {} }
    }
    return parsed
  } catch {
    return { v: SCHEMA_VERSION, identities: {} }
  }
}

function writeStore(store: IdentityStore): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // localStorage unavailable -- fail-silent
  }
}

/**
 * Prune expired entries (older than TTL) and cap at MAX_ENTRIES.
 * Sorts by joinedAt descending so newest entries survive.
 */
function pruneStore(store: IdentityStore): IdentityStore {
  const now = Date.now()
  const entries = Object.values(store.identities)
    .filter((entry) => now - entry.joinedAt < TTL_MS)
    .sort((a, b) => b.joinedAt - a.joinedAt)
    .slice(0, MAX_ENTRIES)

  const pruned: Record<string, StoredIdentity> = {}
  for (const entry of entries) {
    pruned[entry.sessionId] = entry
  }

  return { v: SCHEMA_VERSION, identities: pruned }
}

/**
 * Read stored identity for a session. Prunes expired/excess entries on read.
 * Returns null if no identity stored or localStorage unavailable.
 */
export function getStoredIdentity(sessionId: string): StoredIdentity | null {
  const store = readStore()
  const pruned = pruneStore(store)
  writeStore(pruned)
  return pruned.identities[sessionId] ?? null
}

/**
 * Upsert identity into store by sessionId. Prunes after write.
 */
export function setStoredIdentity(identity: StoredIdentity): void {
  const store = readStore()
  store.identities[identity.sessionId] = identity
  const pruned = pruneStore(store)
  writeStore(pruned)
}

/**
 * Remove a single session entry from store.
 */
export function clearStoredIdentity(sessionId: string): void {
  const store = readStore()
  delete store.identities[sessionId]
  writeStore(store)
}
