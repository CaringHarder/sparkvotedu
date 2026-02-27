'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { PollCard } from './poll-card'

interface PollData {
  id: string
  question: string
  pollType: string
  status: string
  updatedAt: string
  _count?: { votes: number }
  sessionId?: string | null
  sessionCode?: string | null
  sessionName?: string | null
}

interface SessionOption {
  id: string
  name: string | null
  code: string
}

interface PollCardListProps {
  polls: PollData[]
  sessions?: SessionOption[]
}

type RemovalType = 'delete' | 'archive' | null

export function PollCardList({ polls, sessions = [] }: PollCardListProps) {
  const [items, setItems] = useState(polls)
  const [removalTypes, setRemovalTypes] = useState<Record<string, RemovalType>>({})
  const [sessionFilter, setSessionFilter] = useState('all')

  // Sync local state when server data changes (e.g., after rename + router.refresh)
  useEffect(() => {
    setItems(polls)
  }, [polls])

  function handleRemove(id: string, type: 'delete' | 'archive') {
    setRemovalTypes((prev) => ({ ...prev, [id]: type }))
    // Remove from local state to trigger AnimatePresence exit
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function getExitAnimation(id: string) {
    const type = removalTypes[id]
    if (type === 'archive') {
      return { opacity: 0, x: -100 }
    }
    // Default: fade out (for delete)
    return { opacity: 0 }
  }

  const filteredItems = items.filter((poll) => {
    if (sessionFilter === 'all') return true
    if (sessionFilter === 'none') return !poll.sessionId
    return poll.sessionId === sessionFilter
  })

  return (
    <div className="space-y-4">
      {sessions.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Session:</span>
          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
          >
            <option value="all">All Sessions</option>
            <option value="none">No Session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || `Session ${s.code}`}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((poll) => (
            <motion.div
              key={poll.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={getExitAnimation(poll.id)}
              transition={{ duration: 0.25 }}
            >
              <PollCard
                poll={poll}
                onRemoved={(type) => handleRemove(poll.id, type)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
