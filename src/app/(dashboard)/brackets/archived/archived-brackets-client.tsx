'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog'
import { unarchiveBracket, deleteBracketPermanently } from '@/actions/bracket'

interface ArchivedBracketData {
  id: string
  name: string
  description: string | null
  size: number
  status: string
  bracketType: string
  createdAt: string
  _count?: { entrants: number }
  sessionCode: string | null
}

interface ArchivedBracketsClientProps {
  brackets: ArchivedBracketData[]
}

export function ArchivedBracketsClient({
  brackets,
}: ArchivedBracketsClientProps) {
  if (brackets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Archive className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold text-muted-foreground">
          No archived brackets
        </h2>
        <p className="text-sm text-muted-foreground">
          Brackets you archive will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {brackets.map((bracket) => (
        <ArchivedBracketCard key={bracket.id} bracket={bracket} />
      ))}
    </div>
  )
}

function ArchivedBracketCard({
  bracket,
}: {
  bracket: ArchivedBracketData
}) {
  const router = useRouter()
  const [isRecovering, startRecoverTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recoverError, setRecoverError] = useState<string | null>(null)

  const createdDate = new Date(bracket.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const bracketTypeLabel =
    bracket.bracketType === 'single_elimination'
      ? 'Single Elim'
      : bracket.bracketType === 'double_elimination'
        ? 'Double Elim'
        : bracket.bracketType === 'round_robin'
          ? 'Round Robin'
          : bracket.bracketType

  function handleRecover() {
    setRecoverError(null)
    startRecoverTransition(async () => {
      const result = await unarchiveBracket({ bracketId: bracket.id })
      if ('success' in result && result.success) {
        router.push('/brackets')
      } else {
        setRecoverError(
          ('error' in result ? result.error : null) ?? 'Failed to recover bracket'
        )
      }
    })
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteBracketPermanently({
        bracketId: bracket.id,
      })
      if ('success' in result && result.success) {
        setDeleteDialogOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base leading-snug">
            {bracket.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {bracketTypeLabel}
            </Badge>
            {bracket._count && (
              <Badge variant="secondary" className="text-xs">
                {bracket._count.entrants} entrant
                {bracket._count.entrants !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Created {createdDate}
          </p>

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
              disabled={isRecovering || isDeleting}
              className="flex-1"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {isRecovering ? 'Recovering...' : 'Recover'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isRecovering || isDeleting}
              className="flex-1"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={bracket.name}
        itemType="bracket"
        isLive={false}
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </>
  )
}
