'use client'

import { Settings } from 'lucide-react'

interface AdminGearButtonProps {
  isAdmin: boolean
}

export function AdminGearButton({ isAdmin }: AdminGearButtonProps) {
  if (!isAdmin) {
    return null
  }

  return (
    <a
      href="/admin"
      target="_blank"
      rel="noopener noreferrer"
      title="Admin Panel"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Settings className="h-4 w-4" />
    </a>
  )
}
