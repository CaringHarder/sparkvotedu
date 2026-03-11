'use client'

import { useSessionPresence } from '@/hooks/use-student-session'
import { StudentManagement } from './student-management'

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

interface StudentRosterProps {
  sessionId: string
  participants: ParticipantData[]
  sessionActive: boolean
  onRefresh: () => void
}

export function StudentRoster({
  sessionId,
  participants,
  sessionActive,
  onRefresh,
}: StudentRosterProps) {
  const { connectedStudents, connectedCount } = useSessionPresence(
    sessionId,
    '__teacher__'
  )

  const connectedNames = new Set(
    connectedStudents.map((s) => s.funName)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Students</h3>
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{connectedCount}</span>
          {' '}of{' '}
          <span className="font-medium text-foreground">{participants.length}</span>
          {' '}connected
        </span>
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No students have joined yet. Share the class code to get started.
        </p>
      ) : (
        <ul className="divide-y">
          {participants.map((p) => {
            const isConnected = connectedNames.has(p.funName)

            return (
              <li
                key={p.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      p.banned
                        ? 'bg-red-500'
                        : isConnected
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                    }`}
                    title={
                      p.banned
                        ? 'Banned'
                        : isConnected
                          ? 'Connected'
                          : 'Disconnected'
                    }
                  />
                  <span
                    className={
                      p.banned
                        ? 'line-through text-muted-foreground'
                        : ''
                    }
                  >
                    {p.funName}{p.firstName ? ` (${p.firstName}${p.lastInitial ? ` ${p.lastInitial}.` : ''})` : ''}
                  </span>
                  {p.banned && (
                    <span className="text-xs text-red-500 font-medium">
                      Banned
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Joined{' '}
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                  {sessionActive && !p.banned && (
                    <StudentManagement
                      participantId={p.id}
                      funName={p.funName}
                      banned={p.banned}
                      onAction={onRefresh}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
