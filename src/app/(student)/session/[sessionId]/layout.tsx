'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SessionHeader } from '@/components/student/session-header'
import { MobileBottomNav } from '@/components/student/mobile-bottom-nav'
import { Skeleton } from '@/components/ui/skeleton'

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
  const pathname = usePathname()

  // Hide bottom nav on welcome page (only show in active session)
  const isWelcomePage = pathname.endsWith('/welcome')

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
      <div className="flex flex-col">
        {/* Skeleton header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-24 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
        {/* Skeleton content area */}
        <div className="px-4 py-6">
          <div className="space-y-4">
            <Skeleton className="mx-auto h-6 w-48" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!participant || !sessionId) {
    // No stored identity -- redirect to join
    router.push('/join')
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-32" />
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
      {/* Add bottom padding on mobile for bottom nav clearance */}
      <div className={`px-4 py-6 ${!isWelcomePage ? 'pb-20 md:pb-6' : ''}`}>
        {children}
      </div>
      {/* Mobile bottom navigation (hidden on welcome page and on desktop) */}
      {!isWelcomePage && <MobileBottomNav sessionId={sessionId} />}
    </div>
  )
}
