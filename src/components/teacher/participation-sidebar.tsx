'use client'

import { useMemo } from 'react'

interface ParticipationSidebarProps {
  participants: Array<{ id: string; funName: string }>
  connectedIds: Set<string>
  voterIds: string[]
  selectedMatchupId: string | null
  onToggle: () => void
  isOpen: boolean
}

export function ParticipationSidebar({
  participants,
  connectedIds,
  voterIds,
  selectedMatchupId,
  onToggle,
  isOpen,
}: ParticipationSidebarProps) {
  const voterIdSet = useMemo(() => new Set(voterIds), [voterIds])

  const votedCount = useMemo(() => {
    if (!selectedMatchupId) return 0
    return voterIds.length
  }, [selectedMatchupId, voterIds])

  const allVoted =
    selectedMatchupId !== null &&
    participants.length > 0 &&
    votedCount >= participants.length

  // Sort: voted first, then connected, then disconnected
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const aVoted = voterIdSet.has(a.id) ? 1 : 0
      const bVoted = voterIdSet.has(b.id) ? 1 : 0
      if (aVoted !== bVoted) return bVoted - aVoted

      const aConnected = connectedIds.has(a.id) ? 1 : 0
      const bConnected = connectedIds.has(b.id) ? 1 : 0
      if (aConnected !== bConnected) return bConnected - aConnected

      return a.funName.localeCompare(b.funName)
    })
  }, [participants, voterIdSet, connectedIds])

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
            <h2 className="text-sm font-semibold">Student Activity</h2>
            <p className="text-xs text-muted-foreground">
              {participants.length} student{participants.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Vote summary for selected matchup */}
          {selectedMatchupId && (
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

          {!selectedMatchupId && (
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

                return (
                  <div
                    key={participant.id}
                    className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                      !isConnected
                        ? 'border-muted bg-muted/30 text-muted-foreground opacity-50'
                        : hasVoted && selectedMatchupId
                          ? 'border-green-300 bg-green-50 text-green-800'
                          : 'border-border bg-background text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {/* Status indicator dot */}
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          !isConnected
                            ? 'bg-gray-400'
                            : hasVoted && selectedMatchupId
                              ? 'bg-green-500'
                              : 'bg-blue-500'
                        }`}
                      />
                      <span className="truncate">{participant.funName}</span>
                    </div>
                  </div>
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
    </div>
  )
}
