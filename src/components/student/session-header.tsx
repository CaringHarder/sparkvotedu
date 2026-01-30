'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RerollButton } from './reroll-button'
import { RecoveryCodeDialog } from './recovery-code-dialog'

interface SessionHeaderProps {
  funName: string
  participantId: string
  rerollUsed: boolean
}

export function SessionHeader({
  funName: initialFunName,
  participantId,
  rerollUsed: initialRerollUsed,
}: SessionHeaderProps) {
  const [funName, setFunName] = useState(initialFunName)
  const [rerollUsed, setRerollUsed] = useState(initialRerollUsed)

  function handleReroll(newName: string) {
    setFunName(newName)
    setRerollUsed(true)

    // Update localStorage with new name
    try {
      const keys = Object.keys(localStorage)
      for (const key of keys) {
        if (key.startsWith('sparkvotedu_session_')) {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          if (data.participantId === participantId) {
            data.funName = newName
            data.rerollUsed = true
            localStorage.setItem(key, JSON.stringify(data))
            break
          }
        }
      }
    } catch {
      // localStorage not available
    }
  }

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <span className="text-lg font-bold">{funName}</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Settings">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <RerollButton
            participantId={participantId}
            disabled={rerollUsed}
            onReroll={handleReroll}
          />
          <RecoveryCodeDialog participantId={participantId} />
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
