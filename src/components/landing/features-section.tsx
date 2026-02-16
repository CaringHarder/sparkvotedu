import Link from 'next/link'
import { Button } from '@/components/ui/button'

const features = [
  {
    emoji: '\u{1F3C0}',
    title: 'Tournament Brackets',
    description:
      'Single elimination, double elimination, or round robin formats for any topic',
    color: 'bg-orange-50 dark:bg-orange-900/15',
  },
  {
    emoji: '\u{1F52E}',
    title: 'Predictive Brackets',
    description:
      'Students predict outcomes and compete for the best predictions',
    color: 'bg-purple-50 dark:bg-purple-900/15',
  },
  {
    emoji: '\u{1F4CA}',
    title: 'Polls & Rankings',
    description:
      'Simple or ranked choice polls for quick classroom feedback',
    color: 'bg-emerald-50 dark:bg-emerald-900/15',
  },
] as const

export function FeaturesSection() {
  return (
    <section className="w-full bg-background">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        {/* Section heading */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            What You Can Create
          </h2>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`flex flex-col gap-3 rounded-xl border border-border/30 p-8 ${feature.color}`}
            >
              <span className="text-4xl">{feature.emoji}</span>
              <h3 className="text-lg font-bold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex justify-center">
          <Button
            asChild
            size="lg"
            className="bg-brand-blue px-8 text-white hover:bg-brand-blue-dark"
          >
            <Link href="/signup">Get Started Free</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
