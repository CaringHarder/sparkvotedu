'use client'

import { cn } from '@/lib/utils'

interface ViewingModeToggleProps {
  value: 'simple' | 'advanced'
  onValueChange: (mode: 'simple' | 'advanced') => void
  disabled?: boolean
  icon?: React.ReactNode
}

export function ViewingModeToggle({
  value,
  onValueChange,
  disabled,
  icon,
}: ViewingModeToggleProps) {
  return (
    <div className={cn('flex items-center gap-2 whitespace-nowrap', disabled && 'opacity-50 pointer-events-none')}>
      {icon && <span className="h-4 w-4 shrink-0 text-muted-foreground">{icon}</span>}
      <div className="inline-flex rounded-md border">
        <button
          type="button"
          className={cn(
            'px-2.5 py-0.5 text-xs font-medium transition-colors rounded-l-md',
            value === 'simple'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent'
          )}
          onClick={() => {
            if (value !== 'simple') onValueChange('simple')
          }}
        >
          Simple
        </button>
        <button
          type="button"
          className={cn(
            'px-2.5 py-0.5 text-xs font-medium transition-colors rounded-r-md',
            value === 'advanced'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent'
          )}
          onClick={() => {
            if (value !== 'advanced') onValueChange('advanced')
          }}
        >
          Advanced
        </button>
      </div>
    </div>
  )
}
