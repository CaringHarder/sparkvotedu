'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface SessionOption {
  id: string
  name: string | null
  status: string
  code: string
  _count: { participants: number }
}

interface SessionPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessions: SessionOption[]
  currentSessionId: string | null
  onConfirm: (sessionId: string) => Promise<void>
  title: string
  confirmLabel: string
  isPending: boolean
}

export function SessionPickerDialog({
  open,
  onOpenChange,
  sessions,
  currentSessionId,
  onConfirm,
  title,
  confirmLabel,
  isPending,
}: SessionPickerDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) setSelectedId(null)
  }, [open])

  const activeSessions = sessions.filter(s => s.status === 'active')
  const availableSessions = activeSessions.length > 0 ? activeSessions : sessions

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select a session to {title.toLowerCase().replace(' to session', '')} this activity to.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto">
          <div className="space-y-1">
            {availableSessions.map((session) => {
              const isCurrent = session.id === currentSessionId
              const isSelected = session.id === selectedId
              return (
                <button
                  key={session.id}
                  disabled={isCurrent || isPending}
                  onClick={() => setSelectedId(session.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? 'border-brand-blue bg-brand-blue/5'
                      : isCurrent
                        ? 'border-border bg-muted/50 opacity-50'
                        : 'border-border hover:border-brand-blue/40 hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {session.name || `Session ${session.code}`}
                      {isCurrent && (
                        <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                      )}
                    </span>
                    <Badge variant={session.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {session.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {session._count.participants} student{session._count.participants !== 1 ? 's' : ''}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => selectedId && onConfirm(selectedId)}
            disabled={!selectedId || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
