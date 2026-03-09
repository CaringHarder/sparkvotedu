'use client'

import { useEffect, useMemo, useState } from 'react'
import { NameViewToggle } from '@/components/teacher/name-view-toggle'
import { TeacherEditNameDialog } from '@/components/teacher/teacher-edit-name-dialog'
import { shortcodeToEmoji, MIGRATION_SENTINEL_EMOJI } from '@/lib/student/emoji-pool'

interface ParticipationSidebarProps {
  participants: Array<{ id: string; funName: string; firstName?: string; emoji?: string | null; lastInitial?: string | null }>
  connectedIds: Set<string>
  voterIds: string[]
  selectedMatchupId: string | null
  hasActiveVotingContext?: boolean
  onToggle: () => void
  isOpen: boolean
  teacherNameViewDefault?: string
  newParticipantIds?: Set<string>
  disconnectTimestamps?: Map<string, number>
}

export function ParticipationSidebar({
  participants,
  connectedIds,
  voterIds,
  selectedMatchupId,
  hasActiveVotingContext = true,
  onToggle,
  isOpen,
  teacherNameViewDefault = 'fun',
  newParticipantIds,
  disconnectTimestamps,
}: ParticipationSidebarProps) {
  const [nameView, setNameView] = useState<'fun' | 'real'>(
    teacherNameViewDefault === 'real' ? 'real' : 'fun'
  )
  const [editingParticipant, setEditingParticipant] = useState<{
    id: string
    firstName: string
    lastInitial: string | null
    funName: string
    emoji: string | null
  } | null>(null)

  // Tick every 15s for disconnect fade-out timing
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!disconnectTimestamps || disconnectTimestamps.size === 0) return
    const interval = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(interval)
  }, [disconnectTimestamps])

  const voterIdSet = useMemo(() => new Set(voterIds), [voterIds])

  const votedCount = useMemo(() => {
    return voterIds.length
  }, [voterIds])

  const allVoted =
    participants.length > 0 &&
    votedCount >= participants.length

  // Sort: voted first, then connected, then disconnected
  // Filter out participants disconnected > 60 seconds
  const sortedParticipants = useMemo(() => {
    const filtered = participants.filter((p) => {
      if (!disconnectTimestamps) return true
      const ts = disconnectTimestamps.get(p.id)
      if (!ts) return true
      return now - ts < 60_000
    })
    return filtered.sort((a, b) => {
      const aVoted = voterIdSet.has(a.id) ? 1 : 0
      const bVoted = voterIdSet.has(b.id) ? 1 : 0
      if (aVoted !== bVoted) return aVoted - bVoted

      const aConnected = connectedIds.has(a.id) ? 1 : 0
      const bConnected = connectedIds.has(b.id) ? 1 : 0
      if (aConnected !== bConnected) return bConnected - aConnected

      return a.funName.localeCompare(b.funName)
    })
  }, [participants, voterIdSet, connectedIds, disconnectTimestamps, now])

  return (
    <div
      className={`flex flex-col rounded-lg border bg-card transition-all duration-300 ${
        isOpen ? 'w-72 min-w-[18rem]' : 'w-10 min-w-[2.5rem]'
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center border-b p-2 hover:bg-muted/50"
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="flex flex-1 flex-col overflow-hidden p-3">
          {/* Header */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Student Activity</h2>
              <NameViewToggle value={nameView} onChange={setNameView} />
            </div>
            <p className="text-xs text-muted-foreground">
              {participants.length} student{participants.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Vote summary for active voting context */}
          {hasActiveVotingContext && (
            <div className="mb-3 rounded-md bg-muted/50 p-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {votedCount}/{participants.length} voted
                </span>
                {allVoted && (
                  <span className="animate-in fade-in rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    All voted!
                  </span>
                )}
              </div>
              {/* Progress bar */}
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    allVoted ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${participants.length > 0 ? (votedCount / participants.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {!hasActiveVotingContext && (
            <div className="mb-3 rounded-md bg-muted/50 p-2">
              <span className="text-xs text-muted-foreground">
                Select a matchup to see voting status
              </span>
            </div>
          )}

          {/* Student tiles grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-1.5">
              {sortedParticipants.map((participant) => {
                const isConnected = connectedIds.has(participant.id)
                const hasVoted = voterIdSet.has(participant.id)
                const isNew = newParticipantIds?.has(participant.id)
                const emojiChar = participant.emoji
                  ? shortcodeToEmoji(participant.emoji)
                  : null

                // Disconnect fade-out: reduce opacity after 45s
                const disconnectTs = disconnectTimestamps?.get(participant.id)
                const disconnectAge = disconnectTs ? now - disconnectTs : 0
                const isFading = !isConnected && disconnectAge > 45_000

                return (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={() =>
                      setEditingParticipant({
                        id: participant.id,
                        firstName: participant.firstName ?? '',
                        lastInitial: participant.lastInitial ?? null,
                        funName: participant.funName,
                        emoji: participant.emoji ?? null,
                      })
                    }
                    className={`cursor-pointer rounded-md border px-2 py-2 text-xs text-left transition-all duration-500 ${
                      isNew
                        ? 'border-green-400 bg-green-100 text-green-900 animate-pulse'
                        : !isConnected
                          ? `border-muted bg-muted/30 text-muted-foreground ${isFading ? 'opacity-30' : 'opacity-50'}`
                          : hasVoted
                            ? 'border-green-300 bg-green-50 text-green-800'
                            : 'border-border bg-background text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {/* Status indicator dot */}
                      <span
                        className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                          !isConnected
                            ? 'bg-gray-400'
                            : hasVoted
                              ? 'bg-green-500'
                              : 'bg-blue-500'
                        }`}
                      />
                      {nameView === 'fun' ? (
                        <span className="truncate">
                          {emojiChar ?? MIGRATION_SENTINEL_EMOJI}{' '}
                          {participant.funName}
                        </span>
                      ) : (
                        <span className="truncate">
                          {participant.firstName
                            ? `${participant.firstName}${participant.lastInitial ? ` ${participant.lastInitial}.` : ''}`
                            : participant.funName}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {participants.length === 0 && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-xs text-muted-foreground">No students in session</p>
            </div>
          )}
        </div>
      )}

      {/* Edit name dialog */}
      {editingParticipant && (
        <TeacherEditNameDialog
          open={!!editingParticipant}
          onOpenChange={(open) => {
            if (!open) setEditingParticipant(null)
          }}
          participantId={editingParticipant.id}
          currentFirstName={editingParticipant.firstName}
          funName={editingParticipant.funName}
          emoji={editingParticipant.emoji}
        />
      )}
    </div>
  )
}
