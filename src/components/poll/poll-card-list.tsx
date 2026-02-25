'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { PollCard } from './poll-card'

interface PollData {
  id: string
  question: string
  pollType: string
  status: string
  updatedAt: string
  _count?: { votes: number }
}

interface PollCardListProps {
  polls: PollData[]
}

type RemovalType = 'delete' | 'archive' | null

export function PollCardList({ polls }: PollCardListProps) {
  const [items, setItems] = useState(polls)
  const [removalTypes, setRemovalTypes] = useState<Record<string, RemovalType>>({})

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

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {items.map((poll) => (
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
  )
}
