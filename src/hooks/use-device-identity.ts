'use client'

import { useEffect, useState } from 'react'
import { getOrCreateDeviceId } from '@/lib/student/session-identity'
import { getBrowserFingerprint } from '@/lib/student/fingerprint'

// TODO: Import DeviceIdentity from @/types/student when Plan 02-01 creates it
interface DeviceIdentity {
  deviceId: string       // localStorage UUID (primary)
  fingerprint: string    // FingerprintJS hash (secondary)
  ready: boolean         // true when identity is fully computed
}

/**
 * Client-side React hook that combines both identity layers into a
 * single composite payload. Uses localStorage UUID (sync) as primary
 * identifier and FingerprintJS hash (async) as secondary signal.
 *
 * The `ready` flag indicates when the identity is fully computed,
 * including the async fingerprint. Consumers should wait for
 * `ready === true` before submitting identity to the server.
 *
 * IMPORTANT: This hook MUST be used only in Client Components.
 * Server Components cannot access localStorage or run FingerprintJS.
 */
export function useDeviceIdentity(): DeviceIdentity {
  const [identity, setIdentity] = useState<DeviceIdentity>({
    deviceId: '',
    fingerprint: '',
    ready: false,
  })

  useEffect(() => {
    async function identify() {
      const deviceId = getOrCreateDeviceId()
      const fingerprint = await getBrowserFingerprint()
      setIdentity({ deviceId, fingerprint, ready: true })
    }
    identify()
  }, [])

  return identity
}
