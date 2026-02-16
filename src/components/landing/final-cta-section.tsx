import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HomeJoinInput } from '@/components/student/home-join-input'
import { Sparkles } from 'lucide-react'

export function FinalCTASection() {
  return (
    <section className="w-full bg-brand-blue text-white dark:bg-brand-blue-dark">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 py-16 text-center sm:px-6 sm:py-20">
        {/* Headline */}
        <div className="flex flex-col items-center gap-3">
          <Sparkles className="h-8 w-8 text-brand-amber" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Spark Engagement?
          </h2>
          <p className="max-w-lg text-lg text-white/80">
            Join thousands of educators using SparkVotEDU to make every
            student's voice heard
          </p>
        </div>

        {/* Dual entry points */}
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          {/* Student class code */}
          <div className="w-full">
            <p className="mb-2 text-sm font-medium text-white/70">
              Student? Enter your class code:
            </p>
            <HomeJoinInput />
          </div>

          {/* Divider */}
          <div className="flex w-full items-center gap-3">
            <div className="h-px flex-1 bg-white/20" />
            <span className="text-xs font-medium text-white/50">OR</span>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          {/* Teacher sign-up */}
          <Button
            asChild
            size="lg"
            className="bg-brand-amber px-8 text-white hover:bg-brand-amber-dark"
          >
            <Link href="/signup">Create Your Free Account</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
