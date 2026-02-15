'use client'

import { motion } from 'motion/react'
import { Users, CheckSquare, Trophy, TrendingUp } from 'lucide-react'

interface ParticipationSummaryProps {
  uniqueParticipants: number
  totalVotes: number
  totalMatchups: number
  sessionParticipantCount: number
  type: 'bracket' | 'poll'
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  index: number
}

function StatCard({ label, value, icon, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="rounded-lg border p-4"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </motion.div>
  )
}

/**
 * Participation summary cards showing key stats for a bracket or poll.
 *
 * Renders a responsive grid of animated stat cards:
 * - Participants count
 * - Total Votes count
 * - Matchups count (bracket only)
 * - Participation Rate (if session assigned)
 */
export function ParticipationSummary({
  uniqueParticipants,
  totalVotes,
  totalMatchups,
  sessionParticipantCount,
  type,
}: ParticipationSummaryProps) {
  const participationRate =
    sessionParticipantCount > 0
      ? `${Math.round((uniqueParticipants / sessionParticipantCount) * 100)}%`
      : 'N/A'

  const cards: { label: string; value: string | number; icon: React.ReactNode }[] = [
    {
      label: 'Participants',
      value: uniqueParticipants,
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: 'Total Votes',
      value: totalVotes,
      icon: <CheckSquare className="h-4 w-4" />,
    },
  ]

  if (type === 'bracket') {
    cards.push({
      label: 'Matchups',
      value: totalMatchups,
      icon: <Trophy className="h-4 w-4" />,
    })
  }

  cards.push({
    label: 'Participation Rate',
    value: participationRate,
    icon: <TrendingUp className="h-4 w-4" />,
  })

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card, i) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          index={i}
        />
      ))}
    </div>
  )
}
