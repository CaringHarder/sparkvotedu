'use client'

import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DisplaySettingsSectionProps {
  children: React.ReactNode
  disabled?: boolean
}

export function DisplaySettingsSection({ children, disabled }: DisplaySettingsSectionProps) {
  return (
    <div className={cn('rounded-lg border p-3 space-y-2', disabled && 'opacity-60 pointer-events-none')}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Settings className="h-3.5 w-3.5" />
        Display Settings
      </h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}
