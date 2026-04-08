'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SessionItem {
  id: string
  name: string | null
  code: string
  _count: { participants: number }
}

interface DashboardSessionDropdownProps {
  sessions: SessionItem[]
}

export function DashboardSessionDropdown({ sessions }: DashboardSessionDropdownProps) {
  const router = useRouter()

  if (sessions.length === 0) return null

  return (
    <div className="max-w-sm">
      <Select onValueChange={(value) => router.push(`/sessions/${value}`)}>
        <SelectTrigger>
          <SelectValue placeholder="Jump to a session..." />
        </SelectTrigger>
        <SelectContent>
          {sessions.map((session) => (
            <SelectItem key={session.id} value={session.id}>
              {session.name || `Session ${session.code}`}
              {' \u2014 '}
              {session._count.participants} student{session._count.participants !== 1 ? 's' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
