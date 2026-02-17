import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getAuthenticatedAdmin } from '@/lib/dal/admin'
import { SignOutButton } from '@/components/auth/signout-button'
import { AdminSidebarNav } from '@/components/admin/admin-sidebar-nav'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getAuthenticatedAdmin()

  if (!admin) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Branded header with admin indicator */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/95 px-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
        {/* Amber accent line to distinguish from teacher dashboard */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500 via-amber-500/60 to-amber-600" />

        <div className="flex items-center gap-2.5">
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
          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border/60 bg-muted/30 md:block">
          <div className="flex h-full flex-col gap-2 p-4">
            <AdminSidebarNav />
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
