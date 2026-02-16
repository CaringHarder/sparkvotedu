import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Main hero gradient */}
      <div className="bg-gradient-to-b from-[oklch(0.30_0.12_230)] via-[oklch(0.25_0.10_230)] to-[oklch(0.20_0.08_230)]">
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 py-16 text-center sm:px-6 sm:py-24 lg:py-28">
          {/* Large centered logo -- always dark variant (white text) on dark blue hero */}
          <div className="flex flex-col items-center gap-1">
            <Image
              src="/logo-horizontal-dark.png"
              alt="SparkVotEDU - Ignite Student Voice Through Voting"
              width={560}
              height={315}
              className="h-auto w-80 sm:w-[28rem] lg:w-[560px]"
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

          {/* Tagline */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-white/70">
              SparkVotEDU &ndash; Where every vote sparks learning.
            </p>
          </div>
        </div>
      </div>

      {/* Smooth transition from hero blue to white background */}
      <div className="h-16 bg-gradient-to-b from-[oklch(0.20_0.08_230)] to-background sm:h-20" />
    </section>
  )
}
