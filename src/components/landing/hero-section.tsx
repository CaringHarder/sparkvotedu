import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HomeJoinInput } from '@/components/student/home-join-input'
import { Sparkles } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Subtle decorative background rays */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-brand-blue/8 blur-3xl" />
        <div className="absolute -top-12 left-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-brand-amber/6 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 py-20 text-center sm:px-6 sm:py-28 lg:py-32">
        {/* Spark accent badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-amber/30 bg-brand-amber-light/50 px-3 py-1 text-sm font-medium text-brand-amber-dark dark:bg-brand-amber-light/30 dark:text-brand-amber">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Interactive Classroom Engagement</span>
        </div>

        {/* Main headline */}
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Ignite Student Voice{' '}
            <span className="bg-gradient-to-r from-brand-blue to-brand-blue-dark bg-clip-text text-transparent dark:from-brand-blue dark:to-brand-blue">
              Through Voting
            </span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Brackets, polls, and predictions that spark real engagement in your
            classroom. Students join with a simple code -- teachers see
            participation happen in real time.
          </p>
        </div>

        {/* Dual CTAs */}
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          {/* Student class code input */}
          <div className="w-full">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Student? Enter your class code:
            </p>
            <HomeJoinInput />
          </div>

          {/* Divider */}
          <div className="flex w-full items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Teacher CTA */}
          <div className="flex flex-col items-center gap-2">
            <Button
              asChild
              size="lg"
              className="bg-brand-blue px-8 text-white hover:bg-brand-blue-dark"
            >
              <Link href="/signup">Get Started Free</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              No credit card required
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
