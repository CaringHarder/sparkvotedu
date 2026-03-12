'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { updateSessionParticipant } from '@/lib/student/session-store'
import { shortcodeToEmoji } from '@/lib/student/emoji-pool'
import { RerollButton } from './reroll-button'
import { EditNameDialog } from './edit-name-dialog'

interface SessionHeaderProps {
  funName: string
  participantId: string
  rerollUsed: boolean
  firstName?: string
  lastInitial?: string | null
  emoji?: string | null
}

export function SessionHeader({
  funName: initialFunName,
  participantId,
  rerollUsed: initialRerollUsed,
  firstName: initialFirstName,
  lastInitial: initialLastInitial,
  emoji,
}: SessionHeaderProps) {
  const [funName, setFunName] = useState(initialFunName)
  const [rerollUsed, setRerollUsed] = useState(initialRerollUsed)
  const [firstName, setFirstName] = useState(initialFirstName ?? '')
  const [lastInitial, setLastInitial] = useState(initialLastInitial ?? '')

  function handleReroll(newName: string) {
    setFunName(newName)
    setRerollUsed(true)

    // Update sessionStorage with new fun name
    updateSessionParticipant(participantId, { funName: newName, rerollUsed: true })
  }

  function handleNameUpdated(newFirstName: string, newLastInitial: string) {
    setFirstName(newFirstName)
    setLastInitial(newLastInitial)

    // Update sessionStorage with new name
    updateSessionParticipant(participantId, { firstName: newFirstName, lastInitial: newLastInitial })
  }

  return (
    <header className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
      {/* Left: logo + session branding */}
      <div className="flex items-center gap-2">
        <Image
          src="/logo-icon.png"
          alt="SparkVotEDU"
          width={20}
          height={20}
          className="h-5 w-5"
        />
        <span className="text-xs font-medium text-muted-foreground">
          SparkVotEDU
        </span>
      </div>

      {/* Center/Right: fun name + settings */}
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-brand-amber/10 px-2.5 py-1 text-sm font-semibold text-brand-amber-dark dark:text-brand-amber">
          {emoji ? shortcodeToEmoji(emoji) + ' ' : ''}{funName}
        </span>

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
            <EditNameDialog
              participantId={participantId}
              currentFirstName={firstName}
              currentLastInitial={lastInitial}
              onNameUpdated={handleNameUpdated}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
