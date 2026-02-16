import Link from 'next/link'
import Image from 'next/image'

export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-border/50 bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Branding */}
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <div className="flex items-center gap-2">
              <Image
                src="/logo-icon.png"
                alt="SparkVotEDU"
                width={24}
                height={24}
                className="h-6 w-6"
              />
              <span className="text-sm font-semibold text-foreground">
                SparkVotEDU
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Where every vote sparks learning.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign Up
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
          </nav>
        </div>

        {/* Copyright */}
        <div className="mt-6 border-t border-border/30 pt-6 text-center">
          <p className="text-xs text-muted-foreground/70">
            &copy; {year} SparkVotEDU. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
