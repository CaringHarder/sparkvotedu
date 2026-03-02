'use client'

interface BracketQuickCreateProps {
  sessions: Array<{
    id: string
    code: string
    name: string | null
    createdAt: string
  }>
}

export function BracketQuickCreate({ sessions }: BracketQuickCreateProps) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <p className="text-muted-foreground">
        Quick Create coming soon... ({sessions.length} sessions available)
      </p>
    </div>
  )
}
