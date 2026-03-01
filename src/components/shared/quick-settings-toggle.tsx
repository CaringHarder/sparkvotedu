'use client'

import { Switch } from '@/components/ui/switch'

interface QuickSettingsToggleProps {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  icon?: React.ReactNode
  description?: string
}

export function QuickSettingsToggle({
  label,
  checked,
  onCheckedChange,
  disabled,
  icon,
  description,
}: QuickSettingsToggleProps) {
  return (
    <label className="flex items-center gap-2">
      {icon && <span className="h-4 w-4 shrink-0 text-muted-foreground">{icon}</span>}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </label>
  )
}
