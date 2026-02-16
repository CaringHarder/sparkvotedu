'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-white/90 backdrop-blur-md dark:bg-background/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-icon.png"
            alt="SparkVotEDU"
            width={40}
            height={40}
            className="h-9 w-9"
            priority
          />
        </Link>

        {/* Right: Join Class + Log In link + Sign Up button */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-brand-blue/30 text-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue-dark"
          >
            <Link href="/join">
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Join Class</span>
            </Link>
          </Button>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Log In
          </Link>
          <Button
            asChild
            size="sm"
            className="bg-brand-amber px-5 text-white hover:bg-brand-amber-dark"
          >
            <Link href="/signup">Sign Up</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
