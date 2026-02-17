'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { TeacherListItem } from '@/lib/dal/admin'

interface TeacherListProps {
  teachers: TeacherListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  selectedTeacherId: string | null
  onSelectTeacher: (teacherId: string) => void
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
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

export function TeacherList({
  teachers,
  total,
  page,
  pageSize,
  totalPages,
  selectedTeacherId,
  onSelectTeacher,
}: TeacherListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newPage > 1) {
      params.set('page', String(newPage))
    } else {
      params.delete('page')
    }
    router.push(`?${params.toString()}`)
  }

  const startIndex = (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, total)

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Email
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Plan
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Signup Date
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Brackets
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Last Active
              </th>
            </tr>
          </thead>
          <tbody>
            {teachers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No teachers found.
                </td>
              </tr>
            ) : (
              teachers.map((teacher) => (
                <tr
                  key={teacher.id}
                  onClick={() => onSelectTeacher(teacher.id)}
                  className={`cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/40 ${
                    selectedTeacherId === teacher.id
                      ? 'bg-amber-500/5 dark:bg-amber-500/10'
                      : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium">
                    {teacher.name ?? 'Unnamed'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {teacher.email}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={
                        tierColors[teacher.subscriptionTier] ?? tierColors.free
                      }
                    >
                      {tierLabel(teacher.subscriptionTier)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {dateFormatter.format(new Date(teacher.createdAt))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {teacher._count.brackets}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {teacher.lastActive
                      ? dateFormatter.format(new Date(teacher.lastActive))
                      : 'Never'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex}-{endIndex} of {total} teachers
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
