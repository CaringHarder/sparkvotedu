/** Client-side device identity composed from localStorage UUID and browser fingerprint */
export interface DeviceIdentity {
  deviceId: string
  fingerprint: string
  ready: boolean
}

/** Class session data returned to student-facing views */
export interface ClassSessionData {
  id: string
  code: string
  name: string | null
  status: string
  teacherName: string | null
}

/** Student participant data within a session */
export interface StudentParticipantData {
  id: string
  funName: string
  rerollUsed: boolean
  recoveryCode: string | null
  sessionId: string
}

/** Result of a student join attempt */
export interface JoinResult {
  participant?: StudentParticipantData
  session?: ClassSessionData
  returning?: boolean
  error?: string
}
