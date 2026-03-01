# Phase 33: Bracket Quick Create - Research

**Researched:** 2026-03-01
**Domain:** Bracket creation UX, tab toggle pattern, topic chip grid, session assignment
**Confidence:** HIGH

## Summary

Phase 33 adds a "Quick Create" tab to the bracket creation page (`/brackets/new`) that lets teachers create a bracket by picking a curated topic chip, selecting an entrant count (4/8/16), choosing a session, and clicking Create. The existing wizard becomes the "Step-by-Step" tab (default). The bracket is created with SE type, simple viewing mode, no seeds visible as defaults.

The codebase already has **all the building blocks**: the `CURATED_TOPICS` data (10 topic lists, each with 16 items), the `createBracket` server action with full validation/gate checks, the `TopicPicker` component with subject color-coding, the `SUBJECT_COLORS` map, and a working tab toggle pattern from the poll creation page. The poll page at `src/app/(dashboard)/polls/new/page.tsx` already implements exactly the "Quick Create / Step-by-Step" tab toggle with `mode` state. The bracket form at `src/components/bracket/bracket-form.tsx` is a 3-step wizard that becomes the Step-by-Step tab. No new backend work is needed -- `createBracket` already accepts `sessionId`, `bracketType`, `viewingMode`, and `showSeedNumbers` via the existing `createBracketSchema`.

**Primary recommendation:** Restructure `brackets/new/page.tsx` to be a client component with a tab toggle (matching the poll page pattern), extract the existing `BracketForm` wizard into the Step-by-Step tab, and build a new `BracketQuickCreate` component for the Quick Create tab that uses `CURATED_TOPICS` data directly, random entrant selection, and calls `createBracket` with hardcoded SE/simple/no-seeds defaults.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Flat chip grid -- all curated topics in one grid, no grouping by subject headers
- Color-coded by subject (Science, History, Arts, etc.) but not separated into sections
- No search bar -- there are ~10 curated topic lists, all visible at once
- No preview on click -- clicking a chip highlights/selects it, no tooltip or expansion showing entrant names
- Three entrant count options: 4, 8, 16
- No default pre-selected -- teacher must explicitly pick a count
- Random selection of entrants from the topic list when count is less than total available (keeps it fresh across multiple brackets)
- No confirmation step -- click Create and the bracket is created immediately (speed is the point)
- After creation, land on the newly created bracket's detail page (teacher can review, edit, or Go Live from there)
- Session picker: inline session dropdown on the Quick Create tab (teacher picks which class gets the bracket)
- Tab toggle on the bracket creation page: "Quick Create" and "Step-by-Step"
- Step-by-Step is the default tab (existing wizard shows first)
- Existing wizard gets a minor visual refresh to feel cohesive with the new Quick Create tab
- Quick Create tab has: topic chip grid, entrant count picker, inline session picker, and Create button

### Claude's Discretion
- Subject color-coding implementation (colored border, badge, or tint -- whatever fits the design system)
- Entrant count picker component style (segmented control, pill buttons, etc.)
- Bracket title naming approach when quick-created
- Handling when a topic has fewer items than the selected count (disable or adapt)
- Exact visual refresh scope for the Step-by-Step wizard tab

### Deferred Ideas (OUT OF SCOPE)
- Poll creation page should adopt the same tab toggle pattern (Quick Create / Step-by-Step with Step-by-Step as default) -- Phase 34 scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js (App Router) | 15.x | Page routing, server components | Already in use; `/brackets/new/page.tsx` is the target page |
| React | 19.x | UI components | Already in use across all components |
| Zod | 3.x | Validation | `createBracketSchema` already validates all needed fields |
| Prisma | 6.x | Database ORM | `createBracketDAL` handles bracket+entrant+matchup creation |
| Tailwind CSS | 4.x | Styling | Entire design system uses Tailwind utility classes |
| lucide-react | latest | Icons | Used throughout for Zap, List, Trophy, etc. |
| nanoid | 5.x | Client-side temp IDs | Used in `bracket-form.tsx` for entrant IDs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | latest | Badge/component variants | Badge component uses it; topic chips may use Badge |
| @radix-ui/react-slot | latest | Badge asChild pattern | Already used by Badge component |

### Alternatives Considered
None -- all needed libraries are already in the project. No new dependencies required.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/(dashboard)/brackets/new/
│   └── page.tsx                          # MODIFY: Convert to client component with tab toggle + session fetch
├── components/bracket/
│   ├── bracket-form.tsx                  # EXISTING: Becomes "Step-by-Step" tab content (minor visual refresh)
│   ├── bracket-quick-create.tsx          # NEW: Quick Create tab component
│   └── topic-picker.tsx                  # EXISTING: Reference for SUBJECT_COLORS (not reused directly)
├── lib/bracket/
│   └── curated-topics.ts                # EXISTING: CURATED_TOPICS data (10 lists, 16 items each)
└── actions/
    └── bracket.ts                        # EXISTING: createBracket action (no changes needed)
```

### Pattern 1: Tab Toggle (from Poll Creation Page)
**What:** A mode toggle using `bg-muted p-1` wrapper with two buttons that switch between Quick Create and Step-by-Step modes.
**When to use:** Bracket creation page -- identical to existing poll creation page pattern.
**Example:**
```typescript
// Source: src/app/(dashboard)/polls/new/page.tsx lines 97-122
type CreationMode = 'quick' | 'wizard'
const [mode, setMode] = useState<CreationMode>('wizard') // Step-by-Step is default

<div className="flex gap-1 rounded-lg bg-muted p-1">
  <button
    type="button"
    onClick={() => setMode('quick')}
    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      mode === 'quick'
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    }`}
  >
    <Zap className="h-4 w-4" />
    Quick Create
  </button>
  <button
    type="button"
    onClick={() => setMode('wizard')}
    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      mode === 'wizard'
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    }`}
  >
    <List className="h-4 w-4" />
    Step-by-Step
  </button>
</div>
```

### Pattern 2: Flat Topic Chip Grid with Subject Colors
**What:** All 10 curated topics rendered as clickable chips in a single flex-wrap grid, color-coded by subject using the existing `SUBJECT_COLORS` map from `topic-picker.tsx`.
**When to use:** Quick Create tab -- replaces the grouped-by-subject layout of the existing TopicPicker.
**Example:**
```typescript
// Source: src/components/bracket/topic-picker.tsx lines 16-24
const SUBJECT_COLORS: Record<string, string> = {
  Science: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  History: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Literature: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Arts: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Geography: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Pop Culture': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Fun: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}
```

### Pattern 3: Session Dropdown (from Bracket Detail Page)
**What:** Inline `<select>` element fetching teacher's active sessions via server-side query, passed as props to client component.
**When to use:** Quick Create tab needs an inline session picker.
**Example:**
```typescript
// Source: src/app/(dashboard)/brackets/[bracketId]/page.tsx lines 52-56
const sessions = await prisma.classSession.findMany({
  where: { teacherId: teacher.id, status: 'active' },
  select: { id: true, code: true, createdAt: true, name: true },
  orderBy: { createdAt: 'desc' },
})

// Render pattern from bracket-detail.tsx lines 440-452
<select
  value={selectedSessionId ?? ''}
  onChange={(e) => setSelectedSessionId(e.target.value || null)}
  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
>
  <option value="">Select a session...</option>
  {sessions.map((s) => (
    <option key={s.id} value={s.id}>
      {s.name ? `${s.name} (${s.code})` : `Unnamed Session (${s.code})`}
    </option>
  ))}
</select>
```

### Pattern 4: createBracket Server Action Call
**What:** The existing `createBracket` server action accepts bracket data + entrants array, validates with Zod, checks feature gates, and calls DAL.
**When to use:** Quick Create's Create button calls this with hardcoded defaults.
**Example:**
```typescript
// Source: src/actions/bracket.ts line 48-115
// Already accepts sessionId in the schema (validation.ts line 54)
const result = await createBracket({
  bracket: {
    name: `${topicList.name}`,           // auto-generated title
    description: topicList.description,
    size: selectedCount,                   // 4, 8, or 16
    bracketType: 'single_elimination',     // hardcoded default
    viewingMode: 'simple',                 // hardcoded default
    showSeedNumbers: false,                // hardcoded default (no seeds)
    sessionId: selectedSessionId ?? undefined,
  },
  entrants: randomlySelectedEntrants.map((name, i) => ({
    name,
    seedPosition: i + 1,
    logoUrl: null,
  })),
})

if ('bracket' in result && result.bracket) {
  router.push(`/brackets/${result.bracket.id}`)
}
```

### Pattern 5: Random Entrant Selection (Fisher-Yates Shuffle)
**What:** When a topic has more items than the selected count, randomly pick `count` items from the full list. No shuffle utility exists in the codebase yet.
**When to use:** Quick Create, when teacher selects count < topic list length (e.g., 4 from 16 items).
**Example:**
```typescript
// Simple Fisher-Yates shuffle + slice
function pickRandom(items: string[], count: number): string[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}
```

### Anti-Patterns to Avoid
- **Reusing existing TopicPicker directly:** The existing `TopicPicker` component has search, subject grouping, and a preview/confirm pattern. Quick Create needs a flat chip grid with no preview. Build a new component rather than trying to adapt `TopicPicker` with flags.
- **Making the page a server component that conditionally renders:** The page needs client-side state for tab switching. Convert `page.tsx` to a wrapper that fetches sessions server-side and passes them to a client component (same as `brackets/[bracketId]/page.tsx` pattern).
- **Adding sessionId to the wizard flow:** The wizard (Step-by-Step) currently has no session picker -- that is assigned after creation on the detail page. Quick Create adds session inline because speed is the goal. Don't backport this to the wizard.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bracket creation with matchups | Custom database inserts | `createBracket` server action | Already handles validation, feature gates, matchup generation, byes, all bracket types |
| Tab toggle component | Custom toggle | Copy poll page's `bg-muted p-1` pattern | Proven pattern used in 10+ places across the app |
| Subject color mapping | New color system | Import `SUBJECT_COLORS` from topic-picker or duplicate the small map | 7 subjects, well-tested dark mode support |
| Session fetching | Custom API route | `prisma.classSession.findMany` in server component | Same pattern as bracket detail page |

**Key insight:** This phase is almost entirely UI composition. The backend (`createBracket`, `createBracketDAL`, validation schema, feature gates) already supports everything needed. No schema changes, no new actions, no new API routes.

## Common Pitfalls

### Pitfall 1: Page Component Must Become Hybrid Server/Client
**What goes wrong:** The current `brackets/new/page.tsx` is a simple server component that renders `<BracketForm />`. Adding tabs requires client state (`mode`). But sessions must be fetched server-side.
**Why it happens:** Next.js App Router requires server-side data fetching in server components, but tab state needs a client component.
**How to avoid:** Keep `page.tsx` as a server component that fetches sessions (same as bracket detail page), then pass sessions as props to a new client component (e.g., `BracketCreationPage`) that handles tab switching.
**Warning signs:** If you make `page.tsx` a client component, session fetching requires a separate API call or `useEffect`.

### Pitfall 2: Random Selection Must Happen Client-Side Per Click
**What goes wrong:** If random selection happens once on mount, every bracket from the same topic gets the same entrants until page refresh.
**Why it happens:** React component state initializes once.
**How to avoid:** Run the shuffle in the `handleCreate` function (not in state initialization), so each Create click produces fresh random entrants.
**Warning signs:** Creating two brackets from the same topic yields identical entrants.

### Pitfall 3: All Topic Lists Have Exactly 16 Items
**What goes wrong:** If a topic list has fewer items than the selected count, creation fails because `createBracket` validates `entrants.length === size`.
**Why it happens:** Current data has 16 items per list, but this is a data contract that could break.
**How to avoid:** When a topic has fewer items than the selected count, either disable that count option or show all available items. Recommended: disable count buttons where `count > topicList.topics.length`. All current lists have 16 items, so 4/8/16 all work, but future-proof the UI.
**Warning signs:** Zod validation error "Expected X entrants, got Y" after clicking Create.

### Pitfall 4: Session Picker Shows "No active sessions" When Teacher Has No Sessions
**What goes wrong:** Teacher clicks Quick Create but has no active class sessions, and the session dropdown is empty or confusing.
**Why it happens:** New teachers or teachers between class periods may have no active sessions.
**How to avoid:** Make session optional (it already is in the schema -- `sessionId` is optional in `createBracketSchema`). Show a helpful message like "No active sessions -- bracket will be unassigned" and still allow creation. Teacher can assign a session later from the detail page.
**Warning signs:** Create button is disabled when no session is selected, blocking the quick-create flow.

### Pitfall 5: Bracket Title Naming for Quick-Created Brackets
**What goes wrong:** Quick-created brackets need a name but there is no name input field (speed is the point). Auto-generated names could be confusing or duplicate.
**Why it happens:** `createBracketSchema` requires `name` to be at least 1 character.
**How to avoid:** Use the topic list name as the bracket title (e.g., "Planets & Celestial Bodies"). It's descriptive, unique across topics, and the teacher can rename from the detail page. If concerned about duplicates, append a count: "Planets & Celestial Bodies (2)".
**Warning signs:** Multiple brackets with identical names in the bracket list.

## Code Examples

### Complete Quick Create Flow
```typescript
// BracketQuickCreate component -- core logic
const [selectedTopic, setSelectedTopic] = useState<TopicList | null>(null)
const [selectedCount, setSelectedCount] = useState<4 | 8 | 16 | null>(null)
const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
const [isCreating, setIsCreating] = useState(false)
const [error, setError] = useState<string | null>(null)

const canCreate = selectedTopic !== null && selectedCount !== null

async function handleCreate() {
  if (!selectedTopic || !selectedCount) return
  setIsCreating(true)
  setError(null)

  // Random selection from topic list
  const entrantNames = pickRandom(selectedTopic.topics, selectedCount)
  const entrants = entrantNames.map((name, i) => ({
    name,
    seedPosition: i + 1,
    logoUrl: null,
  }))

  const result = await createBracket({
    bracket: {
      name: selectedTopic.name,
      description: selectedTopic.description,
      size: selectedCount,
      bracketType: 'single_elimination',
      viewingMode: 'simple',
      showSeedNumbers: false,
      sessionId: selectedSessionId ?? undefined,
    },
    entrants,
  })

  if ('error' in result && result.error) {
    setError(result.error)
    setIsCreating(false)
    return
  }

  if ('bracket' in result && result.bracket) {
    router.push(`/brackets/${result.bracket.id}`)
  }
}
```

### Topic Chip Grid (Flat, Color-Coded)
```typescript
// Flat grid of all 10 topic chips, no subject grouping
<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
  {CURATED_TOPICS.map((topic) => {
    const isSelected = selectedTopic?.id === topic.id
    const colorClasses = SUBJECT_COLORS[topic.subject] ?? 'bg-gray-100 text-gray-700'
    return (
      <button
        key={topic.id}
        type="button"
        onClick={() => setSelectedTopic(isSelected ? null : topic)}
        className={cn(
          'rounded-lg border-2 p-3 text-left transition-colors',
          isSelected
            ? 'border-primary ring-1 ring-primary'
            : 'border-transparent hover:border-primary/30'
        )}
      >
        <span className="text-sm font-medium">{topic.name}</span>
        <Badge variant="secondary" className={cn('mt-1', colorClasses)}>
          {topic.subject}
        </Badge>
      </button>
    )
  })}
</div>
```

### Entrant Count Picker (Pill Buttons)
```typescript
// Pill-style segmented control for 4/8/16
const COUNTS = [4, 8, 16] as const

<div className="flex gap-2">
  {COUNTS.map((count) => {
    const isDisabled = selectedTopic && count > selectedTopic.topics.length
    return (
      <button
        key={count}
        type="button"
        onClick={() => setSelectedCount(count)}
        disabled={!!isDisabled}
        className={cn(
          'min-w-[56px] rounded-full border px-4 py-2 text-sm font-medium transition-colors',
          selectedCount === count
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-input bg-background hover:bg-accent'
        )}
      >
        {count}
      </button>
    )
  })}
</div>
```

### Server Page with Session Fetching
```typescript
// src/app/(dashboard)/brackets/new/page.tsx -- restructured
import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'
import { BracketCreationPage } from '@/components/bracket/bracket-creation-page'

export default async function CreateBracketPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) redirect('/login')

  const sessions = await prisma.classSession.findMany({
    where: { teacherId: teacher.id, status: 'active' },
    select: { id: true, code: true, name: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  const serializedSessions = sessions.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    createdAt: s.createdAt.toISOString(),
  }))

  return <BracketCreationPage sessions={serializedSessions} />
}
```

## Claude's Discretion Recommendations

### 1. Subject Color-Coding Implementation
**Recommendation:** Use a colored left border on each chip (4px wide) with a subtle tinted background. This is less visually noisy than a badge inside each chip and creates clear visual grouping even in a flat grid.
```typescript
// Chip style: colored left border + subtle tint
className={cn(
  'rounded-lg border-l-4 p-3 text-left transition-all',
  SUBJECT_BORDER_COLORS[topic.subject], // e.g., 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
)}
```
Alternative: Use the existing `SUBJECT_COLORS` as a small Badge inside each chip (like TopicPicker already does). Both work; the border approach is more compact for a chip grid.

### 2. Entrant Count Picker Style
**Recommendation:** Rounded pill buttons (matching the existing bracket size selector pattern from `bracket-form.tsx` lines 460-473). The existing wizard uses `min-w-[64px] rounded-md border px-4 py-3` for size buttons -- use the same style but with `rounded-full` for a pill look since there are only 3 options. This differentiates it from the wizard's size picker.

### 3. Bracket Title Naming
**Recommendation:** Use the topic list name directly: `selectedTopic.name` (e.g., "Planets & Celestial Bodies", "U.S. Presidents"). These are descriptive and short. If teacher creates multiple brackets from the same topic, they can rename from the detail page. No need for a counter suffix -- it adds complexity for an edge case the user can handle manually.

### 4. Handling Topics with Fewer Items Than Selected Count
**Recommendation:** Disable the count option. Since all 10 current topic lists have exactly 16 items, all three counts (4, 8, 16) are valid for every topic. But future-proof with: `disabled={selectedTopic && count > selectedTopic.topics.length}`. This is simpler than adapting the count and avoids confusing UX.

### 5. Visual Refresh Scope for Step-by-Step Wizard
**Recommendation:** Minimal -- the wizard already looks good. Changes needed:
1. Add a "Back to Activities" link above the heading (matching poll creation page)
2. Update the page heading to say "Create Bracket" (already says this)
3. Ensure the tab toggle visually connects to the Card below (reduce gap)
No changes to wizard internals (steps, fields, styling). The tab toggle itself provides the "refresh" feel.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate page for quick create | Tab toggle on same page | Poll page already implements this | Users don't lose context switching modes |
| Grouped topic picker with search | Flat chip grid (for quick create) | Phase 33 decision | Fewer clicks, faster selection |
| Session assigned after creation | Inline session picker (quick create only) | Phase 33 decision | One less post-creation step |

## Open Questions

1. **Duplicate bracket names from same topic**
   - What we know: `createBracketSchema` allows duplicate names; the DB has no unique constraint on bracket name
   - What's unclear: Whether users will be confused by multiple "Planets & Celestial Bodies" brackets
   - Recommendation: Allow duplicates (simple), let teacher rename on detail page. If feedback suggests confusion, add a counter suffix later.

2. **Session required vs optional**
   - What we know: `sessionId` is optional in `createBracketSchema`; the bracket detail page allows session assignment after creation
   - What's unclear: Whether the Quick Create UX should require a session selection
   - Recommendation: Make it optional. Show "No session (assign later)" as default option. This matches the existing pattern and doesn't block teachers without active sessions.

## Sources

### Primary (HIGH confidence)
- `src/lib/bracket/curated-topics.ts` -- All 10 topic lists verified: each has exactly 16 items, 7 unique subjects
- `src/components/bracket/topic-picker.tsx` -- SUBJECT_COLORS map with 7 subjects, dark mode support
- `src/app/(dashboard)/polls/new/page.tsx` -- Tab toggle pattern: Quick Create / Step-by-Step with Zap/List icons
- `src/components/bracket/bracket-form.tsx` -- Full 3-step wizard (1009 lines), all state management, submit flow
- `src/actions/bracket.ts` -- `createBracket` action with Zod validation, feature gates, DAL call
- `src/lib/utils/validation.ts` -- `createBracketSchema` includes optional `sessionId`, `viewingMode`, `showSeedNumbers`
- `src/lib/dal/bracket.ts` -- `createBracketDAL` handles matchup generation, byes, transaction
- `src/app/(dashboard)/brackets/[bracketId]/page.tsx` -- Session fetch pattern (server component + prisma query)
- `src/components/bracket/bracket-detail.tsx` -- Session assignment dropdown UI pattern
- `src/lib/bracket/types.ts` -- `BracketType`, `BracketStatus`, `BracketData` interfaces

### Secondary (MEDIUM confidence)
- Poll creation page as reference implementation for tab toggle UX pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already in use, no new dependencies
- Architecture: HIGH -- Existing patterns (tab toggle, session fetch, createBracket action) are directly reusable
- Pitfalls: HIGH -- All potential issues identified through codebase analysis of existing validation and data constraints

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable -- no external dependencies or fast-moving APIs)
