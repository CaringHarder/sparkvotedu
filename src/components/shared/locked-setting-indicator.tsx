import { Lock } from 'lucide-react'

interface LockedSettingIndicatorProps {
  label: string
  value: string
  tooltip?: string
}

export function LockedSettingIndicator({
  label,
  value,
  tooltip = 'Cannot be changed after creation',
}: LockedSettingIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5 text-sm whitespace-nowrap" title={tooltip}>
      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
