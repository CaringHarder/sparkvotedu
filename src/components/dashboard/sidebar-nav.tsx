'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Archive, Zap, Trophy, BarChart3, CreditCard, LineChart, User } from 'lucide-react'
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
  { label: 'Archived', href: '/sessions/archived', icon: Archive },
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

const bottomNavItems: NavItem[] = [
  { label: 'Analytics', href: '/analytics', icon: LineChart },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Profile', href: '/profile', icon: User },
]

export function SidebarNav() {
  const pathname = usePathname()

  const renderNavLink = (item: NavItem) => {
    // Active if pathname matches AND no other navItem is a more specific prefix match.
    // This ensures "Sessions" (/sessions) is active for /sessions and /sessions/123
    // but NOT for /sessions/archived (because "Archived" is a more specific match).
    const isActive =
      (pathname === item.href || pathname.startsWith(item.href + '/')) &&
      !navItems.some(
        (other) =>
          other.href !== item.href &&
          other.href.startsWith(item.href) &&
          (pathname === other.href || pathname.startsWith(other.href + '/'))
      )
    const Icon = item.icon

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/15 dark:text-brand-blue'
            : 'text-muted-foreground hover:bg-brand-blue/5 hover:text-foreground dark:hover:bg-brand-blue/10'
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 transition-colors ${
          isActive ? 'text-brand-blue' : 'text-muted-foreground group-hover:text-foreground'
        }`} />
        {item.label}
      </Link>
    )
  }

  return (
    <nav className="flex h-full flex-col">
      {/* Main navigation */}
      <div className="flex flex-col gap-1">
        {navItems.map(renderNavLink)}
      </div>

      {/* Separator */}
      <div className="my-3 h-px bg-border/60" />

      {/* Activities section */}
      {(() => {
        const sectionActive = activitiesSection.isActive(pathname)
        const SectionIcon = activitiesSection.icon

        return (
          <div className="flex flex-col gap-1">
            <Link
              href={activitiesSection.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                sectionActive
                  ? 'bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/15 dark:text-brand-blue'
                  : 'text-muted-foreground hover:bg-brand-blue/5 hover:text-foreground dark:hover:bg-brand-blue/10'
              }`}
            >
              <SectionIcon className={`h-4 w-4 shrink-0 transition-colors ${
                sectionActive ? 'text-brand-blue' : 'text-muted-foreground group-hover:text-foreground'
              }`} />
              {activitiesSection.label}
            </Link>

            {/* Sub-items with refined indentation */}
            <div className="ml-5 flex flex-col gap-0.5 border-l-2 border-brand-blue/15 pl-3 dark:border-brand-blue/20">
              {activitiesSection.subItems.map((sub) => {
                const subActive =
                  pathname === sub.href || pathname.startsWith(sub.href + '/')
                const SubIcon = sub.icon

                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                      subActive
                        ? 'bg-brand-blue/8 text-brand-blue dark:text-brand-blue'
                        : 'text-muted-foreground hover:bg-brand-blue/5 hover:text-foreground'
                    }`}
                  >
                    <SubIcon className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                      subActive ? 'text-brand-blue' : 'text-muted-foreground group-hover:text-foreground'
                    }`} />
                    {sub.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Spacer pushes bottom items down */}
      <div className="flex-1" />

      {/* Separator before bottom section */}
      <div className="my-3 h-px bg-border/60" />

      {/* Bottom navigation */}
      <div className="flex flex-col gap-1">
        {bottomNavItems.map(renderNavLink)}
      </div>
    </nav>
  )
}
