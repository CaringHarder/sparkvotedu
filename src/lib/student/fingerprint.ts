// Layer 2: FingerprintJS browser fingerprint (secondary signal)
// Adds entropy from canvas, WebGL, audio context, fonts, etc.
// On identical hardware this may collide (1-3% rate), but combined
// with localStorage it provides additional confidence for identity matching.

import FingerprintJS from '@fingerprintjs/fingerprintjs'

let fpPromise: ReturnType<typeof FingerprintJS.load> | null = null

/**
 * Compute a browser fingerprint using FingerprintJS.
 * The FingerprintJS agent is lazily loaded and cached at the module level
 * to avoid re-initialization on subsequent calls.
 *
 * Returns an empty string if:
 * - Running server-side (SSR safety)
 * - FingerprintJS fails to load or compute (e.g., blocked by browser extension)
 *
 * @returns The visitorId fingerprint hash, or empty string on failure
 */
export async function getBrowserFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return ''

  try {
    if (!fpPromise) {
      fpPromise = FingerprintJS.load()
    }

    const fp = await fpPromise
    const result = await fp.get()
    return result.visitorId
  } catch {
    // Graceful degradation: if FingerprintJS fails (blocked by browser
    // extension, privacy settings, etc.), return empty string.
    // The identity system falls back to localStorage UUID as primary.
    return ''
  }
}
