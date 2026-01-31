/** Curated poll template for quick-start poll creation */
export interface PollTemplate {
  id: string
  category: string
  question: string
  options: string[]
  pollType: 'simple' | 'ranked'
}

/** All curated poll template categories */
export const POLL_TEMPLATE_CATEGORIES = [
  'Icebreakers',
  'Classroom Decisions',
  'Academic Debates',
  'Fun & Trivia',
  'Feedback',
] as const

export type PollTemplateCategory = (typeof POLL_TEMPLATE_CATEGORIES)[number]

/** Curated poll templates across 5 categories (18 total) */
export const POLL_TEMPLATES: PollTemplate[] = [
  // --- Icebreakers (4) ---
  {
    id: 'ice-would-you-rather',
    category: 'Icebreakers',
    question: 'Would you rather have the ability to fly or be invisible?',
    options: ['Fly', 'Be invisible'],
    pollType: 'simple',
  },
  {
    id: 'ice-favorite-season',
    category: 'Icebreakers',
    question: "What's your favorite season?",
    options: ['Spring', 'Summer', 'Fall', 'Winter'],
    pollType: 'simple',
  },
  {
    id: 'ice-pizza-topping',
    category: 'Icebreakers',
    question: 'Best pizza topping?',
    options: ['Pepperoni', 'Cheese', 'Hawaiian', 'Veggie', 'BBQ Chicken', 'Margherita'],
    pollType: 'simple',
  },
  {
    id: 'ice-superpower',
    category: 'Icebreakers',
    question: 'Rank these dream superpowers from best to worst',
    options: ['Time travel', 'Teleportation', 'Mind reading', 'Super strength', 'Invisibility'],
    pollType: 'ranked',
  },

  // --- Classroom Decisions (3) ---
  {
    id: 'class-reward',
    category: 'Classroom Decisions',
    question: 'What should we do for our class reward?',
    options: ['Movie day', 'Extra recess', 'Pizza party', 'Game time', 'Free choice'],
    pollType: 'simple',
  },
  {
    id: 'class-topic-next',
    category: 'Classroom Decisions',
    question: 'Which topic should we cover next?',
    options: ['Topic A', 'Topic B', 'Topic C', 'Topic D'],
    pollType: 'ranked',
  },
  {
    id: 'class-study-day',
    category: 'Classroom Decisions',
    question: 'Best day for study sessions?',
    options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    pollType: 'simple',
  },

  // --- Academic Debates (4) ---
  {
    id: 'acad-math-discovered',
    category: 'Academic Debates',
    question: 'Is math discovered or invented?',
    options: ['Discovered', 'Invented', 'Both'],
    pollType: 'simple',
  },
  {
    id: 'acad-best-discovery',
    category: 'Academic Debates',
    question: 'Rank the most important scientific discoveries',
    options: ['Gravity', 'Electricity', 'Penicillin', 'DNA structure', 'Theory of relativity'],
    pollType: 'ranked',
  },
  {
    id: 'acad-renewable-energy',
    category: 'Academic Debates',
    question: 'Which renewable energy source has the most potential?',
    options: ['Solar', 'Wind', 'Hydroelectric', 'Geothermal', 'Nuclear fusion'],
    pollType: 'simple',
  },
  {
    id: 'acad-history-figure',
    category: 'Academic Debates',
    question: 'Rank the most influential historical figures',
    options: ['Einstein', 'Da Vinci', 'Shakespeare', 'Curie', 'Aristotle', 'Newton'],
    pollType: 'ranked',
  },

  // --- Fun & Trivia (4) ---
  {
    id: 'fun-cats-vs-dogs',
    category: 'Fun & Trivia',
    question: 'Cats vs Dogs?',
    options: ['Cats', 'Dogs', 'Both equally'],
    pollType: 'simple',
  },
  {
    id: 'fun-best-movie',
    category: 'Fun & Trivia',
    question: 'Best movie genre of all time?',
    options: ['Action', 'Comedy', 'Sci-fi', 'Animation', 'Horror', 'Drama'],
    pollType: 'simple',
  },
  {
    id: 'fun-game-genre',
    category: 'Fun & Trivia',
    question: 'Rank your favorite video game genres',
    options: ['Adventure', 'Puzzle', 'Sports', 'RPG', 'Strategy', 'Simulation'],
    pollType: 'ranked',
  },
  {
    id: 'fun-desert-island',
    category: 'Fun & Trivia',
    question: 'If stranded on a desert island, which one item would you bring?',
    options: ['A book', 'A knife', 'A fishing rod', 'A phone (no signal)', 'A tent'],
    pollType: 'simple',
  },

  // --- Feedback (3) ---
  {
    id: 'fb-lesson-understanding',
    category: 'Feedback',
    question: "How well do you understand today's lesson?",
    options: ['Totally get it', 'Mostly understand', 'Somewhat confused', 'Very lost'],
    pollType: 'simple',
  },
  {
    id: 'fb-activity-rating',
    category: 'Feedback',
    question: "Rate today's activity",
    options: ['Loved it', 'Liked it', 'It was okay', 'Not for me'],
    pollType: 'simple',
  },
  {
    id: 'fb-improve-class',
    category: 'Feedback',
    question: 'What would most improve this class?',
    options: [
      'More group work',
      'More hands-on activities',
      'More discussion time',
      'More individual practice',
      'More technology use',
    ],
    pollType: 'ranked',
  },
]

/**
 * Get templates filtered by category.
 * Returns all templates if no category provided.
 */
export function getTemplatesByCategory(category?: string): PollTemplate[] {
  if (!category) return POLL_TEMPLATES
  return POLL_TEMPLATES.filter((t) => t.category === category)
}
