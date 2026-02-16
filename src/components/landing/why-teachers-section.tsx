import { Quote } from 'lucide-react'

const stats = [
  'Students are 90% more engaged when lessons include voting.',
  'Teachers save prep time with ready-made topic lists.',
  'Every vote drives collaboration and reflection.',
] as const

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: '8th Grade English Teacher',
    school: 'Lincoln Middle School',
    quote:
      'SparkVotEDU transformed my literature class. Students who never participated are now leading debates about character motivations. The bracket format makes complex discussions accessible and fun.',
  },
  {
    name: 'David Chen',
    role: 'High School Biology Teacher',
    school: 'Roosevelt High School',
    quote:
      "As a science teacher, I love how SparkVotEDU gets students researching and defending their choices. The 'Animals with Best Adaptations' bracket sparked a week of incredible learning.",
  },
  {
    name: 'Marcus Thompson',
    role: '8th Grade Social Studies Teacher',
    school: 'Washington Elementary',
    quote:
      "My 6th graders used to dread social studies, but SparkVotEDU changed everything. The 'Historical Events' bracket turned passive learners into historians actively debating the impact of major events.",
  },
] as const

export function WhyTeachersSection() {
  return (
    <section className="w-full bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        {/* Section heading */}
        <div className="mb-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Why Teachers Choose SparkVotEDU
          </h2>
          <p className="mt-2 text-lg text-muted-foreground">
            Learning through participation.
          </p>
        </div>

        {/* Stats */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat}
              className="rounded-lg border border-border/40 bg-muted/30 p-4 text-center text-sm text-muted-foreground"
            >
              {stat}
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="flex flex-col gap-4 rounded-xl border border-border/40 bg-card p-6"
            >
              {/* Author info */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                  <span className="text-sm font-bold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {testimonial.school}
                  </p>
                </div>
              </div>

              {/* Quote */}
              <div className="relative">
                <Quote className="absolute -left-1 -top-1 h-4 w-4 text-brand-amber/40" />
                <p className="pl-4 text-sm italic leading-relaxed text-muted-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
