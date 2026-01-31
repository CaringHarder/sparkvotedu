'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Zap, Trophy, BarChart3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface NavSection {
  label: string
  href: string
  icon: LucideIcon
  isActive: (pathname: string) => boolean
  subItems: NavItem[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Sessions', href: '/sessions', icon: Users },
]

const activitiesSection: NavSection = {
  label: 'Activities',
  href: '/activities',
  icon: Zap,
  isActive: (pathname: string) =>
    pathname === '/activities' ||
    pathname.startsWith('/activities/') ||
    pathname.startsWith('/brackets') ||
    pathname.startsWith('/polls'),
  subItems: [
    { label: 'Brackets', href: '/brackets', icon: Trophy },
    { label: 'Polls', href: '/polls', icon: BarChart3 },
  ],
}

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {/* Standard nav items */}
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}

      {/* Activities section with sub-items */}
      {(() => {
        const sectionActive = activitiesSection.isActive(pathname)
        const SectionIcon = activitiesSection.icon

        return (
          <div>
            <Link
              href={activitiesSection.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                sectionActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <SectionIcon className="h-4 w-4" />
              {activitiesSection.label}
            </Link>

            {/* Sub-items: always visible, indented */}
            <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l pl-3">
              {activitiesSection.subItems.map((sub) => {
                const subActive =
                  pathname === sub.href || pathname.startsWith(sub.href + '/')
                const SubIcon = sub.icon

                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      subActive
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <SubIcon className="h-3.5 w-3.5" />
                    {sub.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })()}
    </nav>
  )
}
