import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          SparkVotEDU
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Interactive brackets and polls for your classroom
        </p>
      </div>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/login">Sign In</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/signup">Create Account</Link>
        </Button>
      </div>
    </div>
  )
}
