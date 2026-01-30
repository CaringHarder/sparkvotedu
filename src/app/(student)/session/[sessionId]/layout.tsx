'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SessionHeader } from '@/components/student/session-header'

interface ParticipantStore {
  participantId: string
  funName: string
  sessionId: string
  rerollUsed: boolean
}

export default function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ sessionId: string }>
}) {
  const [participant, setParticipant] = useState<ParticipantStore | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    params.then(({ sessionId: sid }) => {
      setSessionId(sid)

      try {
        const stored = localStorage.getItem(`sparkvotedu_session_${sid}`)
        if (stored) {
          const data: ParticipantStore = JSON.parse(stored)
          setParticipant(data)
        }
      } catch {
        // localStorage not available
      }
      setLoading(false)
    })
  }, [params])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!participant || !sessionId) {
    // No stored identity -- redirect to join
    router.push('/join')
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    )
  }

  return (
    <div>
      <SessionHeader
        funName={participant.funName}
        participantId={participant.participantId}
        rerollUsed={participant.rerollUsed}
      />
      <div className="px-4 py-6">{children}</div>
    </div>
  )
}
