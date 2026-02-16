import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PenLine, Vote, MessageCircle } from 'lucide-react'

const steps = [
  {
    number: 1,
    title: 'Create a Bracket',
    description:
      'Teachers set up lesson-based tournaments in minutes.',
    icon: PenLine,
  },
  {
    number: 2,
    title: 'Students Vote & Reflect',
    description:
      'Each round builds engagement and critical thinking.',
    icon: Vote,
  },
  {
    number: 3,
    title: 'Discuss & Learn',
    description:
      'Use voting results as a launchpad for classroom discussion.',
    icon: MessageCircle,
  },
] as const

export function HowItWorksSection() {
  return (
    <section className="w-full bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        {/* Section heading */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h2>
        </div>

        {/* 3-step cards */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.number}
                className="flex flex-col items-center text-center"
              >
                {/* Icon circle */}
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue text-white shadow-lg shadow-brand-blue/20">
                  <Icon className="h-7 w-7" />
                </div>

                {/* Title + description */}
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 flex justify-center">
          <Button
            asChild
            size="lg"
            className="bg-brand-blue px-8 text-white hover:bg-brand-blue-dark"
          >
            <Link href="/signup">Start Creating Brackets</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
