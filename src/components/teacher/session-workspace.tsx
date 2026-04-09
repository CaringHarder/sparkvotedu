'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Plus, Copy } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BracketCard } from '@/components/bracket/bracket-card'
import { PollCard } from '@/components/poll/poll-card'
import { StudentRoster } from '@/components/teacher/student-roster'
import { EditableSessionName } from '@/components/teacher/editable-session-name'
import { QRCodeDisplay } from '@/components/teacher/qr-code-display'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { endSession } from '@/actions/class-session'
import Link from 'next/link'

interface ParticipantData {
  id: string
  funName: string
  firstName: string
  lastInitial: string | null
  emoji: string | null
  banned: boolean
  rerollUsed: boolean
  lastSeenAt: string
  createdAt: string
}

interface BracketData {
  id: string
  name: string
  description: string | null
  size: number
  status: string
  bracketType: string
  createdAt: string
  updatedAt: string
  _count?: { entrants: number }
  sessionCode: string | null
  sessionId?: string | null
  sessionName?: string | null
  viewingMode?: string
  roundRobinPacing?: string | null
  predictiveMode?: string | null
  predictiveResolutionMode?: string | null
  sportGender?: string | null
}

interface PollData {
  id: string
  question: string
  pollType: string
  status: string
  updatedAt: string
  _count?: { votes: number }
  sessionId?: string | null
  sessionCode?: string | null
  sessionName?: string | null
}

interface SessionOptionData {
  id: string
  name: string | null
  status: string
  code: string
  _count: { participants: number }
}

interface SessionWorkspaceProps {
  session: {
    id: string
    code: string
    name: string | null
    status: string
    createdAt: string
    endedAt: string | null
    participants: ParticipantData[]
    brackets: BracketData[]
    polls: PollData[]
    _count: { participants: number; brackets: number; polls: number }
  }
  defaultTab: string
  sessions?: SessionOptionData[]
}

export function SessionWorkspace({ session, defaultTab, sessions }: SessionWorkspaceProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const isActive = session.status === 'active'

  function getSessionFallback(): string {
    const date = new Date(session.createdAt)
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `Unnamed Session \u2014 ${formatted}`
  }

  function handleEndSession() {
    setShowEndConfirm(true)
  }

  function confirmEndSession() {
    startTransition(async () => {
      const result = await endSession(session.id)
      if (!result.error) {
        setShowEndConfirm(false)
        router.refresh()
      }
    })
  }

  function handleRefresh() {
    router.refresh()
  }

  function handleTabChange(value: string) {
    // Update URL query param without full navigation
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    window.history.replaceState({}, '', url.toString())
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(session.code)
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/sessions" className="text-sm text-muted-foreground hover:text-foreground">
          Sessions
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm">{session.name || getSessionFallback()}</span>
      </div>

      {/* Session Header (D-08) */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <EditableSessionName
              sessionId={session.id}
              value={session.name}
              fallback={getSessionFallback()}
              className="text-xl font-semibold"
            />
          </div>
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {session.status}
          </Badge>
        </div>

        {/* Join Code (D-08) */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold font-mono tracking-widest text-foreground">
            {session.code}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyCode}
            aria-label="Copy join code"
          >
            <Copy className="h-4 w-4" />
          </Button>
          {isActive && <QRCodeDisplay code={session.code} />}
        </div>

        {/* Stats row (D-08) */}
        <p className="text-sm text-muted-foreground">
          {session._count.participants} student{session._count.participants !== 1 ? 's' : ''}
          {' \u00b7 '}
          {session.brackets.length} bracket{session.brackets.length !== 1 ? 's' : ''}
          {' \u00b7 '}
          {session.polls.length} poll{session.polls.length !== 1 ? 's' : ''}
        </p>

        {/* End Session button */}
        {isActive && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEndSession}
            disabled={isPending}
          >
            {isPending ? 'Ending...' : 'End Session'}
          </Button>
        )}
      </div>

      {/* Tabbed Workspace (D-07) */}
      <Tabs defaultValue={defaultTab} className="w-full" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="brackets">
            Brackets ({session.brackets.length})
          </TabsTrigger>
          <TabsTrigger value="polls">
            Polls ({session.polls.length})
          </TabsTrigger>
          <TabsTrigger value="students">
            Students ({session._count.participants})
          </TabsTrigger>
        </TabsList>

        {/* Brackets Tab (D-11) */}
        <TabsContent value="brackets" className="mt-6">
          {/* Create Bracket CTA (D-04) */}
          <div className="mb-4 flex justify-end">
            <Button variant="outline" asChild>
              <Link href={`/brackets/new?sessionId=${session.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Bracket
              </Link>
            </Button>
          </div>
          {session.brackets.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h3 className="text-sm font-semibold">No brackets yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a bracket to get your students voting.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {session.brackets.map((bracket) => (
                <BracketCard
                  key={bracket.id}
                  bracket={bracket}
                  onRemoved={() => router.refresh()}
                  sessions={sessions}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Polls Tab (D-11) */}
        <TabsContent value="polls" className="mt-6">
          {/* Create Poll CTA (D-04) */}
          <div className="mb-4 flex justify-end">
            <Button variant="outline" asChild>
              <Link href={`/polls/new?sessionId=${session.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Poll
              </Link>
            </Button>
          </div>
          {session.polls.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h3 className="text-sm font-semibold">No polls yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a poll to gather student opinions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {session.polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  onRemoved={() => router.refresh()}
                  sessions={sessions}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Students Tab (D-10) */}
        <TabsContent value="students" className="mt-6">
          {session.participants.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h3 className="text-sm font-semibold">No students have joined</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Share the join code with your class to get started.
              </p>
            </div>
          ) : (
            <StudentRoster
              sessionId={session.id}
              participants={session.participants}
              sessionActive={isActive}
              onRefresh={handleRefresh}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* End Session Confirmation Dialog */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End this session?</DialogTitle>
            <DialogDescription>
              Students will no longer be able to join or participate. You can still view results in your archived sessions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndConfirm(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmEndSession} disabled={isPending}>
              {isPending ? 'Ending...' : 'End Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
