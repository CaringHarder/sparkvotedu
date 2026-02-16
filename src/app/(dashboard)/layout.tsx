import Image from 'next/image'
import { SignOutButton } from '@/components/auth/signout-button'
import { SidebarNav } from '@/components/dashboard/sidebar-nav'
import { MobileNav } from '@/components/dashboard/mobile-nav'
import { ThemeToggle } from '@/components/theme-toggle'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Branded header with logo, theme toggle, and sign out */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/95 px-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
        {/* Subtle brand accent line at the very top */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-blue via-brand-blue/60 to-brand-amber" />

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Mobile hamburger menu */}
          <MobileNav />

          <Image
            src="/logo-icon.png"
            alt="SparkVotEDU"
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            SparkVot<span className="text-brand-blue">EDU</span>
          </span>
        </div>

        {/* Desktop: theme toggle + sign out; hidden on mobile (available in drawer) */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border/60 bg-muted/30 md:block">
          <div className="flex h-full flex-col gap-2 p-4">
            <SidebarNav />
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
