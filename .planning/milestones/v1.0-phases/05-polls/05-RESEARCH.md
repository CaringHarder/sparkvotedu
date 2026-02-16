# Phase 5: Polls - Research

**Researched:** 2026-01-31
**Domain:** Poll creation (simple + ranked), real-time poll results, Borda count aggregation, image uploads for poll options, chart/visualization, poll lifecycle management, unified brackets/polls navigation
**Confidence:** MEDIUM (composite -- HIGH for schema/DAL/actions patterns from codebase analysis, HIGH for Borda count algorithm, MEDIUM for chart visualization approach, MEDIUM for image upload via Supabase Storage signed URLs)

## Summary

This research covers everything needed to plan Phase 5: building the poll system alongside the existing bracket system. Polls are a new top-level entity (like Brackets) owned by teachers, supporting two types: simple (pick one) and ranked (order preferences). The architecture follows the exact patterns already established in Phases 1-4: Prisma models with DAL functions, server actions with Zod validation, Supabase Realtime Broadcast for live updates, and the transport fallback for school networks.

The key architectural insight is that **polls are structurally simpler than brackets** -- no tournament tree, no matchups, no round advancement. A Poll has Options, and each PollVote records either a single choice (simple) or a set of rankings (ranked). The complexity lives in three places: (1) the ranked voting aggregation (Borda count), (2) the real-time animated results visualization, and (3) the image upload flow for poll options. The existing codebase provides strong patterns for real-time broadcast (from Phase 4), feature gating by tier (from Phase 1), and wizard-style creation forms (from Phase 3).

This phase also requires a significant navigation refactor: the current "Brackets" sidebar entry becomes "Brackets/Polls" with unified status tabs showing both entity types with distinguishing badges. The student activity grid already supports `type: 'bracket' | 'poll'` and routes to `/session/{id}/poll/{pollId}`, so the student-side integration point is already scaffolded.

**Primary recommendation:** Create Poll/PollOption/PollVote Prisma models following the Bracket model pattern. Use the existing broadcast infrastructure (REST API) for real-time vote updates. Build charts with Motion (already installed) for custom animated SVG bars/donuts rather than adding a chart library -- this gives full control over the "bouncy/playful" animation style specified in CONTEXT.md. Use Supabase Storage signed upload URLs for option images (bypasses Next.js 1MB server action body limit). Implement Borda count as a pure function (no library needed -- it is a simple points-sum algorithm).

## Standard Stack

The established libraries/tools for this phase:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.3.x | Poll, PollOption, PollVote models | Already installed. Follows existing schema patterns (Bracket model). `@@unique` constraints for vote deduplication. |
| @supabase/supabase-js | 2.93.x | Realtime Broadcast for poll vote updates, Storage for option images | Already installed. Phase 4 established broadcast patterns. Storage API for signed upload URLs. |
| motion | 12.x | Animated bar charts, donut charts, leaderboard transitions, reveal animations | Already installed. Provides spring physics for "bouncy" bars, `AnimatePresence` for enter/exit, `motion.div`/`motion.rect` for SVG chart elements. |
| Zod | 4.x | Poll creation/voting validation schemas | Already installed. Follows existing validation pattern in `src/lib/utils/validation.ts`. |
| React 19 `useOptimistic` | Built-in | Instant vote feedback for students | Already in project. Same pattern as bracket voting (Phase 4). |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| canvas-confetti | 1.x | Winner reveal animation when poll closes | Already installed from Phase 4. Reuse for poll result reveal. |
| lucide-react | 0.563.x | Icons for poll type badges, chart toggle, status indicators | Already installed. Use `BarChart3`, `PieChart`, `ListOrdered`, `Vote` icons. |
| nanoid | 5.x | Client-side temp IDs for poll option forms | Already installed. Used in bracket form for entrant temp IDs. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom Motion SVG charts | Recharts (charting library) | Recharts provides standard charts quickly but has limited custom animation -- the "bouncy/playful" style from CONTEXT.md requires spring physics that Recharts doesn't natively support. Motion is already installed and gives full animation control. For pie/donut specifically, SVG arc paths with `motion.path` are straightforward. |
| Custom Borda count function | `borda-count` npm package | The npm package is designed for CSV-based CLI usage, not in-app computation. Borda count is a simple formula (N-1 points for rank 1, N-2 for rank 2, ..., 0 for rank N). A 10-line pure function is simpler and more maintainable than an external dependency. |
| Supabase Storage signed URLs | Direct server action upload (increase bodySizeLimit) | The signed URL approach is more robust: (1) avoids Next.js body size limits entirely, (2) uploads directly from client to Supabase CDN (faster), (3) server action only generates the URL (lightweight). The bodySizeLimit config has known issues in production (see Next.js Discussion #77505). |
| browser-image-compression library | Canvas API directly | The Canvas API approach (`createImageBitmap` + `canvas.toBlob`) is ~15 lines of code and covers our needs (resize to max dimension + JPEG quality). A library adds ~3.5KB for functionality we don't fully need (web workers, progressive compression). |

**Installation:**

```bash
# No new packages needed -- all libraries already installed
# Phase 5 uses: prisma, @supabase/supabase-js, motion, zod, canvas-confetti, lucide-react, nanoid
```

## Architecture Patterns

### Recommended Project Structure (Phase 5 Additions)

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── activities/                     # NEW: Unified brackets/polls list page
│   │   │   └── page.tsx                    # Replaces /brackets page; shows both types
│   │   ├── brackets/                       # EXISTING: Keep bracket routes intact
│   │   │   └── ...
│   │   └── polls/
│   │       ├── new/
│   │       │   └── page.tsx                # NEW: Poll creation (quick-create + wizard)
│   │       ├── [pollId]/
│   │       │   ├── page.tsx                # NEW: Poll detail/edit (teacher view)
│   │       │   └── live/
│   │       │       └── page.tsx            # NEW: Live results dashboard (teacher)
│   │       └── templates/
│   │           └── page.tsx                # NEW: Curated poll template browser
│   ├── (student)/
│   │   └── session/
│   │       └── [sessionId]/
│   │           └── poll/
│   │               └── [pollId]/
│   │                   └── page.tsx        # NEW: Student poll voting view
│   └── api/
│       └── polls/
│           ├── [pollId]/
│           │   ├── state/route.ts          # NEW: GET poll state (polling fallback)
│           │   └── upload-url/route.ts     # NEW: POST signed upload URL for images
│           └── route.ts                    # NEW: GET polls list for activities API
├── actions/
│   └── poll.ts                             # NEW: createPoll, updatePoll, deletePoll, castPollVote, etc.
├── lib/
│   ├── dal/
│   │   └── poll.ts                         # NEW: Poll DAL (CRUD, vote, aggregate)
│   ├── poll/
│   │   ├── borda.ts                        # NEW: Borda count aggregation (pure function)
│   │   ├── templates.ts                    # NEW: Curated poll template data
│   │   └── types.ts                        # NEW: Poll, PollOption, PollVote types
│   ├── realtime/
│   │   └── broadcast.ts                    # EXTEND: Add broadcastPollVoteUpdate, broadcastPollUpdate
│   └── utils/
│       ├── validation.ts                   # EXTEND: Add poll schemas
│       └── image-compress.ts               # NEW: Client-side image resize/compress util
├── hooks/
│   ├── use-realtime-poll.ts                # NEW: Subscribe to poll vote updates
│   └── use-poll-vote.ts                    # NEW: Optimistic poll vote hook
├── components/
│   ├── poll/
│   │   ├── poll-form.tsx                   # NEW: Quick-create inline form
│   │   ├── poll-wizard.tsx                 # NEW: Multi-step wizard for complex polls
│   │   ├── poll-card.tsx                   # NEW: Poll card for activities list
│   │   ├── poll-detail.tsx                 # NEW: Poll detail/edit view
│   │   ├── poll-status.tsx                 # NEW: Status badge component
│   │   ├── option-list.tsx                 # NEW: Editable option list with image upload
│   │   ├── option-image-upload.tsx         # NEW: Image upload for single option
│   │   ├── bar-chart.tsx                   # NEW: Animated horizontal bar chart (Motion)
│   │   ├── donut-chart.tsx                 # NEW: Animated donut/pie chart (Motion SVG)
│   │   ├── ranked-leaderboard.tsx          # NEW: Borda count leaderboard
│   │   ├── poll-results.tsx                # NEW: Results container (toggles chart type)
│   │   ├── poll-reveal.tsx                 # NEW: Winner reveal animation
│   │   └── presentation-mode.tsx           # NEW: Full-screen projector view
│   ├── student/
│   │   ├── simple-poll-vote.tsx            # NEW: Tappable cards for simple polls
│   │   ├── ranked-poll-vote.tsx            # NEW: Tap-to-rank interaction
│   │   └── activity-card.tsx               # EXTEND: Already supports type='poll'
│   └── dashboard/
│       └── sidebar-nav.tsx                 # MODIFY: "Brackets" -> "Activities" with sub-items
└── types/
    └── poll.ts                             # NEW: Poll-related TypeScript types
```

### Pattern 1: Poll Prisma Models

**What:** Three new models -- Poll, PollOption, PollVote -- following the same conventions as the existing Bracket/BracketEntrant/Vote models.
**When to use:** All poll operations.

```prisma
// prisma/schema.prisma -- new Poll models

model Poll {
  id              String        @id @default(uuid())
  question        String
  description     String?
  pollType        String        @default("simple") @map("poll_type") // "simple" | "ranked"
  status          String        @default("draft") // "draft" | "active" | "closed" | "archived"
  allowVoteChange Boolean       @default(true) @map("allow_vote_change")
  showLiveResults Boolean       @default(false) @map("show_live_results")
  rankingDepth    Int?          @map("ranking_depth") // null = rank all, N = rank top N
  teacherId       String        @map("teacher_id")
  teacher         Teacher       @relation(fields: [teacherId], references: [id])
  sessionId       String?       @map("session_id")
  session         ClassSession? @relation(fields: [sessionId], references: [id])
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  options PollOption[]
  votes   PollVote[]

  @@index([teacherId])
  @@index([sessionId])
  @@index([status])
  @@map("polls")
}

model PollOption {
  id        String   @id @default(uuid())
  text      String
  imageUrl  String?  @map("image_url")
  position  Int      // display order
  pollId    String   @map("poll_id")
  poll      Poll     @relation(fields: [pollId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @map("created_at")

  votes PollVote[]

  @@unique([pollId, position])
  @@index([pollId])
  @@map("poll_options")
}

model PollVote {
  id            String             @id @default(uuid())
  pollId        String             @map("poll_id")
  poll          Poll               @relation(fields: [pollId], references: [id], onDelete: Cascade)
  participantId String             @map("participant_id")
  participant   StudentParticipant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  optionId      String             @map("option_id")
  option        PollOption         @relation(fields: [optionId], references: [id], onDelete: Cascade)
  rank          Int                @default(1) // 1 for simple polls, 1-N for ranked polls
  createdAt     DateTime           @default(now()) @map("created_at")
  updatedAt     DateTime           @updatedAt @map("updated_at")

  @@unique([pollId, participantId, rank]) // One selection per rank per participant
  @@index([pollId])
  @@index([participantId])
  @@index([optionId])
  @@map("poll_votes")
}
```

**Key design decisions:**
- `@@unique([pollId, participantId, rank])` prevents duplicate votes per rank slot. For simple polls, rank is always 1, making this effectively `@@unique([pollId, participantId])`.
- `rank` field supports both simple (rank=1 only) and ranked (rank=1..N) polls in a single table -- no need for separate vote models.
- `pollType` as string (not DB enum) for flexibility, matching the bracket `status` pattern.
- `allowVoteChange` per-poll toggle (CONTEXT.md decision: teacher controls per poll).
- `showLiveResults` per-poll toggle (CONTEXT.md: teacher controls result visibility).
- `rankingDepth` nullable: null means "rank all options," a number means "rank only top N."
- Cascade delete on options and votes from Poll (matching Bracket cascade pattern).
- Relations to Teacher, ClassSession, StudentParticipant follow existing conventions.

**Model additions to existing models:**
```prisma
// Add to Teacher model:
polls Poll[]

// Add to ClassSession model:
polls Poll[]

// Add to StudentParticipant model:
pollVotes PollVote[]
```

### Pattern 2: Poll DAL Functions

**What:** Data Access Layer functions following the exact pattern of `src/lib/dal/bracket.ts` and `src/lib/dal/vote.ts`.
**When to use:** All poll database operations.

```typescript
// lib/dal/poll.ts
import { prisma } from '@/lib/prisma'

/**
 * Create a new poll with options.
 * Follows createBracketDAL pattern: single transaction for poll + options.
 */
export async function createPollDAL(
  teacherId: string,
  data: {
    question: string
    description?: string
    pollType: 'simple' | 'ranked'
    allowVoteChange?: boolean
    showLiveResults?: boolean
    rankingDepth?: number | null
  },
  options: { text: string; imageUrl?: string; position: number }[]
) {
  return prisma.$transaction(async (tx) => {
    const poll = await tx.poll.create({
      data: {
        question: data.question,
        description: data.description ?? null,
        pollType: data.pollType,
        allowVoteChange: data.allowVoteChange ?? true,
        showLiveResults: data.showLiveResults ?? false,
        rankingDepth: data.rankingDepth ?? null,
        status: 'draft',
        teacherId,
      },
    })

    for (const option of options) {
      await tx.pollOption.create({
        data: {
          text: option.text,
          imageUrl: option.imageUrl ?? null,
          position: option.position,
          pollId: poll.id,
        },
      })
    }

    return poll
  })
}

/**
 * Cast a simple poll vote. Uses upsert for idempotent vote handling.
 * rank=1 for simple polls.
 */
export async function castSimplePollVoteDAL(
  pollId: string,
  participantId: string,
  optionId: string
) {
  return prisma.pollVote.upsert({
    where: {
      pollId_participantId_rank: { pollId, participantId, rank: 1 },
    },
    create: { pollId, participantId, optionId, rank: 1 },
    update: { optionId },
  })
}

/**
 * Cast ranked poll votes. Deletes existing rankings and inserts new ones.
 * rankings: [{ optionId, rank }] where rank 1 = top choice.
 */
export async function castRankedPollVoteDAL(
  pollId: string,
  participantId: string,
  rankings: { optionId: string; rank: number }[]
) {
  return prisma.$transaction(async (tx) => {
    // Delete existing rankings for this participant
    await tx.pollVote.deleteMany({
      where: { pollId, participantId },
    })

    // Insert new rankings
    for (const ranking of rankings) {
      await tx.pollVote.create({
        data: {
          pollId,
          participantId,
          optionId: ranking.optionId,
          rank: ranking.rank,
        },
      })
    }
  })
}

/**
 * Get simple poll vote counts per option.
 * Returns Record<optionId, count>.
 */
export async function getSimplePollVoteCounts(
  pollId: string
): Promise<Record<string, number>> {
  const groups = await prisma.pollVote.groupBy({
    by: ['optionId'],
    where: { pollId, rank: 1 },
    _count: { id: true },
  })

  return groups.reduce<Record<string, number>>((acc, g) => {
    acc[g.optionId] = g._count.id
    return acc
  }, {})
}
```

### Pattern 3: Borda Count Aggregation (Pure Function)

**What:** A pure function that computes Borda count scores from ranked poll votes.
**When to use:** Aggregating ranked poll results for display.

```typescript
// lib/poll/borda.ts

/**
 * Compute Borda count scores from ranked votes.
 *
 * Scoring: With N total options, rank 1 gets N-1 points,
 * rank 2 gets N-2 points, ..., rank N gets 0 points.
 *
 * If rankingDepth < N (partial rankings), only ranked options get points.
 * Unranked options get 0 points from that ballot.
 *
 * @param votes - Array of { optionId, rank } from all participants
 * @param totalOptions - Total number of options in the poll
 * @returns Record<optionId, totalPoints> sorted descending by points
 */
export function computeBordaScores(
  votes: { optionId: string; rank: number }[],
  totalOptions: number
): { optionId: string; points: number }[] {
  const scores: Record<string, number> = {}

  for (const vote of votes) {
    const points = totalOptions - vote.rank // rank 1 = N-1 points
    scores[vote.optionId] = (scores[vote.optionId] ?? 0) + points
  }

  return Object.entries(scores)
    .map(([optionId, points]) => ({ optionId, points }))
    .sort((a, b) => b.points - a.points)
}

/**
 * Get per-voter Borda scores for a leaderboard breakdown.
 * Returns each option's total and the number of voters who ranked it.
 */
export function computeBordaLeaderboard(
  votes: { optionId: string; rank: number; participantId: string }[],
  totalOptions: number,
  totalVoters: number
): {
  optionId: string
  totalPoints: number
  maxPossiblePoints: number
  voterCount: number
}[] {
  const maxPerVoter = totalOptions - 1
  const maxPossible = maxPerVoter * totalVoters

  const scores: Record<string, { points: number; voters: Set<string> }> = {}

  for (const vote of votes) {
    if (!scores[vote.optionId]) {
      scores[vote.optionId] = { points: 0, voters: new Set() }
    }
    scores[vote.optionId].points += totalOptions - vote.rank
    scores[vote.optionId].voters.add(vote.participantId)
  }

  return Object.entries(scores)
    .map(([optionId, { points, voters }]) => ({
      optionId,
      totalPoints: points,
      maxPossiblePoints: maxPossible,
      voterCount: voters.size,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
}
```

**Borda point scale decision (Claude's Discretion):** Use N-1 down to 0 (standard Borda count). With N options, rank 1 gets N-1 points, rank 2 gets N-2 points, rank N gets 0 points. This is the most widely used scale and the most intuitive to explain to teachers: "Your #1 pick gets the most points."

### Pattern 4: Broadcast Extensions for Polls

**What:** New broadcast functions added to the existing `src/lib/realtime/broadcast.ts` module.
**When to use:** After every poll mutation (vote cast, status change, etc.).

```typescript
// Add to lib/realtime/broadcast.ts

/**
 * Broadcast a poll vote update to the poll channel.
 * Teacher dashboard listens for updated vote distribution.
 */
export async function broadcastPollVoteUpdate(
  pollId: string,
  voteCounts: Record<string, number>,
  totalVotes: number
): Promise<void> {
  await broadcastMessage({
    topic: `poll:${pollId}`,
    event: 'poll_vote_update',
    payload: { voteCounts, totalVotes },
  })
}

/**
 * Broadcast a poll state change.
 * Used for lifecycle events: activated, closed, archived.
 */
export async function broadcastPollUpdate(
  pollId: string,
  type: 'poll_activated' | 'poll_closed' | 'poll_archived',
  payload: Record<string, unknown> = {}
): Promise<void> {
  await broadcastMessage({
    topic: `poll:${pollId}`,
    event: 'poll_update',
    payload: { type, ...payload },
  })
}
```

### Pattern 5: Signed Upload URL for Option Images

**What:** Server action generates a signed upload URL; client uploads directly to Supabase Storage.
**When to use:** When teacher adds an image to a poll option.

```typescript
// Server action: generate signed upload URL
// actions/poll.ts (excerpt)

export async function getOptionImageUploadUrl(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) return { error: 'Not authenticated' }

  const schema = z.object({
    fileName: z.string().min(1),
    contentType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const { fileName, contentType } = parsed.data
  const path = `poll-options/${teacher.id}/${Date.now()}-${fileName}`

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from('poll-images')
    .createSignedUploadUrl(path)

  if (error) return { error: 'Failed to create upload URL' }

  return { signedUrl: data.signedUrl, token: data.token, path }
}

// Client-side: compress image then upload to signed URL
// lib/utils/image-compress.ts

export async function compressImage(
  file: File,
  maxDimension: number = 800,
  quality: number = 0.8
): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  // Calculate proportional resize
  let newWidth = width
  let newHeight = height
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height)
    newWidth = Math.round(width * ratio)
    newHeight = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = newWidth
  canvas.height = newHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight)

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality)
  )

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: 'image/jpeg',
  })
}
```

**Image resize dimensions decision (Claude's Discretion):** Max 800px on longest side, JPEG quality 0.8. This provides good visual quality for thumbnails displayed on student cards (~200px wide) and teacher views (~400px wide) while keeping file sizes under 200KB for fast loading on classroom networks.

### Pattern 6: Animated Bar Chart with Motion

**What:** Custom horizontal bar chart built with Motion (already installed) for real-time animated poll results.
**When to use:** Simple poll results -- teacher dashboard and presentation mode.

```typescript
// components/poll/bar-chart.tsx (concept)
'use client'

import { motion, AnimatePresence } from 'motion/react'

interface BarChartProps {
  data: { optionId: string; label: string; count: number; color: string }[]
  total: number
}

export function AnimatedBarChart({ data, total }: BarChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0

          return (
            <motion.div
              key={item.optionId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: index * 0.05,
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
              className="flex items-center gap-3"
            >
              <span className="w-24 truncate text-sm font-medium">
                {item.label}
              </span>
              <div className="flex-1 overflow-hidden rounded-full bg-muted h-8">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: item.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.count / maxCount) * 100}%` }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    mass: 0.8,
                  }}
                />
              </div>
              <span className="w-16 text-right text-sm font-bold">
                {percentage.toFixed(0)}%
              </span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
```

**Why Motion over Recharts:** The CONTEXT.md specifies "bouncy/playful animation style -- bars pop and bounce as votes arrive, game show energy." This requires spring physics animations that Recharts does not natively support. Motion (already installed, v12.29.2) provides `type: 'spring'` with `stiffness`, `damping`, and `mass` controls that produce exactly the bouncy effect described. Building charts from `motion.div` elements (for bars) and `motion.path` (for donut arcs) gives full control over the animation feel.

### Pattern 7: Real-Time Poll Hook

**What:** Hook that subscribes to poll broadcast channel with batched updates, following `useRealtimeBracket` pattern exactly.
**When to use:** Teacher live results dashboard and student post-vote results view.

```typescript
// hooks/use-realtime-poll.ts
'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PollVoteCounts {
  [optionId: string]: number
}

export function useRealtimePoll(pollId: string, batchIntervalMs = 2000) {
  const supabase = useMemo(() => createClient(), [])
  const [voteCounts, setVoteCounts] = useState<PollVoteCounts>({})
  const [totalVotes, setTotalVotes] = useState(0)
  const [pollStatus, setPollStatus] = useState<string>('active')
  const [transport, setTransport] = useState<'websocket' | 'polling'>('websocket')
  const pendingCounts = useRef<PollVoteCounts | null>(null)
  const pendingTotal = useRef<number | null>(null)

  const fetchPollState = useCallback(async () => {
    try {
      const res = await fetch(`/api/polls/${pollId}/state`)
      if (!res.ok) return
      const data = await res.json()
      setVoteCounts(data.voteCounts)
      setTotalVotes(data.totalVotes)
      setPollStatus(data.status)
    } catch { /* non-fatal */ }
  }, [pollId])

  useEffect(() => {
    let wsConnected = false
    let pollInterval: ReturnType<typeof setInterval> | null = null

    const flushInterval = setInterval(() => {
      if (pendingCounts.current) {
        setVoteCounts(pendingCounts.current)
        pendingCounts.current = null
      }
      if (pendingTotal.current !== null) {
        setTotalVotes(pendingTotal.current)
        pendingTotal.current = null
      }
    }, batchIntervalMs)

    const channel = supabase
      .channel(`poll:${pollId}`)
      .on('broadcast', { event: 'poll_vote_update' }, (message) => {
        const payload = message.payload as {
          voteCounts: PollVoteCounts
          totalVotes: number
        }
        pendingCounts.current = payload.voteCounts
        pendingTotal.current = payload.totalVotes
      })
      .on('broadcast', { event: 'poll_update' }, (message) => {
        const { type } = message.payload as { type: string }
        if (type === 'poll_closed') {
          setPollStatus('closed')
          fetchPollState() // Get final results
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          wsConnected = true
          fetchPollState()
        }
      })

    const wsTimeout = setTimeout(() => {
      if (!wsConnected) {
        setTransport('polling')
        fetchPollState()
        pollInterval = setInterval(fetchPollState, 3000)
      }
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(flushInterval)
      clearTimeout(wsTimeout)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [pollId, supabase, batchIntervalMs, fetchPollState])

  return { voteCounts, totalVotes, pollStatus, transport, refetch: fetchPollState }
}
```

### Anti-Patterns to Avoid

- **Separate vote tables for simple vs ranked polls:** A single PollVote table with a `rank` field handles both types. Simple polls always have rank=1. Ranked polls have rank=1..N. The `@@unique([pollId, participantId, rank])` constraint works for both.
- **Storing Borda scores in the database:** Borda scores are derived data computed from votes. Store raw votes (optionId + rank), compute scores on read. This keeps data normalized and avoids stale-score bugs when votes change.
- **Passing image file bytes through server actions:** Next.js has a 1MB default body size limit on server actions. Use signed upload URLs to have clients upload directly to Supabase Storage. The server action only returns the URL.
- **Using `framer-motion` import path:** The project uses `motion` v12.x. Import from `"motion/react"`, NOT `"framer-motion"`.
- **Making poll results a separate page load:** Poll results should be a client-side view toggle, not a page navigation. The teacher and student views subscribe to real-time updates and render charts inline. Navigating away would lose the WebSocket subscription.
- **Subscribing to Postgres Changes for poll vote updates:** Same as Phase 4 -- use Broadcast to avoid N-read amplification in classrooms with 30+ students.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Poll vote deduplication | Application-level read-then-write | Prisma `@@unique` + `upsert` (compound unique on pollId+participantId+rank) | TOCTOU race condition in read-then-write. Database constraint is atomic. Identical to bracket vote pattern. |
| Real-time vote broadcast | Custom WebSocket server or SSE | Supabase Realtime Broadcast (REST API from server actions) | Already proven in Phase 4. REST API sends HTTP POST, Supabase fans out to WebSocket subscribers. |
| Image upload to cloud storage | Custom file handling in server actions | Supabase Storage signed upload URLs | Bypasses server action body limits. Client uploads directly to Supabase CDN. Expiring URLs provide security. |
| Client-side image compression | Full image processing library | Canvas API (`createImageBitmap` + `canvas.toBlob`) | ~15 lines of code. No library needed. Resize to max dimension + JPEG quality parameter covers all our needs. |
| Spring physics animations | Custom requestAnimationFrame loop | Motion library spring transitions | Already installed. `type: 'spring'` with stiffness/damping parameters. Handles interrupted animations (new votes arriving mid-bounce). |
| Transport fallback | Complex reconnection logic | Existing `useRealtimeBracket` pattern (5s timeout, 3s polling) | Pattern already proven in Phase 4. Copy for polls with poll-specific endpoints. |

**Key insight:** Polls are structurally simpler than brackets (no tournament tree, no advancement engine). The complexity is in the UX layer (animations, chart types, ranked interaction) and the integration layer (unified navigation, activities API, image upload). Leverage existing infrastructure for the plumbing; invest effort in the UX.

## Common Pitfalls

### Pitfall 1: Ranked Vote Overwrites Without Full Replacement

**What goes wrong:** When a student changes their ranked vote (re-ordering options), only some rank entries are updated, leaving stale rankings that mix old and new preferences.
**Why it happens:** Using `upsert` per rank entry (like simple votes) can leave orphaned entries if the student's new ranking has fewer items than their old one.
**How to avoid:** For ranked poll vote changes, always delete-then-insert within a transaction. Delete all existing PollVote records for that (pollId, participantId), then insert the new complete ranking. This is atomic and guarantees consistency.
**Warning signs:** Borda scores seem inflated. A student appears to have more rank entries than `rankingDepth` allows.

### Pitfall 2: Borda Scores Incorrect with Partial Rankings

**What goes wrong:** When `rankingDepth` < total options (e.g., "rank your top 3 out of 8"), the Borda formula gives wrong scores if it assumes all N options are ranked.
**Why it happens:** Standard Borda assigns N-1 points for rank 1. But if only 3 of 8 are ranked, rank 1 should get 2 points (depth-1), not 7 (N-1).
**How to avoid:** The Borda formula should use `rankingDepth` (not `totalOptions`) as the base when partial rankings are configured. Points = rankingDepth - rank. Unranked options get 0 points. Document this clearly in the Borda function.
**Warning signs:** Options ranked #1 in partial-ranking polls have disproportionately high scores compared to full-ranking polls.

### Pitfall 3: Multiple Active Polls Overwhelming the Student Activity List

**What goes wrong:** CONTEXT.md says "Multiple polls can be active simultaneously in one session." If a teacher activates many polls at once, the student activity grid becomes cluttered and confusing.
**Why it happens:** No limit on simultaneous active polls.
**How to avoid:** Sort by most recent activation time (newest first). Consider a soft warning to the teacher when activating a poll while 3+ are already active. The student activity grid already handles multiple items gracefully (responsive grid layout from Phase 2).
**Warning signs:** Students report confusion about which poll to vote on.

### Pitfall 4: Image Upload Race with Poll Creation

**What goes wrong:** Teacher uploads images for poll options, then creates the poll. If the image upload is slow or fails, the poll is created without images, or with dangling image URLs.
**Why it happens:** Image upload (to Supabase Storage) and poll creation (server action + Prisma) are separate async operations.
**How to avoid:** Two approaches: (1) Upload images first, store URLs in component state, then create poll with URLs included. If an upload fails, show an error and allow retry before creation. (2) Create poll first (draft), then upload images and update options. Approach (1) is simpler because the poll creation action receives complete data. Use client-side validation to ensure all uploads completed before enabling the "Create" button.
**Warning signs:** Poll options show broken image icons. Supabase Storage has orphaned images.

### Pitfall 5: Activities API Not Returning Polls

**What goes wrong:** The existing `/api/sessions/[sessionId]/activities` endpoint only queries brackets. After adding polls, students see brackets but not polls in their activity list.
**Why it happens:** The endpoint was built in Phase 2/4 for brackets only. It needs to be extended to also query polls and merge the results.
**How to avoid:** Update the activities API route to query both brackets and polls, merge into a single array, and sort by most recent. The `Activity` interface already has `type: 'bracket' | 'poll'` and the `ActivityCard` component already renders different icons for each type.
**Warning signs:** Students don't see active polls in their session view.

### Pitfall 6: Navigation Refactor Breaking Existing Bracket Routes

**What goes wrong:** Renaming the sidebar nav from "Brackets" to "Activities" or changing routes breaks existing bracket functionality or bookmarks.
**Why it happens:** The sidebar nav currently has a hardcoded `/brackets` href. If the route structure changes, existing links break.
**How to avoid:** Keep existing bracket routes intact (`/brackets`, `/brackets/[id]`, `/brackets/[id]/live`). Add new poll routes (`/polls/new`, `/polls/[id]`, `/polls/[id]/live`). Create a new unified `/activities` page that lists both types. The sidebar nav item can point to `/activities` but the bracket-specific routes remain functional.
**Warning signs:** 404 errors on bracket pages. Teacher bookmarks stop working.

### Pitfall 7: Presentation Mode Losing WebSocket Connection

**What goes wrong:** When teacher enters presentation mode (fullscreen), the component remounts or the page navigates, dropping the real-time subscription.
**Why it happens:** If presentation mode is a separate route or causes a component tree remount.
**How to avoid:** Presentation mode should be a CSS overlay (fullscreen with `position: fixed`) within the same page component, not a separate route. The real-time hook stays mounted. Use the Fullscreen API (`document.documentElement.requestFullscreen()`) for true fullscreen without navigation.
**Warning signs:** Results stop updating when teacher enters presentation mode.

## Code Examples

Verified patterns from official sources and codebase analysis:

### Server Action: Create Poll (Following Bracket Pattern)

```typescript
// actions/poll.ts
'use server'

import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { createPollDAL } from '@/lib/dal/poll'
import { createPollSchema, pollOptionSchema } from '@/lib/utils/validation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createPollWithOptionsSchema = z.object({
  poll: createPollSchema,
  options: z.array(pollOptionSchema).min(2).max(32),
})

export async function createPoll(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) return { error: 'Not authenticated' }

  const parsed = createPollWithOptionsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid poll data', issues: parsed.error.issues }
  }

  const { poll: pollData, options } = parsed.data

  try {
    const result = await createPollDAL(teacher.id, pollData, options)
    revalidatePath('/activities')
    return { poll: { id: result.id, question: result.question } }
  } catch {
    return { error: 'Failed to create poll' }
  }
}
```

### Server Action: Cast Poll Vote (Following Vote Pattern)

```typescript
// actions/poll.ts (continued)

export async function castPollVote(input: unknown) {
  const schema = z.object({
    pollId: z.string().uuid(),
    participantId: z.string().uuid(),
    optionId: z.string().uuid(), // for simple polls
    rankings: z.array(z.object({
      optionId: z.string().uuid(),
      rank: z.number().int().positive(),
    })).optional(), // for ranked polls
  })

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid vote data' }

  const { pollId, participantId, optionId, rankings } = parsed.data

  try {
    // Check poll status
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { status: true, pollType: true, allowVoteChange: true },
    })
    if (!poll || poll.status !== 'active') {
      return { error: 'Poll is not active' }
    }

    // Check participant not banned
    const participant = await prisma.studentParticipant.findUnique({
      where: { id: participantId },
      select: { banned: true },
    })
    if (!participant || participant.banned) {
      return { error: 'Participant cannot vote' }
    }

    // Check vote changeability
    if (!poll.allowVoteChange) {
      const existing = await prisma.pollVote.findFirst({
        where: { pollId, participantId },
      })
      if (existing) return { error: 'Vote already submitted (changes not allowed)' }
    }

    // Cast vote based on poll type
    if (poll.pollType === 'simple') {
      await castSimplePollVoteDAL(pollId, participantId, optionId)
    } else if (rankings) {
      await castRankedPollVoteDAL(pollId, participantId, rankings)
    }

    // Broadcast updated counts (non-blocking)
    const voteCounts = await getSimplePollVoteCounts(pollId)
    const totalVotes = Object.values(voteCounts).reduce((s, c) => s + c, 0)
    broadcastPollVoteUpdate(pollId, voteCounts, totalVotes).catch(console.error)

    return { success: true }
  } catch {
    return { error: 'Failed to cast vote' }
  }
}
```

### Feature Gate: Poll Type by Tier

```typescript
// Extension to lib/gates/features.ts

/**
 * Check if a tier can use a specific poll type.
 * Free: simple only. Pro/Pro Plus: simple + ranked.
 */
export function canUsePollType(
  tier: SubscriptionTier,
  pollType: string
): AccessResult {
  const allowed: readonly string[] = TIER_LIMITS[tier].pollTypes
  if (!allowed.includes(pollType)) {
    let upgradeTarget: SubscriptionTier = 'pro_plus'
    for (const t of TIER_ORDER) {
      if ((TIER_LIMITS[t].pollTypes as readonly string[]).includes(pollType)) {
        upgradeTarget = t
        break
      }
    }
    return {
      allowed: false,
      reason: `${pollType} polls require ${upgradeTarget} plan`,
      upgradeTarget,
    }
  }
  return { allowed: true }
}
```

### Activities API Extension (Adding Polls)

```typescript
// Extending app/api/sessions/[sessionId]/activities/route.ts

// After fetching brackets, also fetch polls:
const polls = await prisma.poll.findMany({
  where: {
    sessionId,
    status: { in: ['active', 'closed'] },
  },
  select: {
    id: true,
    question: true,
    status: true,
    pollType: true,
    _count: { select: { votes: true } },
  },
})

// Map polls to Activity interface
const pollActivities = await Promise.all(
  polls.map(async (poll) => {
    let hasVoted = false
    if (pid) {
      const voteCount = await prisma.pollVote.count({
        where: { pollId: poll.id, participantId: pid },
      })
      hasVoted = voteCount > 0
    }
    return {
      id: poll.id,
      name: poll.question,
      type: 'poll' as const,
      participantCount: poll._count.votes,
      hasVoted,
      status: poll.status,
    }
  })
)

// Merge and return both
const allActivities = [...bracketActivities, ...pollActivities]
  .sort((a, b) => /* sort by most recent activation */)
return NextResponse.json(allActivities)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chart libraries (Recharts/Chart.js) for animated results | Motion (spring physics) with custom SVG elements | 2024-2025 | Full control over "bouncy/playful" animation feel. No chart library dependency. Motion already in the project. |
| Server action file upload (bodySizeLimit increase) | Supabase Storage signed upload URLs | 2024 | Client uploads directly to CDN. Avoids server action body limits. Expiring URLs for security. |
| Separate bracket/poll navigation | Unified "Activities" section with type badges | Phase 5 (new) | Single entry point for all classroom activities. Status tabs with type differentiation. |
| framer-motion package | motion package (v12+, `from "motion/react"`) | 2025 (v12) | Already migrated in Phase 4. Import path is `motion/react`. |

**Deprecated/outdated:**
- **framer-motion import path:** Use `motion` package with `import from "motion/react"`.
- **borda-count npm package for in-app use:** Designed for CLI/CSV usage. A pure function is simpler for in-app computation.

## Open Questions

1. **Option Limit Tiers for Polls**
   - What we know: CONTEXT.md specifies "free 2-6, pro 2-12, pro plus up to 32" option limits
   - What's unclear: The existing TIER_LIMITS in `src/lib/gates/tiers.ts` does not have poll option limits defined
   - Recommendation: Add `maxPollOptions` to TIER_LIMITS: `{ free: 6, pro: 12, pro_plus: 32 }` and a `canUsePollOptionCount()` gate function. Add `minPollOptions: 2` as a constant (same for all tiers).

2. **Poll Templates: Storage and Format**
   - What we know: CONTEXT.md specifies "Curated poll templates by category (icebreaker, classroom decisions, etc.)"
   - What's unclear: How many templates, exact categories, whether teachers can save their own as templates
   - Recommendation: Ship 15-20 curated templates across 4-5 categories as a TypeScript constant (same pattern as `curated-topics.ts` for brackets). Categories: Icebreakers, Classroom Decisions, Academic Debates, Fun/Trivia, Feedback. Teacher-saved templates can be deferred.

3. **Archive vs Delete UX Pattern (Claude's Discretion)**
   - What we know: CONTEXT.md specifies "Archive + delete for closed polls: archive hides from main view but keeps data, delete removes permanently"
   - Recommendation: Use a 4th status value "archived" (draft -> active -> closed -> archived). The activities list filters to show Active/Draft/Closed tabs by default. Archived polls are hidden but accessible via an "Archived" toggle or separate tab. Delete is permanent removal via the existing delete pattern.

4. **Presentation Mode Entry Method (Claude's Discretion)**
   - What we know: CONTEXT.md says "Presentation mode available: full-screen results view"
   - Recommendation: A "Present" button on the poll results page that triggers `document.documentElement.requestFullscreen()` and switches to a presentation CSS layout. Also support keyboard shortcut `F` to toggle. Exit via Escape key or "Exit" button.

5. **Reveal Animation Specifics (Claude's Discretion)**
   - What we know: CONTEXT.md says "Reveal animation when teacher closes poll -- brief winner/top result announcement"
   - Recommendation: 2-second animation sequence: (1) bars/donut grow from 0 with spring physics, (2) winner option glows and scales up, (3) confetti burst (reuse canvas-confetti from Phase 4). Total duration ~3 seconds. Matches the Phase 4 celebration pattern (CelebrationScreen).

6. **Card Color Palette for Poll Type Distinction (Claude's Discretion)**
   - What we know: CONTEXT.md says "Poll cards have distinct visual style (different color/icon) to distinguish from brackets"
   - Recommendation: Brackets use the existing Trophy icon (amber/gold tone). Polls use BarChart3 icon with an indigo/purple tone. This creates clear visual distinction without clashing with the existing design system.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** -- Direct reading of `prisma/schema.prisma`, `src/lib/dal/bracket.ts`, `src/lib/dal/vote.ts`, `src/actions/bracket.ts`, `src/actions/vote.ts`, `src/lib/realtime/broadcast.ts`, `src/hooks/use-realtime-bracket.ts`, `src/lib/gates/tiers.ts`, `src/lib/gates/features.ts`, `src/components/bracket/bracket-form.tsx`, `src/components/student/activity-card.tsx`, `src/components/student/activity-grid.tsx`, `src/app/api/sessions/[sessionId]/activities/route.ts`, `src/components/dashboard/sidebar-nav.tsx`, `src/app/proxy.ts`
- **Borda count algorithm** -- [Wikipedia: Borda count](https://en.wikipedia.org/wiki/Borda_count) -- Scoring formula, partial ranking handling
- **Motion v12 docs** -- [motion.dev/docs/react-animation](https://motion.dev/docs/react-animation) -- Spring animations, AnimatePresence, SVG path animation
- **Supabase Storage API** -- [createSignedUploadUrl](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl), [uploadToSignedUrl](https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl) -- Signed URL creation and usage
- **Next.js serverActions config** -- [nextjs.org/docs/app/api-reference/config/next-config-js/serverActions](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) -- bodySizeLimit configuration

### Secondary (MEDIUM confidence)
- **Recharts animation limitations** -- [GitHub Issue #376](https://github.com/recharts/recharts/issues/376) -- Limited custom animation support, entire chart redraws on data update
- **Signed URL upload pattern for Next.js** -- [Medium: Ollie](https://medium.com/@olliedoesdev/signed-url-file-uploads-with-nextjs-and-supabase-74ba91b65fe0) -- Server action + client-side upload pattern
- **browser-image-compression** -- [Canvas API resize approach](https://pqina.nl/blog/compress-image-before-upload/) -- `createImageBitmap` + `canvas.toBlob` pattern
- **Compressor.js** -- [GitHub: fengyuanchen/compressorjs](https://github.com/fengyuanchen/compressorjs) -- Alternative image compression library (not recommended -- Canvas API is sufficient)

### Tertiary (LOW confidence)
- **borda-count npm package** -- [GitHub: bahmutov/borda-count](https://github.com/bahmutov/borda-count) -- CLI-focused, not suitable for in-app use
- **React chart library comparisons** -- [Aglowid blog](https://aglowiditsolutions.com/blog/react-chart-libraries/), [LogRocket blog](https://blog.logrocket.com/best-react-chart-libraries-2025/) -- General landscape overview, used to assess alternatives

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already installed in the project (motion, Prisma, Supabase, Zod, canvas-confetti). No new dependencies needed.
- Architecture: HIGH -- Patterns directly mirror existing codebase (DAL, server actions, broadcast, hooks). Every pattern was verified by reading the actual implementation in Phases 1-4.
- Borda count algorithm: HIGH -- Well-documented mathematical formula. Pure function implementation is trivial and testable.
- Schema design: HIGH -- Follows existing conventions (Bracket/BracketEntrant/Vote -> Poll/PollOption/PollVote). Compound unique constraints proven in Phase 4.
- Image upload: MEDIUM -- Supabase Storage signed URLs are documented but the specific pattern (server action -> signed URL -> client upload -> store path) has not been implemented in this codebase before. Known issues with RLS and signed URLs noted in Supabase discussions.
- Chart visualization: MEDIUM -- Custom Motion SVG charts will produce the desired "bouncy" effect but require manual SVG work (bar widths, donut arc paths). No chart library handles this automatically. The approach is sound but untested in this codebase.
- Navigation refactor: MEDIUM -- Changing sidebar from "Brackets" to unified "Activities" affects existing routes. Recommended approach (keep existing routes, add new ones) is safe but the unified page merging both types needs careful UX work.

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (30 days -- Supabase Storage may have API changes; Motion library updates frequently; verify before production)
