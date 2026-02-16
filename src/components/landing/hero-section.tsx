import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { HomeJoinInput } from '@/components/student/home-join-input'

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-brand-blue via-brand-blue to-brand-blue-dark dark:from-brand-blue-dark dark:via-brand-blue-dark dark:to-background">
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 py-16 text-center sm:px-6 sm:py-24 lg:py-28">
        {/* Large centered logo */}
        <div className="flex flex-col items-center gap-1">
          <Image
            src="/logo-horizontal.png"
            alt="SparkVotEDU - Ignite Student Voice Through Voting"
            width={320}
            height={80}
            className="h-auto w-56 sm:w-72 lg:w-80"
            priority
          />
        </div>

        {/* Main headline */}
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Spark classroom energy through interactive voting.
          </h1>
          <p className="max-w-2xl text-lg text-white/80">
            With SparkVotEDU, every student has a voice, and every vote sparks
            engagement.
          </p>
        </div>

        {/* Dual CTAs */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-4">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/40 bg-white/10 px-8 text-white backdrop-blur-sm hover:bg-white/20"
          >
            <Link href="/signup">Get Started Free</Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="bg-brand-amber px-8 text-white hover:bg-brand-amber-dark"
          >
            <Link href="/login">Log In</Link>
          </Button>
        </div>

        {/* Student class code input */}
        <div className="w-full max-w-sm">
          <p className="mb-2 text-sm font-medium text-white/70">
            Student? Enter your class code:
          </p>
          <HomeJoinInput />
        </div>

        {/* Tagline */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-white/70">
            SparkVotEDU &ndash; Where every vote sparks learning.
          </p>
        </div>
      </div>
    </section>
  )
}
