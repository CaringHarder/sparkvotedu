import Link from 'next/link'

export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-border/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        {/* Branding */}
        <p className="text-sm text-muted-foreground">
          &copy; {year} SparkVotEDU. All rights reserved.
        </p>

        {/* Links */}
        <nav className="flex gap-6">
          <Link
            href="/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Create Account
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  )
}
