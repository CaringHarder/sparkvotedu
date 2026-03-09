'use client'

import { cn } from '@/lib/utils'

interface NameViewToggleProps {
  value: 'fun' | 'real'
  onChange: (v: 'fun' | 'real') => void
}

export function NameViewToggle({ value, onChange }: NameViewToggleProps) {
  return (
    <div className="flex rounded-md border bg-muted p-0.5">
      <button
        type="button"
        onClick={() => onChange('fun')}
        className={cn(
          'rounded-sm px-2 py-0.5 text-xs font-medium transition-colors',
          value === 'fun'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Fun
      </button>
      <button
        type="button"
        onClick={() => onChange('real')}
        className={cn(
          'rounded-sm px-2 py-0.5 text-xs font-medium transition-colors',
          value === 'real'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Real
      </button>
    </div>
  )
}
