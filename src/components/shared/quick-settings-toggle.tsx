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
    <label className="flex items-center gap-2 whitespace-nowrap">
      {icon && <span className="h-4 w-4 shrink-0 text-muted-foreground">{icon}</span>}
      <span className="text-sm font-medium text-muted-foreground" title={description}>{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </label>
  )
}
