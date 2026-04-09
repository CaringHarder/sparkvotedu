'use client'

import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
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
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10">
          <Users className="h-5 w-5 text-brand-blue" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
          <p className="text-xs text-muted-foreground">{sessions.length} session{sessions.length !== 1 ? 's' : ''} running</p>
        </div>
      </div>
      <Select onValueChange={(value) => router.push(`/sessions/${value}`)}>
        <SelectTrigger className="w-full">
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
