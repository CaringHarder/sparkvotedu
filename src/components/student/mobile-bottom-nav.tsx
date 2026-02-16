'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Vote, Trophy } from 'lucide-react'

interface MobileBottomNavProps {
  sessionId: string
}

/**
 * Fixed bottom navigation bar for students on mobile.
 *
 * Renders three navigation tabs (Home, Activity, Results) with
 * 44px minimum touch targets and safe area insets for notched
 * devices. Only visible on mobile (md:hidden). Active tab
 * highlighted with brand-blue.
 */
export function MobileBottomNav({ sessionId }: MobileBottomNavProps) {
  const pathname = usePathname()

  const tabs = [
    {
      label: 'Home',
      href: `/session/${sessionId}`,
      icon: Home,
      isActive:
        pathname === `/session/${sessionId}` ||
        pathname === `/session/${sessionId}/`,
    },
    {
      label: 'Activity',
      href: `/session/${sessionId}`,
      icon: Vote,
      isActive:
        pathname.includes('/bracket/') || pathname.includes('/poll/'),
    },
    {
      label: 'Results',
      href: `/session/${sessionId}`,
      icon: Trophy,
      isActive: false,
    },
  ] as const

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-xs font-medium transition-colors ${
                tab.isActive
                  ? 'text-brand-blue'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  tab.isActive ? 'text-brand-blue' : ''
                }`}
              />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
