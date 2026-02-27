'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { BracketCard } from './bracket-card'

interface BracketData {
  id: string
  name: string
  description: string | null
  size: number
  status: string
  bracketType: string
  createdAt: string
  _count?: { entrants: number }
  sessionCode: string | null
  sessionId?: string | null
  sessionName?: string | null
  viewingMode?: string
  roundRobinPacing?: string | null
  predictiveMode?: string | null
  sportGender?: string | null
}

interface SessionOption {
  id: string
  name: string | null
  code: string
}

interface BracketCardListProps {
  brackets: BracketData[]
  sessions?: SessionOption[]
}

type RemovalType = 'delete' | 'archive' | null

export function BracketCardList({ brackets, sessions = [] }: BracketCardListProps) {
  const router = useRouter()
  const [items, setItems] = useState(brackets)
  const [removalTypes, setRemovalTypes] = useState<Record<string, RemovalType>>({})
  const [sessionFilter, setSessionFilter] = useState('all')

  // Sync local state when server data changes (e.g., after rename + router.refresh)
  useEffect(() => {
    setItems(brackets)
  }, [brackets])

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

  const filteredItems = items.filter((bracket) => {
    if (sessionFilter === 'all') return true
    if (sessionFilter === 'none') return !bracket.sessionId
    return bracket.sessionId === sessionFilter
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
          {filteredItems.map((bracket) => (
            <motion.div
              key={bracket.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={getExitAnimation(bracket.id)}
              transition={{ duration: 0.25 }}
            >
              <BracketCard
                bracket={bracket}
                onRemoved={(type) => handleRemove(bracket.id, type)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
