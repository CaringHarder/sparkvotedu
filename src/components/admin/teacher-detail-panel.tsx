'use client'

import { useEffect, useRef } from 'react'
import {
  X,
  Trophy,
  BarChart3,
  Users,
  GraduationCap,
  Calendar,
  Mail,
  Shield,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { TeacherDetail } from '@/lib/dal/admin'

interface TeacherDetailPanelProps {
  teacher: TeacherDetail | null
  open: boolean
  onClose: () => void
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const tierColors: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  pro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pro_plus:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}

function tierLabel(tier: string): string {
  if (tier === 'pro_plus') return 'Pro Plus'
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}

const usageStats = [
  {
    key: 'brackets' as const,
    label: 'Total Brackets',
    icon: Trophy,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    key: 'polls' as const,
    label: 'Total Polls',
    icon: BarChart3,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    key: 'classSessions' as const,
    label: 'Total Sessions',
    icon: Users,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    key: 'students' as const,
    label: 'Total Students',
    icon: GraduationCap,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10',
  },
]

export function TeacherDetailPanel({
  teacher,
  open,
  onClose,
}: TeacherDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-full overflow-y-auto border-l border-border bg-background shadow-xl transition-transform duration-300 ease-in-out sm:w-96 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {teacher && (
          <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold">
                  {teacher.name ?? 'Unnamed Teacher'}
                </h2>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{teacher.email}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={
                      tierColors[teacher.subscriptionTier] ?? tierColors.free
                    }
                  >
                    {tierLabel(teacher.subscriptionTier)}
                  </Badge>
                  {teacher.role === 'admin' && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    >
                      <Shield className="mr-1 h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            {/* Account info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Account Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Signup Date
                  </span>
                  <span className="tabular-nums">
                    {dateFormatter.format(new Date(teacher.createdAt))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Last Active
                  </span>
                  <span className="tabular-nums">
                    {teacher.lastActive
                      ? dateFormatter.format(new Date(teacher.lastActive))
                      : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Usage stats */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Usage
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {usageStats.map((stat) => {
                  const Icon = stat.icon
                  const value =
                    stat.key === 'students'
                      ? teacher.totalStudents
                      : teacher._count[stat.key]
                  return (
                    <Card key={stat.key} className="py-3">
                      <CardContent className="flex items-center gap-2.5 px-3">
                        <div className={`rounded-md p-1.5 ${stat.bg}`}>
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-lg font-bold tabular-nums leading-tight">
                            {value.toLocaleString()}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {stat.label}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Actions placeholder for 17-03 */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Actions
              </h3>
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Account actions coming soon
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
