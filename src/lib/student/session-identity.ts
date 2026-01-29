// Layer 1: localStorage UUID (primary identifier)
// This is the most reliable signal on identical hardware because each
// Chrome profile has its own localStorage, even on the same physical device.

export const IDENTITY_KEY = 'sparkvotedu_device_id'

/**
 * Get or create a persistent device identifier stored in localStorage.
 * On school Chromebooks, each student's Chrome profile has its own
 * localStorage, making this the most reliable identifier even on
 * identical hardware.
 *
 * @returns The device UUID string, or empty string during SSR
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return ''

  let deviceId = localStorage.getItem(IDENTITY_KEY)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(IDENTITY_KEY, deviceId)
  }
  return deviceId
}

/**
 * Remove the stored device identity from localStorage.
 * Used for testing and debug purposes.
 */
export function clearDeviceId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(IDENTITY_KEY)
}
