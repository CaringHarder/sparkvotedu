'use client'

import { useState } from 'react'
import { MoreVertical, Archive } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArchiveConfirmDialog } from '@/components/teacher/archive-confirm-dialog'

interface SessionCardMenuProps {
  sessionId: string
  sessionName: string | null
  onArchived?: () => void
}

export function SessionCardMenu({
  sessionId,
  sessionName,
  onArchived,
}: SessionCardMenuProps) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Session options</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              setShowArchiveDialog(true)
            }}
          >
            <Archive className="h-4 w-4" />
            Archive Session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ArchiveConfirmDialog
        sessionId={sessionId}
        sessionName={sessionName}
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        onArchived={() => {
          onArchived?.()
        }}
      />
    </>
  )
}
