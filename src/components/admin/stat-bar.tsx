import { Users, UserCheck, Gift, CreditCard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { AdminStats } from '@/lib/dal/admin'

interface StatBarProps {
  stats: AdminStats
}

const statConfig = [
  {
    key: 'totalTeachers' as const,
    label: 'Total Teachers',
    icon: Users,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    key: 'activeToday' as const,
    label: 'Active Today',
    icon: UserCheck,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    key: 'freeTier' as const,
    label: 'Free Tier',
    icon: Gift,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    key: 'paidTier' as const,
    label: 'Paid Tier',
    icon: CreditCard,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10',
  },
]

export function StatBar({ stats }: StatBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {statConfig.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.key} className="py-4">
            <CardContent className="flex items-center gap-3 px-4">
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {stats[stat.key].toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
