'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getSessionParticipant, updateSessionParticipant } from '@/lib/student/session-store'
import { SessionHeader } from '@/components/student/session-header'
import { MobileBottomNav } from '@/components/student/mobile-bottom-nav'
import { EmojiMigration } from '@/components/student/emoji-migration'
import { needsEmojiMigration } from '@/lib/student/emoji-pool'
import { Skeleton } from '@/components/ui/skeleton'

interface ParticipantStore {
  participantId: string
  funName: string
  firstName?: string
  sessionId: string
  rerollUsed: boolean
  emoji?: string | null
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

      const data = getSessionParticipant(sid)
      if (data) {
        setParticipant(data)
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

  // Emoji migration: show one-time picker for returning participants without emoji or with sentinel
  if (needsEmojiMigration(participant.emoji)) {
    return (
      <EmojiMigration
        participantId={participant.participantId}
        funName={participant.funName}
        sessionId={sessionId}
        onComplete={(selectedEmoji) => {
          // Update sessionStorage so subsequent visits skip migration
          updateSessionParticipant(participant.participantId, { emoji: selectedEmoji })
          // Update local state to re-render normal layout
          setParticipant((prev) => prev ? { ...prev, emoji: selectedEmoji } : prev)
        }}
      />
    )
  }

  return (
    <div>
      <SessionHeader
        funName={participant.funName}
        participantId={participant.participantId}
        rerollUsed={participant.rerollUsed}
        firstName={participant.firstName}
        emoji={participant.emoji}
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
