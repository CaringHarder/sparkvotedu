'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateBracketStatus, archiveBracket } from '@/actions/bracket'

// --- BracketStatusBadge ---

const statusStyles: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

export function BracketStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        statusStyles[status] ?? statusStyles.draft
      }`}
    >
      {status}
    </span>
  )
}

// --- BracketLifecycleControls ---

interface LifecycleControlsProps {
  bracketId: string
  status: string
  bracketName: string
  bracketType?: string
}

export function BracketLifecycleControls({
  bracketId,
  status,
  bracketName,
  bracketType,
}: LifecycleControlsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleStatusChange(newStatus: string) {
    setError(null)
    startTransition(async () => {
      const result = await updateBracketStatus({
        bracketId,
        status: newStatus,
      })
      if (result && 'error' in result) {
        setError(result.error as string)
      } else if (newStatus === 'active') {
        router.push(`/brackets/${bracketId}/live`)
      }
    })
  }

  function handleArchive() {
    setError(null)
    startTransition(async () => {
      const result = await archiveBracket({ bracketId })
      if (result && 'error' in result) {
        setError(result.error as string)
      } else {
        router.push('/brackets')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {status === 'draft' && bracketType !== 'predictive' && (
          <button
            onClick={() => handleStatusChange('active')}
            disabled={isPending}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? 'Updating...' : 'Start'}
          </button>
        )}

        {status === 'active' && (
          <button
            onClick={() => handleStatusChange('completed')}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Updating...' : 'Complete'}
          </button>
        )}

        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isPending}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          Archive
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Archive confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-card-foreground">
              Archive Bracket
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Archive &quot;{bracketName}&quot;? You can recover it later from
              the archived view.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
                className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  handleArchive()
                }}
                disabled={isPending}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
              >
                {isPending ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
