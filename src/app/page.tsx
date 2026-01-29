import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HomeJoinInput } from '@/components/student/home-join-input'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12 px-4">
      {/* Hero: Student Join (primary entry point) */}
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            SparkVotEDU
          </h1>
          <p className="text-lg text-muted-foreground">
            Ignite student voice through voting
          </p>
        </div>

        <div className="w-full">
          <HomeJoinInput />
        </div>

        <p className="text-xs text-muted-foreground">
          Enter your class code to join
        </p>
      </div>

      {/* Teacher section */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">Are you a teacher?</p>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/signup">Create Account</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
