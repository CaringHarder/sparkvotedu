import {
  Trophy,
  MessageSquare,
  Radio,
  BrainCircuit,
  Medal,
  BarChart3,
  Shield,
} from 'lucide-react'

const features = [
  {
    title: 'Tournament Brackets',
    description:
      'Single-elimination, double-elimination, and round-robin formats for any topic -- from literature debates to science fair matchups.',
    icon: Trophy,
    accent: 'brand-blue' as const,
  },
  {
    title: 'Quick Polls',
    description:
      'Simple or ranked polls with instant results. Perfect for classroom decisions, icebreakers, and formative checks.',
    icon: MessageSquare,
    accent: 'brand-amber' as const,
  },
  {
    title: 'Real-Time Results',
    description:
      'Live voting with results updating as students participate. Watch engagement happen right before your eyes.',
    icon: Radio,
    accent: 'brand-blue' as const,
  },
  {
    title: 'Predictive Brackets',
    description:
      'Students predict outcomes and compete on a scored leaderboard. Turns any tournament into a critical-thinking exercise.',
    icon: BrainCircuit,
    accent: 'brand-amber' as const,
  },
  {
    title: 'Sports Integration',
    description:
      'Import real NCAA tournaments for classroom prediction contests. Bring the excitement of March Madness into any subject.',
    icon: Medal,
    accent: 'brand-blue' as const,
  },
  {
    title: 'Analytics & Export',
    description:
      'Track participation rates, view vote distributions, and export data to CSV. Measure engagement with real numbers.',
    icon: BarChart3,
    accent: 'brand-amber' as const,
  },
  {
    title: 'Tier-Based Access',
    description:
      'Free, Pro, and Pro Plus plans for every classroom need. Start free and upgrade as your engagement grows.',
    icon: Shield,
    accent: 'brand-blue' as const,
  },
] as const

const accentStyles = {
  'brand-blue': {
    container: 'bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20',
    hover: 'group-hover:bg-brand-blue/15 dark:group-hover:bg-brand-blue/25',
  },
  'brand-amber': {
    container: 'bg-brand-amber/10 text-brand-amber dark:bg-brand-amber/20',
    hover: 'group-hover:bg-brand-amber/15 dark:group-hover:bg-brand-amber/25',
  },
} as const

export function FeaturesSection() {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        {/* Section heading */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything You Need to{' '}
            <span className="text-brand-blue">Spark Engagement</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Powerful tools designed for real classrooms, built to make every
            student's voice count
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            const styles = accentStyles[feature.accent]
            return (
              <div
                key={feature.title}
                className="group flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-border hover:shadow-md"
              >
                {/* Icon */}
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${styles.container} ${styles.hover}`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Title + description */}
                <div>
                  <h3 className="mb-1.5 font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
