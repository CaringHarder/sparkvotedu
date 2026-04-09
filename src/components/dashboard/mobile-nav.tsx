'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { navItems, bottomNavItems, type NavItem } from '@/components/dashboard/sidebar-nav'
import { SignOutButton } from '@/components/auth/signout-button'
import { ThemeToggle } from '@/components/theme-toggle'

/**
 * Mobile navigation drawer for the teacher dashboard.
 *
 * Renders a hamburger button (visible only on md:hidden) that opens
 * a left-sliding drawer containing the full sidebar navigation,
 * sign-out button, and theme toggle. The drawer and backdrop are
 * portaled to document.body to escape the header's backdrop-filter
 * stacking context. All interactive elements have minimum 44x44px
 * touch targets for mobile accessibility.
 */
export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Portal needs client-side mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close drawer on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const close = useCallback(() => setIsOpen(false), [])
  const pathname = usePathname()

  function renderMobileNavLink(item: NavItem) {
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

  const drawer = (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Sliding drawer panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-background shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Brand accent line at top */}
        <div className="h-0.5 w-full bg-gradient-to-r from-brand-blue via-brand-blue/60 to-brand-amber" />

        {/* Drawer header */}
        <div className="flex h-14 items-center justify-between border-b border-border/60 px-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo-icon.png"
              alt="SparkVotEDU"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="text-lg font-bold tracking-tight text-foreground">
              SparkVot<span className="text-brand-blue">EDU</span>
            </span>
          </div>

          {/* Close button -- 44x44px touch target */}
          <button
            type="button"
            onClick={close}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable top navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-4" onClick={close}>
          <nav className="flex flex-col gap-1">
            {navItems.map(item => renderMobileNavLink(item))}
          </nav>
        </div>

        {/* Sticky bottom navigation -- never scrolls */}
        <div className="border-t border-border/60 px-4 py-3" onClick={close}>
          <nav className="flex flex-col gap-1">
            {bottomNavItems.map(item => renderMobileNavLink(item))}
          </nav>
        </div>

        {/* Footer: Theme toggle + Sign out */}
        <div className="border-t border-border/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Hamburger button -- 44x44px touch target */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Portal drawer to body to escape header's backdrop-filter stacking context */}
      {mounted && createPortal(drawer, document.body)}
    </>
  )
}
