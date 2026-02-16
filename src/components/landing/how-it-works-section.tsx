import { PenLine, Share2, BarChart3 } from 'lucide-react'

const steps = [
  {
    number: 1,
    title: 'Create',
    description:
      'Build a bracket or poll in minutes. Choose from single-elimination, double-elimination, round-robin, or quick polls.',
    icon: PenLine,
  },
  {
    number: 2,
    title: 'Launch',
    description:
      'Share a simple 6-digit class code with your students. They join instantly from any device -- no accounts needed.',
    icon: Share2,
  },
  {
    number: 3,
    title: 'Engage',
    description:
      'Watch participation happen in real time. See votes flow in, track results live, and celebrate winners together.',
    icon: BarChart3,
  },
] as const

export function HowItWorksSection() {
  return (
    <section className="w-full bg-brand-blue-light/40 dark:bg-brand-blue-light/20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        {/* Section heading */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Get your classroom voting in three simple steps
          </p>
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
                {/* Numbered icon circle */}
                <div className="relative mb-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-lg shadow-brand-blue/20">
                    <Icon className="h-7 w-7" />
                  </div>
                  {/* Step number badge */}
                  <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-amber text-xs font-bold text-white shadow-sm">
                    {step.number}
                  </div>
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
      </div>
    </section>
  )
}
