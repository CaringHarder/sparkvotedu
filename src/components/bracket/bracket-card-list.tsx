'use client'

import { useState } from 'react'
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
  sportGender?: string | null
}

interface BracketCardListProps {
  brackets: BracketData[]
}

type RemovalType = 'delete' | 'archive' | null

export function BracketCardList({ brackets }: BracketCardListProps) {
  const router = useRouter()
  const [items, setItems] = useState(brackets)
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
        {items.map((bracket) => (
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
  )
}
