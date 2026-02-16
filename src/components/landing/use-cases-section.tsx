import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Lightbulb, Landmark, Microscope, Palette, Rocket } from 'lucide-react'

const useCases = [
  {
    title: 'Favorite Character in Literature',
    description:
      'Students analyze character development and debate motivations.',
    icon: BookOpen,
    color: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    title: 'Greatest Invention of All Time',
    description:
      'Students compare inventions across eras and debate impact.',
    icon: Lightbulb,
    color: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    title: 'Historical Events That Changed the World',
    description:
      'Students explore cause-and-effect relationships in history.',
    icon: Landmark,
    color: 'bg-stone-50 dark:bg-stone-900/20',
  },
  {
    title: 'Science Showdown: Animals with the Best Adaptations',
    description:
      'Students research survival strategies and evolutionary traits.',
    icon: Microscope,
    color: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    title: 'Most Influential Artists of the 20th Century',
    description:
      'Students evaluate artistic movements and cultural impact.',
    icon: Palette,
    color: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    title: "Space Exploration: Humanity's Greatest Missions",
    description:
      'Students compare achievements in space exploration and debate their significance.',
    icon: Rocket,
    color: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
] as const

export function UseCasesSection() {
  return (
    <section className="w-full bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        {/* Section heading */}
        <div className="mb-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Classroom Use Cases
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            See how teachers spark engagement across subjects
          </p>
        </div>

        {/* Use case cards */}
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => {
            const Icon = useCase.icon
            return (
              <div
                key={useCase.title}
                className={`group flex flex-col gap-3 rounded-xl border border-border/40 p-6 transition-all hover:shadow-md ${useCase.color}`}
              >
                <Icon className="h-8 w-8 text-brand-blue" />
                <h3 className="font-semibold text-foreground">
                  {useCase.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {useCase.description}
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
            variant="outline"
            className="border-foreground/20 px-8"
          >
            <Link href="/signup">Start Your Free Classroom Bracket</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
