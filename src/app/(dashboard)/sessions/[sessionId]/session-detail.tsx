'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { endSession } from '@/actions/class-session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QRCodeDisplay } from '@/components/teacher/qr-code-display'
import { StudentRoster } from '@/components/teacher/student-roster'
import Link from 'next/link'

interface ParticipantData {
  id: string
  funName: string
  banned: boolean
  rerollUsed: boolean
  lastSeenAt: string
  createdAt: string
}

interface SessionData {
  id: string
  code: string
  name: string | null
  status: string
  createdAt: string
  endedAt: string | null
  participants: ParticipantData[]
}

interface SessionDetailProps {
  session: SessionData
}

export function SessionDetail({ session }: SessionDetailProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isActive = session.status === 'active'

  function handleEndSession() {
    startTransition(async () => {
      const result = await endSession(session.id)
      if (!result.error) {
        router.refresh()
      }
    })
  }

  function handleRefresh() {
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/sessions" className="text-sm text-muted-foreground hover:text-foreground">
          Sessions
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm">{session.name || 'Unnamed Session'}</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">
                {session.name || 'Unnamed Session'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Created {new Date(session.createdAt).toLocaleDateString()}
                {session.endedAt && (
                  <> &middot; Ended {new Date(session.endedAt).toLocaleDateString()}</>
                )}
              </p>
            </div>
            <Badge
              variant={isActive ? 'default' : 'secondary'}
            >
              {session.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">Class Code</p>
            <span className="text-4xl font-mono font-bold tracking-widest">
              {session.code}
            </span>
            {isActive && <QRCodeDisplay code={session.code} />}
          </div>

          {isActive && (
            <div className="flex justify-center">
              <Button
                variant="destructive"
                onClick={handleEndSession}
                disabled={isPending}
              >
                {isPending ? 'Ending...' : 'End Session'}
              </Button>
            </div>
          )}

          <StudentRoster
            sessionId={session.id}
            participants={session.participants}
            sessionActive={isActive}
            onRefresh={handleRefresh}
          />
        </CardContent>
      </Card>
    </div>
  )
}
