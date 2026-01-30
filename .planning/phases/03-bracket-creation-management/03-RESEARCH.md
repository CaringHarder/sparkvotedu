# Phase 3: Bracket Creation & Management - Research

**Researched:** 2026-01-29
**Domain:** Tournament bracket data modeling, SVG visualization, entrant management (manual/CSV/curated), bracket lifecycle
**Confidence:** HIGH (codebase patterns verified from source, library recommendations verified from npm/GitHub, data model derived from established patterns)

## Summary

Phase 3 introduces the bracket domain into SparkVotEDU: a Prisma data model for brackets, matchups, and entrants; a bracket engine that generates single-elimination tournament structures; three methods for populating entrants (manual entry, CSV upload, curated topic lists); a visual SVG tournament diagram rendered with custom React components; and bracket lifecycle management (draft/active/completed with edit/delete).

The standard approach is to build a **custom SVG bracket renderer** rather than adopting an existing library. The most popular React bracket library (`@g-loot/react-tournament-brackets`) has not been updated in 2+ years and depends on `styled-components`, creating peer dependency conflicts with React 19.2.3 and the project's Tailwind-first styling approach. A custom SVG approach (~200-300 lines) gives full control over theming, accessibility, and future bracket types (double-elimination, round-robin in Phase 7).

For CSV parsing, use **PapaParse** (5.5.3) -- the browser-first CSV parser with 6M+ weekly npm downloads, zero dependencies, and TypeScript types via `@types/papaparse`. For entrant reordering, use **native HTML5 drag-and-drop** with `draggable` attribute and React state handlers -- no external DnD library needed for a simple vertical list of 4-16 items. For the bracket engine (seed placement, matchup generation, round calculation), implement a **pure TypeScript module** with deterministic seeding logic.

**Primary recommendation:** Build custom bracket rendering, use PapaParse for CSV, native drag for reorder, and a self-contained bracket engine module that generates matchup structures from an entrant list.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.3.0 | Database models for Bracket, BracketEntrant, Matchup | Already in stack; schema migration for new models |
| PapaParse | 5.5.3 | CSV file parsing in browser | 6M+ weekly downloads, zero deps, browser-first, RFC 4180 compliant |
| @types/papaparse | latest | TypeScript types for PapaParse | Actively maintained (updated Dec 2025) |
| Zod | 4.3.6 | Validation for bracket creation, entrant input, CSV data | Already in stack; use for server action input validation |
| React SVG (built-in) | - | Custom tournament bracket rendering | No library needed; React can render `<svg>` elements natively |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.563.0 | Icons for bracket UI (Trophy, Trash, Upload, GripVertical) | Already in stack; use for all iconography |
| nanoid | 5.1.6 | Generating unique IDs for client-side entrant management | Already in stack; use for temporary entrant IDs before save |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom SVG bracket | @g-loot/react-tournament-brackets | Unmaintained (2+ years), uses styled-components (conflicts with Tailwind), React 18 peer dep; custom is ~300 lines and fully controlled |
| Custom SVG bracket | Bracketry | Vanilla JS (not React), manual DOM integration required, only 49kb but adds impedance mismatch |
| PapaParse | csv-parse (node) | csv-parse is Node.js-only; PapaParse works in browser AND server, better for client-side file upload UX |
| Native HTML5 drag | @dnd-kit/core 6.3.1 | dnd-kit is powerful but overkill for reordering 4-16 items in a simple list; adds ~45kb; react 19 compat uncertain |
| Native HTML5 drag | @dnd-kit/react 0.2.1 | Pre-release (0.x), known React 19 "use client" issues (#1654); not stable enough for production |
| Custom bracket engine | brackets-manager 1.8.2 | Brings its own opinionated storage interface, overkill for single-elimination-only in Phase 3; worth revisiting for Phase 7 |

**Installation:**
```bash
npm install papaparse
npm install --save-dev @types/papaparse
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    bracket/
      engine.ts              # Pure functions: generateBracket, seedEntrants, calculateRounds
      types.ts               # TypeScript types for bracket domain
      curated-topics.ts      # Curated topic lists for auto-generation
      csv-parser.ts          # PapaParse wrapper with validation
    dal/
      bracket.ts             # Bracket DAL (CRUD, ownership checks)
    utils/
      validation.ts          # Extended with bracket Zod schemas
  actions/
    bracket.ts               # Server actions for bracket operations
  components/
    bracket/
      bracket-diagram.tsx    # SVG tournament bracket renderer (client component)
      bracket-card.tsx       # Bracket summary card for dashboard
      entrant-list.tsx       # Draggable/editable entrant list (client component)
      csv-upload.tsx         # CSV file upload with preview (client component)
      topic-picker.tsx       # Curated topic list selector (client component)
      bracket-form.tsx       # Bracket creation wizard (client component)
      bracket-status.tsx     # Status badge + lifecycle controls
  app/
    (dashboard)/
      brackets/
        page.tsx             # Bracket list page (server component)
        new/
          page.tsx           # Bracket creation wizard (server component shell)
        [bracketId]/
          page.tsx           # Bracket detail page (server component)
          edit/
            page.tsx         # Bracket edit page (server component shell)
```

### Pattern 1: Server Component + Client Component Split
**What:** Server Components fetch data and pass it as props to Client Components that handle interactivity.
**When to use:** Every bracket page. SC fetches bracket data from DAL, CC renders interactive bracket diagram and forms.
**Example:**
```typescript
// app/(dashboard)/brackets/[bracketId]/page.tsx (Server Component)
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getBracketWithMatchups } from '@/lib/dal/bracket'
import { BracketDetail } from '@/components/bracket/bracket-detail'
import { redirect } from 'next/navigation'

export default async function BracketPage({ params }: { params: { bracketId: string } }) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) redirect('/login')

  const bracket = await getBracketWithMatchups(params.bracketId, teacher.id)
  if (!bracket) redirect('/brackets')

  return <BracketDetail bracket={bracket} />
}
```

### Pattern 2: DAL with Ownership Authorization
**What:** Every DAL function that accesses a bracket verifies `teacherId` ownership, matching the existing `class-session.ts` pattern.
**When to use:** All bracket DAL operations.
**Example:**
```typescript
// lib/dal/bracket.ts
export async function getBracketWithMatchups(bracketId: string, teacherId: string) {
  return prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
    include: {
      entrants: { orderBy: { seedPosition: 'asc' } },
      matchups: {
        include: { entrant1: true, entrant2: true, winner: true },
        orderBy: [{ round: 'asc' }, { position: 'asc' }],
      },
    },
  })
}
```

### Pattern 3: Server Action with Auth + Validation
**What:** Server actions authenticate with `getAuthenticatedTeacher()`, validate input with Zod, then call DAL. Matches existing `actions/class-session.ts` pattern.
**When to use:** All bracket mutations (create, update status, edit entrants, delete).
**Example:**
```typescript
// actions/bracket.ts
'use server'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { createBracketSchema } from '@/lib/utils/validation'
import { createBracketDAL } from '@/lib/dal/bracket'

export async function createBracket(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) return { error: 'Not authenticated' }

  const parsed = createBracketSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid bracket data' }

  try {
    const bracket = await createBracketDAL(teacher.id, parsed.data)
    return { bracket: { id: bracket.id, name: bracket.name } }
  } catch {
    return { error: 'Failed to create bracket' }
  }
}
```

### Pattern 4: Pure Bracket Engine Functions
**What:** Bracket logic (seed placement, matchup generation, round calculation) is implemented as pure functions with no database or React dependencies. This makes them testable with Vitest.
**When to use:** Generating bracket structure from an entrant list.
**Example:**
```typescript
// lib/bracket/engine.ts
export function calculateRounds(entrantCount: number): number {
  return Math.log2(entrantCount)
}

export function generateMatchups(entrantCount: number): MatchupSeed[] {
  const rounds = calculateRounds(entrantCount)
  const matchups: MatchupSeed[] = []
  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = entrantCount / Math.pow(2, round)
    for (let position = 1; position <= matchesInRound; position++) {
      matchups.push({
        round,
        position,
        // First round: pair by standard tournament seeding (1v16, 2v15, etc.)
        entrant1Seed: round === 1 ? getStandardSeed(position, entrantCount, 1) : null,
        entrant2Seed: round === 1 ? getStandardSeed(position, entrantCount, 2) : null,
      })
    }
  }
  return matchups
}
```

### Pattern 5: Client-Side CSV Parsing with Server Validation
**What:** Parse CSV in browser using PapaParse for immediate preview, then validate and save on server.
**When to use:** CSV entrant upload flow.
**Example:**
```typescript
// components/bracket/csv-upload.tsx
'use client'
import Papa from 'papaparse'

function handleFileUpload(file: File) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete(results) {
      // Extract entrant names from first column
      const entrants = results.data
        .map((row: Record<string, string>) => row['name'] || row['Name'] || Object.values(row)[0])
        .filter(Boolean)
      setEntrants(entrants)
    },
    error(err) {
      setError(`CSV parse error: ${err.message}`)
    },
  })
}
```

### Anti-Patterns to Avoid
- **Storing bracket structure as JSON blob:** Use normalized Prisma models (Bracket -> BracketEntrant, Bracket -> Matchup) for queryability and integrity. JSON blobs prevent efficient queries and relationship enforcement.
- **Generating matchups client-side only:** Generate matchup structure on the server (in the DAL/action) and persist immediately. Client-side-only generation risks data loss and inconsistency.
- **Coupling visualization to data model:** Keep the SVG rendering component dumb -- it receives typed props (rounds, matchups, entrants) and renders. The data model and engine are separate modules.
- **Putting bracket engine logic in server actions:** Server actions should be thin (auth + validate + call DAL). Bracket generation logic belongs in `lib/bracket/engine.ts` so it can be unit tested without mocking HTTP.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom string splitting by comma/newline | PapaParse | Handles quoted fields, encoding, edge cases, malformed input; RFC 4180 compliant |
| Bracket validation schemas | Custom if/else validation | Zod schemas | Already in stack; provides typed output, error messages, composable validation |
| UUID generation | Math.random() IDs | Prisma `@default(uuid())` for DB, `nanoid` for client-side temp IDs | Already in stack; cryptographically safe |
| File upload UI | Custom file input styling | HTML `<input type="file">` + hidden input pattern | Standard accessible pattern, no library needed |

**Key insight:** The bracket *engine* (seed placement, matchup generation) is genuinely custom domain logic that should be hand-built. But CSV parsing, validation, and ID generation are solved problems -- use the existing tools.

## Common Pitfalls

### Pitfall 1: Non-Power-of-Two Entrant Counts in "Phase 3"
**What goes wrong:** Teachers enter 5 or 7 entrants and the bracket engine crashes or produces invalid matchups.
**Why it happens:** Single-elimination requires exactly 4, 8, or 16 entrants per the requirements (BRKT-01). Non-power-of-two is a Phase 7 feature (BRKT-06 Pro Plus).
**How to avoid:** Enforce entrant count validation strictly in Zod schema: `z.union([z.literal(4), z.literal(8), z.literal(16)])`. Show clear error messages. Don't build bye logic yet.
**Warning signs:** Bracket engine code with `if (count % 2 !== 0)` or bye-handling logic.

### Pitfall 2: Editing Active Brackets
**What goes wrong:** Teacher modifies entrants in an active bracket, corrupting in-progress matchups and votes.
**Why it happens:** Missing status checks before allowing edits.
**How to avoid:** Server-side enforcement: `if (bracket.status !== 'draft') return { error: 'Cannot edit active bracket' }`. UI should disable edit controls for non-draft brackets.
**Warning signs:** Edit UI that doesn't check bracket status; DAL functions that update entrants without status guard.

### Pitfall 3: Orphaned Matchups After Entrant Changes
**What goes wrong:** Teacher adds/removes entrants in draft, but matchups reference stale entrant IDs or have wrong count.
**Why it happens:** Matchups generated on creation but not regenerated when entrants change.
**How to avoid:** Regenerate all matchups whenever entrants change (delete all existing matchups, re-run engine). This is safe because draft brackets have no votes yet.
**Warning signs:** Code that tries to surgically update individual matchups instead of regenerating.

### Pitfall 4: SVG Bracket Rendering Performance
**What goes wrong:** Bracket renders with jank or layout shifts, especially on mobile.
**Why it happens:** Complex SVG with many elements and no viewport management.
**How to avoid:** Use fixed dimensions per round/match cell. Wrap in a scrollable container for mobile. Pre-calculate all positions. Avoid dynamic layout recalculation.
**Warning signs:** `useEffect` with DOM measurement, `getBoundingClientRect` calls, layout thrashing.

### Pitfall 5: CSV Encoding Issues
**What goes wrong:** Uploaded CSV has garbled characters (accents, special chars).
**Why it happens:** CSV saved in non-UTF-8 encoding (common from Excel on Windows).
**How to avoid:** PapaParse handles encoding detection automatically. Add a preview step so teachers can verify parsed entrants before saving.
**Warning signs:** Direct `FileReader.readAsText()` without PapaParse; no preview step.

### Pitfall 6: Bracket-Session Ownership Mismatch
**What goes wrong:** A bracket is created without association to a class session, or associated to the wrong session.
**Why it happens:** Unclear data model for bracket ownership.
**How to avoid:** Brackets belong to a Teacher (via `teacherId`), and optionally to a ClassSession (via `sessionId`). A bracket can exist in draft without a session, then be assigned to a session when activated. Enforce `teacherId` match on all DAL operations.
**Warning signs:** Bracket model without `teacherId` FK; relying solely on session ownership for authorization.

## Code Examples

Verified patterns from official sources and existing codebase:

### Prisma Schema for Brackets
```prisma
// Add to prisma/schema.prisma

model Bracket {
  id          String   @id @default(uuid())
  name        String
  description String?
  bracketType String   @default("single_elimination") @map("bracket_type")
  size        Int      // 4, 8, or 16
  status      String   @default("draft") // draft, active, completed
  teacherId   String   @map("teacher_id")
  teacher     Teacher  @relation(fields: [teacherId], references: [id])
  sessionId   String?  @map("session_id")
  session     ClassSession? @relation(fields: [sessionId], references: [id])
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  entrants    BracketEntrant[]
  matchups    Matchup[]

  @@index([teacherId])
  @@index([sessionId])
  @@index([status])
  @@map("brackets")
}

model BracketEntrant {
  id           String   @id @default(uuid())
  name         String
  seedPosition Int      @map("seed_position")
  bracketId    String   @map("bracket_id")
  bracket      Bracket  @relation(fields: [bracketId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now()) @map("created_at")

  matchupsAsEntrant1 Matchup[] @relation("entrant1")
  matchupsAsEntrant2 Matchup[] @relation("entrant2")
  matchupsAsWinner   Matchup[] @relation("winner")

  @@unique([bracketId, seedPosition])
  @@index([bracketId])
  @@map("bracket_entrants")
}

model Matchup {
  id         String          @id @default(uuid())
  round      Int             // 1 = first round, 2 = quarterfinal, etc.
  position   Int             // Position within the round (1-indexed)
  bracketId  String          @map("bracket_id")
  bracket    Bracket         @relation(fields: [bracketId], references: [id], onDelete: Cascade)
  entrant1Id String?         @map("entrant1_id")
  entrant1   BracketEntrant? @relation("entrant1", fields: [entrant1Id], references: [id])
  entrant2Id String?         @map("entrant2_id")
  entrant2   BracketEntrant? @relation("entrant2", fields: [entrant2Id], references: [id])
  winnerId   String?         @map("winner_id")
  winner     BracketEntrant? @relation("winner", fields: [winnerId], references: [id])
  nextMatchupId String?      @map("next_matchup_id")
  nextMatchup   Matchup?     @relation("advancement", fields: [nextMatchupId], references: [id])
  previousMatchups Matchup[] @relation("advancement")
  createdAt  DateTime        @default(now()) @map("created_at")

  @@unique([bracketId, round, position])
  @@index([bracketId])
  @@map("matchups")
}
```

### PapaParse CSV Upload Pattern
```typescript
// Source: PapaParse official docs (papaparse.com)
import Papa from 'papaparse'

interface ParsedEntrant {
  name: string
  seed?: number
}

export function parseEntrantCSV(file: File): Promise<ParsedEntrant[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete(results) {
        const entrants: ParsedEntrant[] = results.data
          .map((row, index) => ({
            name: (row['name'] || row['entrant'] || row['team'] || Object.values(row)[0] || '').trim(),
            seed: index + 1,
          }))
          .filter((e) => e.name.length > 0)
        resolve(entrants)
      },
      error(err) {
        reject(new Error(`CSV parse error: ${err.message}`))
      },
    })
  })
}
```

### Custom SVG Bracket Rendering Approach
```typescript
// Source: Standard SVG layout pattern for tournament brackets
// Each matchup is a fixed-size cell, positioned by round and position

interface MatchupDisplay {
  id: string
  round: number
  position: number
  entrant1Name: string | null
  entrant2Name: string | null
  winnerName: string | null
}

const MATCH_WIDTH = 200
const MATCH_HEIGHT = 80
const ROUND_GAP = 60
const MATCH_GAP = 20

function getMatchPosition(round: number, position: number, totalRounds: number) {
  const x = (round - 1) * (MATCH_WIDTH + ROUND_GAP)
  // Each successive round doubles the vertical spacing
  const matchesInRound = Math.pow(2, totalRounds - round)
  const totalHeight = matchesInRound * (MATCH_HEIGHT + MATCH_GAP) - MATCH_GAP
  const spacing = totalHeight / matchesInRound
  const y = (position - 1) * spacing + spacing / 2 - MATCH_HEIGHT / 2
  return { x, y }
}

// Render as React SVG elements - no library needed
function BracketDiagram({ matchups, totalRounds }: BracketDiagramProps) {
  return (
    <svg width={totalRounds * (MATCH_WIDTH + ROUND_GAP)} height={calculatedHeight}>
      {matchups.map((m) => {
        const { x, y } = getMatchPosition(m.round, m.position, totalRounds)
        return (
          <g key={m.id} transform={`translate(${x}, ${y})`}>
            {/* Match box */}
            <rect width={MATCH_WIDTH} height={MATCH_HEIGHT} rx={4} className="fill-card stroke-border" />
            {/* Entrant names */}
            <text x={10} y={25} className="fill-foreground text-sm">{m.entrant1Name ?? 'TBD'}</text>
            <line x1={0} y1={MATCH_HEIGHT / 2} x2={MATCH_WIDTH} y2={MATCH_HEIGHT / 2} className="stroke-border" />
            <text x={10} y={60} className="fill-foreground text-sm">{m.entrant2Name ?? 'TBD'}</text>
          </g>
        )
      })}
      {/* Connector lines between rounds */}
      {renderConnectors(matchups, totalRounds)}
    </svg>
  )
}
```

### Native HTML5 Drag Reorder Pattern
```typescript
// Source: Standard HTML5 Drag API + React state management
'use client'
import { useState, useCallback } from 'react'

interface EntrantItem {
  id: string
  name: string
  seedPosition: number
}

function EntrantList({ entrants, onReorder }: { entrants: EntrantItem[], onReorder: (items: EntrantItem[]) => void }) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    const reordered = [...entrants]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, moved)
    // Update seed positions
    const withSeeds = reordered.map((item, i) => ({ ...item, seedPosition: i + 1 }))
    onReorder(withSeeds)
    setDragIndex(index)
  }, [dragIndex, entrants, onReorder])

  return (
    <ul>
      {entrants.map((entrant, index) => (
        <li
          key={entrant.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={() => setDragIndex(null)}
          className={`flex items-center gap-2 p-2 border rounded ${dragIndex === index ? 'opacity-50' : ''}`}
        >
          <span className="text-muted-foreground cursor-grab">&#x2630;</span>
          <span className="font-mono text-xs w-6">{entrant.seedPosition}</span>
          <span>{entrant.name}</span>
        </li>
      ))}
    </ul>
  )
}
```

### Zod Validation Schemas
```typescript
// Source: Existing project validation patterns (src/lib/utils/validation.ts)
import { z } from 'zod'

export const bracketSizeSchema = z.union([z.literal(4), z.literal(8), z.literal(16)])

export const createBracketSchema = z.object({
  name: z.string().min(1, 'Bracket name is required').max(100),
  description: z.string().max(500).optional(),
  size: bracketSizeSchema,
  sessionId: z.string().uuid().optional(),
})

export const entrantSchema = z.object({
  name: z.string().min(1, 'Entrant name is required').max(100),
  seedPosition: z.number().int().positive(),
})

export const updateEntrantsSchema = z.object({
  bracketId: z.string().uuid(),
  entrants: z.array(entrantSchema).min(4).max(16),
})

export const updateBracketStatusSchema = z.object({
  bracketId: z.string().uuid(),
  status: z.enum(['draft', 'active', 'completed']),
})
```

### Curated Topic List Structure
```typescript
// Source: Domain-specific design for educational topic brackets
export interface TopicList {
  id: string
  name: string
  subject: string // e.g., 'Science', 'History', 'Literature', 'Fun'
  description: string
  topics: string[] // Must have at least 16 entries to support all bracket sizes
}

export const CURATED_TOPICS: TopicList[] = [
  {
    id: 'planets',
    name: 'Planets of the Solar System',
    subject: 'Science',
    description: 'Debate which planet reigns supreme',
    topics: ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune',
             'Pluto', 'Ceres', 'Eris', 'Haumea', 'Makemake', 'Moon', 'Titan', 'Europa'],
  },
  {
    id: 'presidents',
    name: 'U.S. Presidents',
    subject: 'History',
    description: 'Which president had the biggest impact?',
    topics: ['Washington', 'Jefferson', 'Lincoln', 'T. Roosevelt', 'FDR', 'JFK',
             'Reagan', 'Obama', 'Adams', 'Jackson', 'Grant', 'Wilson',
             'Truman', 'Eisenhower', 'LBJ', 'Clinton'],
  },
  // ... more curated lists
]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| styled-components for component theming | Tailwind CSS utility classes + CSS custom properties | 2023-2024 | @g-loot bracket lib uses styled-components (conflict); custom SVG uses Tailwind classes natively |
| react-dnd for drag-and-drop | @dnd-kit or native HTML5 drag API | 2023 | react-dnd has React 19 issues; native drag is simpler for vertical list reorder |
| JSON blob storage for bracket state | Normalized relational models (Bracket -> Entrant, Matchup) | Established pattern | Enables efficient queries, referential integrity, future real-time updates |
| Zod v3 string validators (`z.string().email()`) | Zod v4 top-level validators (`z.email()`) but old API still works | 2025 | Project uses Zod 4.3.6; can use either syntax, prefer `z.string().min()` for non-format validators |

**Deprecated/outdated:**
- `@g-loot/react-tournament-brackets`: Last published 2+ years ago, styled-components dependency, no React 19 support. Do not use.
- `react-dnd`: Not compatible with React 19 (open issue #3655). Do not use.
- `brackets-manager`: Actively maintained but brings an opinionated storage interface and is overkill for single-elimination-only. Revisit for Phase 7 if needed.

## Open Questions

Things that could not be fully resolved:

1. **Bracket-to-Session association timing**
   - What we know: A bracket belongs to a teacher (`teacherId`). It can optionally belong to a ClassSession (`sessionId`).
   - What's unclear: Should a bracket be required to have a session when activated, or can it exist independently? The roadmap says Phase 3 depends on Phase 1 (not Phase 2), suggesting brackets could be created without sessions.
   - Recommendation: Make `sessionId` optional. Brackets can be created in draft without a session. Teachers assign a bracket to a session when they activate it (or leave it unassigned for practice/testing). This keeps Phase 3 independent of Phase 2 as designed.

2. **Curated topic list scope for v1**
   - What we know: MGMT-04 requires "auto-generate entrants from curated topic lists." The existing site likely has specific lists.
   - What's unclear: How many topic lists to ship in v1, and whether they should be hard-coded or database-driven.
   - Recommendation: Start with 8-12 hard-coded topic lists in a TypeScript module (`curated-topics.ts`). Categories: Science, History, Literature, Math, Geography, Pop Culture, Sports, Fun/Debate. Each list should have at least 16 entries. Move to database-driven lists in a future phase if teachers want custom lists.

3. **Dashboard bracket display alongside sessions**
   - What we know: MGMT-08 requires "Teacher dashboard shows all brackets and polls with status." The current dashboard shows active sessions.
   - What's unclear: Whether brackets should replace or coexist with the session view on the main dashboard.
   - Recommendation: Add a "Brackets" section to the dashboard alongside "Active Sessions." Add a "Brackets" nav item to the sidebar. The `/brackets` page becomes the main bracket management hub, similar to `/sessions`.

4. **Move-up/move-down buttons vs drag-only for reorder**
   - What we know: Drag-and-drop reorder works well on desktop but can be awkward on mobile/tablet touch devices.
   - What's unclear: Whether to also add move-up/move-down arrow buttons as an alternative.
   - Recommendation: Implement both. Drag handles for desktop, up/down arrow buttons for accessibility and mobile. The arrow buttons are trivial to add and greatly improve the experience on touch devices.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `prisma/schema.prisma`, `src/lib/dal/class-session.ts`, `src/actions/class-session.ts`, `src/lib/gates/features.ts`, `src/lib/gates/tiers.ts`, `src/components/teacher/session-creator.tsx` -- all patterns verified from source code
- [PapaParse official site](https://www.papaparse.com/) -- API, features, browser-first design
- [PapaParse npm](https://www.npmjs.com/package/papaparse) -- v5.5.3, 6M+ weekly downloads, May 2025 update
- [dnd-kit official site](https://dndkit.com/) -- API, sortable concepts, accessibility
- [dnd-kit GitHub](https://github.com/clauderic/dnd-kit) -- @dnd-kit/core v6.3.1, @dnd-kit/react v0.2.1 (pre-release)

### Secondary (MEDIUM confidence)
- [@g-loot/react-tournament-brackets GitHub](https://github.com/g-loot/react-tournament-brackets) -- data format, match/participant types verified from README
- [brackets-manager npm](https://www.npmjs.com/package/brackets-manager) -- v1.8.2, storage interface pattern
- [brackets-manager docs](https://drarig29.github.io/brackets-docs/getting-started/) -- API, data model, stage creation
- [Bracketry](https://bracketry.app/) -- 49kb vanilla JS bracket renderer, MIT licensed

### Tertiary (LOW confidence)
- [WebSearch: single elimination bracket database schema](https://www.sqlteam.com/forums/topic.asp?TOPIC_ID=83900) -- relational schema patterns with self-referential `next_match_id`
- [Moore English: Using Brackets for Student Engagement](https://moore-english.com/using-brackets-for-student-engagement/) -- curated topic list inspiration for education
- [Open Bracket Format GitHub](https://github.com/VestboyMyst/openbracketformat) -- JSON schema for tournament data (reference only)
- [HTML5 native drag tutorials](https://medium.com/nerd-for-tech/simple-drag-and-drop-in-react-without-an-external-library-ebf1c1b809e) -- pattern for draggable list without library

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - PapaParse is clearly the right choice (6M downloads, zero deps, browser-first); custom SVG is the right call (no maintained React bracket lib exists for React 19 + Tailwind); codebase patterns verified from source
- Architecture: HIGH - Follows established patterns from Phase 1 and 2 (SC/CC split, DAL ownership checks, server action auth pattern, Zod validation); Prisma schema design follows relational tournament bracket best practices
- Pitfalls: HIGH - Based on common tournament bracket implementation issues and specific constraints (no non-power-of-two in Phase 3, draft-only editing, entrant-matchup regeneration)

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (stable domain, no rapidly changing dependencies)
