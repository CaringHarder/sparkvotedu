'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          {/* Icon on mobile, horizontal lockup on desktop */}
          <Image
            src="/logo-icon.png"
            alt="SparkVotEDU"
            width={36}
            height={36}
            className="block sm:hidden"
            priority
          />
          <Image
            src="/logo-horizontal.png"
            alt="SparkVotEDU"
            width={160}
            height={40}
            className="hidden sm:block"
            priority
          />
        </Link>

        {/* Right: Theme toggle + Sign In */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
