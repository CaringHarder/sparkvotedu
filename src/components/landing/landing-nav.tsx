'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-white/90 backdrop-blur-md dark:bg-background/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-icon.png"
            alt="SparkVotEDU"
            width={32}
            height={32}
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

        {/* Right: Log In link + Sign Up button */}
        <div className="flex items-center gap-4">
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
        </div>
      </div>
    </nav>
  )
}
