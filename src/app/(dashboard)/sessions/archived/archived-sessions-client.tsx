'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Archive, RotateCcw, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmDialog } from '@/components/teacher/delete-confirm-dialog'
import { unarchiveSessionAction } from '@/actions/class-session'

interface ArchivedSession {
  id: string
  code: string
  name: string | null
  status: string
  createdAt: string
  endedAt: string | null
  archivedAt: string | null
  participantCount: number
  bracketCount: number
  pollCount: number
}

interface ArchivedSessionsClientProps {
  sessions: ArchivedSession[]
  initialSearch: string
}

export function ArchivedSessionsClient({
  sessions,
  initialSearch,
}: ArchivedSessionsClientProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(initialSearch)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search -- update URL params after 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (searchValue) {
        params.set('search', searchValue)
      }
      const qs = params.toString()
      router.push(qs ? `/sessions/archived?${qs}` : '/sessions/archived')
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchValue, router])

  if (sessions.length === 0 && !initialSearch) {
    return (
      <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by session name..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Archive className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold text-muted-foreground">
            No archived sessions
          </h2>
          <p className="text-sm text-muted-foreground">
            Sessions you archive will appear here.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by session name..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>

      {sessions.length === 0 && initialSearch ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold text-muted-foreground">
            No results found
          </h2>
          <p className="text-sm text-muted-foreground">
            No archived sessions match &quot;{initialSearch}&quot;.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <ArchivedSessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </>
  )
}

function ArchivedSessionCard({ session }: { session: ArchivedSession }) {
  const router = useRouter()
  const [isRecovering, startRecoverTransition] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recoverError, setRecoverError] = useState<string | null>(null)

  const displayName =
    session.name ||
    `Unnamed Session \u2014 ${new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  const archivedDate = session.archivedAt
    ? new Date(session.archivedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  function handleRecover() {
    setRecoverError(null)
    startRecoverTransition(async () => {
      const result = await unarchiveSessionAction(session.id)
      if (result.success) {
        router.push('/sessions')
      } else {
        setRecoverError(result.error ?? 'Failed to recover session')
      }
    })
  }

  function handleDeleted() {
    router.refresh()
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base leading-snug">{displayName}</CardTitle>
          <p className="font-mono text-sm text-muted-foreground">
            {session.code}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {session.participantCount} student{session.participantCount !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {session.bracketCount} bracket{session.bracketCount !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {session.pollCount} poll{session.pollCount !== 1 ? 's' : ''}
            </Badge>
          </div>

          {archivedDate && (
            <p className="text-xs text-muted-foreground">
              Archived {archivedDate}
            </p>
          )}

          {recoverError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {recoverError}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecover}
              disabled={isRecovering}
              className="flex-1"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {isRecovering ? 'Recovering...' : 'Recover'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isRecovering}
              className="flex-1"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        sessionId={session.id}
        sessionName={session.name}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={handleDeleted}
      />
    </>
  )
}
