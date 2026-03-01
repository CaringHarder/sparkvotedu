'use client'

import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DisplaySettingsSectionProps {
  children: React.ReactNode
  disabled?: boolean
}

export function DisplaySettingsSection({ children, disabled }: DisplaySettingsSectionProps) {
  return (
    <div className={cn('rounded-lg border px-3 py-2 space-y-1.5', disabled && 'opacity-60 pointer-events-none')}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <Settings className="h-3.5 w-3.5" />
        Display Settings
      </h3>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {children}
      </div>
    </div>
  )
}
