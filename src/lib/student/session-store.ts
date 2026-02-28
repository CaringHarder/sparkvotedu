/**
 * Centralized session identity storage using sessionStorage (per-tab).
 *
 * Each browser tab maintains its own independent student identity.
 * sessionStorage persists across same-tab page refreshes but is NOT
 * shared between tabs -- solving the multi-tab identity bleeding bug
 * where localStorage caused all tabs to share the same student identity.
 *
 * Key format: sparkvotedu_session_{sessionId}
 */

export interface SessionParticipantStore {
  participantId: string
  firstName: string
  funName: string
  sessionId: string
  rerollUsed: boolean
}

const KEY_PREFIX = 'sparkvotedu_session_'

/**
 * Read session participant identity from sessionStorage.
 * Returns null during SSR or on parse error.
 */
export function getSessionParticipant(sessionId: string): SessionParticipantStore | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`${KEY_PREFIX}${sessionId}`)
    if (!raw) return null
    return JSON.parse(raw) as SessionParticipantStore
  } catch {
    return null
  }
}

/**
 * Write session participant identity to sessionStorage.
 * Fail-silent on error (e.g. storage quota, SSR).
 */
export function setSessionParticipant(sessionId: string, data: SessionParticipantStore): void {
  try {
    sessionStorage.setItem(`${KEY_PREFIX}${sessionId}`, JSON.stringify(data))
  } catch {
    // sessionStorage unavailable -- fail-silent
  }
}

/**
 * Update an existing session participant entry by participantId.
 * Iterates sessionStorage keys starting with the prefix, finds the
 * matching entry, merges updates, and writes back. Used by session-header
 * for reroll and name-edit operations.
 * Fail-silent on error.
 */
export function updateSessionParticipant(
  participantId: string,
  updates: Partial<SessionParticipantStore>
): void {
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (!key || !key.startsWith(KEY_PREFIX)) continue

      const raw = sessionStorage.getItem(key)
      if (!raw) continue

      const data = JSON.parse(raw) as SessionParticipantStore
      if (data.participantId === participantId) {
        const updated = { ...data, ...updates }
        sessionStorage.setItem(key, JSON.stringify(updated))
        break
      }
    }
  } catch {
    // sessionStorage unavailable -- fail-silent
  }
}
