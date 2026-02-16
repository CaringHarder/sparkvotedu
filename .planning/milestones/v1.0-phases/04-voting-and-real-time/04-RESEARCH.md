# Phase 4: Voting & Real-Time - Research

**Researched:** 2026-01-31
**Domain:** Real-time voting, vote deduplication, Supabase Realtime Broadcast/Presence, optimistic UI updates, bracket round advancement, school network transport resilience, celebration animations
**Confidence:** MEDIUM (composite -- HIGH for core voting/real-time patterns, MEDIUM for transport resilience on school networks, MEDIUM for animation library React 19 compatibility)

## Summary

This research covers everything needed to plan Phase 4: building the real-time voting and bracket advancement system. Students cast votes on bracket matchups via server actions with deduplication enforced by a compound unique constraint (`@@unique([matchupId, participantId])`). Vote counts are broadcast to the teacher dashboard via Supabase Realtime Broadcast (REST API from server actions, batched on the client). Students see bracket state updates through the same Broadcast channels already established in Phase 2. The teacher advances brackets through rounds -- either accepting vote-decided winners or manually overriding -- with winner propagation handled by a bracket advancement engine that slots winners into the next round's matchups.

The key architectural insight is that the **server action is the single source of truth for all mutations** (vote casting, winner selection, round advancement), and it fires Supabase Broadcast messages via the REST API after each database write. Clients (both teacher dashboard and student views) subscribe to Broadcast channels and update their local state accordingly. This avoids Postgres Changes (which would trigger N reads for N subscribers in a 30-student classroom) and aligns with the Broadcast-over-Postgres-Changes decision from Phase 2 research (02-RESEARCH.md, Pitfall 5).

The most significant limitation is that **Supabase Realtime's JavaScript client does NOT support long-polling or SSE fallback** -- it is WebSocket-only. For school networks that block WebSocket (`wss://`) traffic, the fallback strategy is a lightweight polling mechanism built into the client that detects WebSocket failure and falls back to periodic HTTP fetches of bracket/vote state. This polling fallback must be purpose-built since Supabase does not provide it out of the box.

**Primary recommendation:** Use Prisma `@@unique([matchupId, participantId])` for vote deduplication with `upsert` for idempotent vote handling. Send Broadcast messages via Supabase REST API from server actions after mutations. Use React 19 `useOptimistic` for instant vote feedback. Build a custom polling fallback for school networks where WebSocket is blocked. Use `motion` (v12+, formerly framer-motion) for winner reveal and bracket advancement animations, and `canvas-confetti` for the championship celebration.

## Standard Stack

The established libraries/tools for this phase:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.3.x | Vote model, unique constraints, transactions for round advancement | Already installed. `@@unique` compound constraints + `upsert` with `INSERT ... ON CONFLICT` for race-safe deduplication. |
| @supabase/supabase-js | 2.93.x | Realtime Broadcast for vote/bracket updates, Presence for student tracking | Already installed. Phase 2 established Broadcast channels (`activities:{sessionId}`) and Presence (`session:{sessionId}`). Extend with voting channels. |
| React 19 `useOptimistic` | Built-in | Instant vote feedback before server confirmation | Built into React 19 (already in project). Perfect for single-tap vote UX -- shows checkmark immediately, reverts on error. |
| Zod | 4.x | Vote input validation, round advancement schemas | Already installed. Consistent with existing validation pattern in `src/lib/utils/validation.ts`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| motion | 12.x | Winner reveal animations, bracket advancement transitions, countdown suspense | Slide/fade animations when winner advances to next round slot. Countdown number animation for dramatic reveal. Import from `"motion/react"`. Compatible with React 19. |
| canvas-confetti | 1.x | Championship celebration confetti | Final bracket winner celebration screen. Lightweight (<10KB gzipped), GPU-accelerated, supports `disableForReducedMotion` for accessibility. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Broadcast (REST API from server) | Supabase Postgres Changes | Postgres Changes triggers N database reads for N subscribers (30+ students). Broadcast avoids this. Phase 2 research explicitly chose Broadcast. |
| Custom polling fallback for blocked WebSockets | No fallback (accept WebSocket requirement) | School firewalls commonly block `wss://`. A polling fallback ensures the product works in restrictive environments. |
| motion (framer-motion successor) | CSS transitions / Tailwind animate | CSS is lighter but cannot do layout animations (winner sliding into next bracket slot) or orchestrated sequences (countdown reveal). Motion handles these natively. |
| canvas-confetti | react-canvas-confetti | React wrapper adds component API but `canvas-confetti` can be called imperatively from any component. Simpler, no wrapper needed. |
| React 19 `useOptimistic` | Manual useState + rollback | `useOptimistic` handles rebasing (when vote counts update from other students while your vote is pending), error rollback, and transition integration automatically. |

**Installation:**

```bash
# Animation for winner reveal and bracket transitions
npm install motion

# Celebration confetti for championship winner
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

**Note:** `@supabase/supabase-js`, `prisma`, `@prisma/client`, `zod`, and `react` (19.x with `useOptimistic`) are already installed.

## Architecture Patterns

### Recommended Project Structure (Phase 4 Additions)

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── brackets/
│   │       └── [bracketId]/
│   │           ├── page.tsx                  # EXISTING: Bracket detail (teacher view)
│   │           ├── live/
│   │           │   └── page.tsx              # NEW: Live teacher dashboard during active voting
│   │           └── edit/page.tsx             # EXISTING
│   ├── (student)/
│   │   └── session/
│   │       └── [sessionId]/
│   │           ├── page.tsx                  # EXISTING: Student session activity list
│   │           └── bracket/
│   │               └── [bracketId]/
│   │                   └── page.tsx          # NEW: Student voting view (simple/advanced mode)
│   └── api/
│       └── brackets/
│           └── [bracketId]/
│               └── state/route.ts            # NEW: GET endpoint for polling fallback
├── actions/
│   ├── bracket.ts                            # EXISTING: CRUD actions
│   ├── vote.ts                               # NEW: castVote, changeVote server actions
│   └── bracket-advance.ts                    # NEW: advanceMatchup, advanceRound, undoAdvancement
├── lib/
│   ├── dal/
│   │   ├── bracket.ts                        # EXISTING: Bracket DAL
│   │   └── vote.ts                           # NEW: Vote DAL (create, count, check)
│   ├── bracket/
│   │   ├── engine.ts                         # EXISTING: generateMatchups, calculateRounds
│   │   ├── types.ts                          # EXISTING: MatchupData, BracketData types
│   │   └── advancement.ts                    # NEW: advanceWinner, propagateToNextMatchup
│   ├── realtime/
│   │   └── broadcast.ts                      # NEW: Server-side broadcast helper (REST API)
│   └── utils/
│       └── validation.ts                     # EXISTING: Extended with vote schemas
├── hooks/
│   ├── use-realtime-activities.ts            # EXISTING: Activity list updates (connect to brackets)
│   ├── use-student-session.ts                # EXISTING: Presence tracking
│   ├── use-realtime-bracket.ts               # NEW: Subscribe to bracket state changes
│   ├── use-vote.ts                           # NEW: Vote state, optimistic update, submission
│   └── use-transport-fallback.ts             # NEW: WebSocket detection + polling fallback
├── components/
│   ├── bracket/
│   │   ├── bracket-diagram.tsx               # EXISTING: SVG bracket (extend for click-to-vote)
│   │   ├── bracket-diagram-interactive.tsx   # NEW: Clickable matchup boxes for voting
│   │   ├── matchup-vote-card.tsx             # NEW: Simple mode single-matchup voting UI
│   │   ├── winner-reveal.tsx                 # NEW: Dramatic countdown + winner animation
│   │   └── celebration-screen.tsx            # NEW: Championship confetti + winner display
│   ├── teacher/
│   │   ├── live-dashboard.tsx                # NEW: Vote counts, participation grid, controls
│   │   ├── vote-count-display.tsx            # NEW: Per-matchup vote progress bars
│   │   ├── participation-sidebar.tsx         # NEW: Collapsible sidebar with student vote status
│   │   ├── round-advancement-controls.tsx    # NEW: Accept votes / override / extend voting
│   │   ├── matchup-timer.tsx                 # NEW: Optional countdown timer per matchup/round
│   │   └── student-roster.tsx                # EXISTING: Extend with voted/not-voted status
│   └── student/
│       ├── activity-grid.tsx                 # EXISTING: Wire to bracket activities
│       ├── simple-voting-view.tsx            # NEW: One matchup at a time, sequential
│       └── advanced-voting-view.tsx          # NEW: Full bracket with all matchups visible
└── types/
    ├── student.ts                            # EXISTING
    └── vote.ts                               # NEW: Vote, VoteCount, MatchupVoteState types
```

### Pattern 1: Vote Model with Compound Unique Constraint

**What:** A `Vote` Prisma model with a `@@unique([matchupId, participantId])` constraint that makes duplicate votes impossible at the database level.
**When to use:** Every vote submission.

```prisma
// prisma/schema.prisma -- new Vote model

model Vote {
  id            String             @id @default(uuid())
  matchupId     String             @map("matchup_id")
  matchup       Matchup            @relation(fields: [matchupId], references: [id], onDelete: Cascade)
  participantId String             @map("participant_id")
  participant   StudentParticipant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  entrantId     String             @map("entrant_id")
  entrant       BracketEntrant     @relation(fields: [entrantId], references: [id])
  createdAt     DateTime           @default(now()) @map("created_at")
  updatedAt     DateTime           @updatedAt @map("updated_at")

  @@unique([matchupId, participantId])
  @@index([matchupId])
  @@index([participantId])
  @@map("votes")
}
```

**Key decisions:**
- `@@unique([matchupId, participantId])` prevents duplicate votes at the database level -- even if two requests arrive simultaneously, only one succeeds
- `entrantId` records WHICH entrant was voted for (the choice)
- `updatedAt` supports vote changeability -- if votes are changeable, the `entrantId` can be updated before the matchup closes
- Relations to `Matchup`, `StudentParticipant`, and `BracketEntrant` enable efficient joins for vote counting and participation checking
- Cascade delete on matchup/participant ensures cleanup when brackets or sessions are removed

### Pattern 2: Idempotent Vote Submission with Upsert

**What:** Use Prisma `upsert` with the compound unique key to make vote casting idempotent -- the same student voting on the same matchup either creates or updates.
**When to use:** `castVote` server action.

```typescript
// lib/dal/vote.ts
import { prisma } from '@/lib/prisma'

/**
 * Cast or update a vote. Idempotent via upsert on the compound unique.
 * If vote changeability is enabled, this updates the existing vote.
 * If votes are locked, the server action should check before calling this.
 */
export async function castVoteDAL(
  matchupId: string,
  participantId: string,
  entrantId: string
) {
  return prisma.vote.upsert({
    where: {
      matchupId_participantId: { matchupId, participantId },
    },
    create: {
      matchupId,
      participantId,
      entrantId,
    },
    update: {
      entrantId,
    },
  })
}

/**
 * Count votes per entrant for a matchup.
 * Returns { entrantId: count } for display on the teacher dashboard.
 */
export async function getVoteCountsForMatchup(matchupId: string) {
  const counts = await prisma.vote.groupBy({
    by: ['entrantId'],
    where: { matchupId },
    _count: { id: true },
  })

  return counts.reduce(
    (acc, { entrantId, _count }) => {
      acc[entrantId] = _count.id
      return acc
    },
    {} as Record<string, number>
  )
}

/**
 * Check if a participant has already voted on a matchup.
 */
export async function hasVoted(matchupId: string, participantId: string) {
  const vote = await prisma.vote.findUnique({
    where: {
      matchupId_participantId: { matchupId, participantId },
    },
    select: { entrantId: true },
  })
  return vote
}

/**
 * Get total vote count and participation count for a matchup.
 */
export async function getMatchupVoteSummary(matchupId: string) {
  const [totalVotes, voteCounts] = await Promise.all([
    prisma.vote.count({ where: { matchupId } }),
    prisma.vote.groupBy({
      by: ['entrantId'],
      where: { matchupId },
      _count: { id: true },
    }),
  ])

  return { totalVotes, voteCounts }
}
```

**Race condition handling:** Prisma 7 delegates eligible `upsert` calls to the database as `INSERT ... ON CONFLICT DO UPDATE`, which is atomic. If two identical vote requests arrive simultaneously, one creates and the other updates -- no error, no duplicate. This is superior to a read-then-write pattern which has a TOCTOU window.

### Pattern 3: Server-Side Broadcast via REST API

**What:** After each mutation (vote cast, winner selected, round advanced), the server action sends a Broadcast message to all subscribed clients via Supabase's REST API.
**When to use:** Every server action that changes bracket/vote state.

```typescript
// lib/realtime/broadcast.ts

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface BroadcastMessage {
  topic: string
  event: string
  payload: Record<string, unknown>
}

/**
 * Send a Broadcast message via Supabase REST API.
 * Used from server actions where no WebSocket connection exists.
 *
 * The REST endpoint converts HTTP -> WebSocket for connected clients.
 */
export async function broadcastMessage(message: BroadcastMessage) {
  const response = await fetch(
    `${SUPABASE_URL}/realtime/v1/api/broadcast`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [message],
      }),
    }
  )

  if (!response.ok) {
    console.error('Broadcast failed:', response.status, await response.text())
  }
}

/**
 * Broadcast a vote update to the bracket channel.
 * Teacher dashboard listens for batched updates.
 */
export async function broadcastVoteUpdate(
  bracketId: string,
  matchupId: string,
  voteCounts: Record<string, number>,
  totalVotes: number
) {
  await broadcastMessage({
    topic: `bracket:${bracketId}`,
    event: 'vote_update',
    payload: { matchupId, voteCounts, totalVotes },
  })
}

/**
 * Broadcast a bracket state change (winner selected, round advanced).
 * Both teacher and student views listen for this.
 */
export async function broadcastBracketUpdate(
  bracketId: string,
  type: 'winner_selected' | 'round_advanced' | 'matchup_opened' | 'bracket_completed',
  payload: Record<string, unknown>
) {
  await broadcastMessage({
    topic: `bracket:${bracketId}`,
    event: 'bracket_update',
    payload: { type, ...payload },
  })
}
```

**Why REST API over client library:** Server actions are stateless -- they execute and terminate. There is no persistent WebSocket connection. The REST API sends an HTTP POST that the Supabase server converts into WebSocket messages for all subscribed clients. This is the documented approach for server-to-client broadcast.

### Pattern 4: Client-Side Bracket Subscription with Batched Updates

**What:** A hook that subscribes to bracket Broadcast channel, batches incoming vote updates, and provides debounced state to prevent excessive re-renders.
**When to use:** Teacher live dashboard and student advanced voting view.

```typescript
// hooks/use-realtime-bracket.ts
'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MatchupData } from '@/lib/bracket/types'

interface VoteCounts {
  [matchupId: string]: {
    [entrantId: string]: number
    total: number
  }
}

/**
 * Subscribe to real-time bracket updates via Supabase Broadcast.
 * Batches vote count updates to prevent re-render storms in 30-student classrooms.
 *
 * @param bracketId - Bracket to subscribe to
 * @param batchIntervalMs - How often to flush batched updates (default: 2000ms)
 */
export function useRealtimeBracket(bracketId: string, batchIntervalMs = 2000) {
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({})
  const [matchups, setMatchups] = useState<MatchupData[]>([])
  const pendingUpdates = useRef<VoteCounts>({})
  const supabase = useMemo(() => createClient(), [])

  // Flush batched vote updates on interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(pendingUpdates.current).length > 0) {
        setVoteCounts((prev) => ({ ...prev, ...pendingUpdates.current }))
        pendingUpdates.current = {}
      }
    }, batchIntervalMs)

    return () => clearInterval(interval)
  }, [batchIntervalMs])

  useEffect(() => {
    const channel = supabase
      .channel(`bracket:${bracketId}`)
      .on('broadcast', { event: 'vote_update' }, ({ payload }) => {
        // Batch vote updates instead of immediate state update
        pendingUpdates.current[payload.matchupId] = {
          ...payload.voteCounts,
          total: payload.totalVotes,
        }
      })
      .on('broadcast', { event: 'bracket_update' }, ({ payload }) => {
        // Bracket structure changes are immediate (not batched)
        // The component should refetch full bracket state
        if (payload.type === 'winner_selected' || payload.type === 'round_advanced') {
          // Trigger a refetch of the bracket data
          fetchBracketState()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bracketId, supabase])

  const fetchBracketState = useCallback(async () => {
    // Fetch updated bracket state from the server
    // This is triggered on structural changes (winners, rounds)
    const res = await fetch(`/api/brackets/${bracketId}/state`)
    if (res.ok) {
      const data = await res.json()
      setMatchups(data.matchups)
    }
  }, [bracketId])

  return { voteCounts, matchups, refetch: fetchBracketState }
}
```

### Pattern 5: Optimistic Vote with useOptimistic

**What:** When a student taps an entrant, the UI shows a checkmark immediately before the server confirms.
**When to use:** Student voting interface (both simple and advanced mode).

```typescript
// hooks/use-vote.ts
'use client'

import { useOptimistic, startTransition, useState } from 'react'
import { castVote } from '@/actions/vote'

interface VoteState {
  votedEntrantId: string | null
  isPending: boolean
}

/**
 * Vote hook with optimistic UI for instant feedback.
 * Single tap to vote, optional change before matchup closes.
 */
export function useVote(matchupId: string, participantId: string, initialVote: string | null) {
  const [confirmedVote, setConfirmedVote] = useState(initialVote)
  const [optimisticVote, setOptimisticVote] = useOptimistic(confirmedVote)
  const [error, setError] = useState<string | null>(null)

  async function submitVote(entrantId: string) {
    setError(null)
    startTransition(async () => {
      setOptimisticVote(entrantId)
      const result = await castVote({
        matchupId,
        participantId,
        entrantId,
      })
      if (result.error) {
        setError(result.error)
        // useOptimistic automatically reverts on transition end
      } else {
        setConfirmedVote(entrantId)
      }
    })
  }

  return {
    votedEntrantId: optimisticVote,
    isPending: optimisticVote !== confirmedVote,
    error,
    submitVote,
  }
}
```

### Pattern 6: Bracket Advancement Engine

**What:** Server-side logic to advance a matchup winner into the next round, propagating the winner to the correct slot in the next matchup.
**When to use:** When teacher accepts vote result or manually selects a winner.

```typescript
// lib/bracket/advancement.ts
import { prisma } from '@/lib/prisma'

/**
 * Advance a matchup: set the winner and propagate to the next matchup.
 *
 * The winner fills either entrant1Id or entrant2Id in the next matchup,
 * depending on whether this matchup fed into the top or bottom slot.
 * The slot is determined by position: odd positions -> entrant1, even -> entrant2.
 */
export async function advanceMatchupWinner(
  matchupId: string,
  winnerId: string,
  bracketId: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. Set the winner on this matchup
    const matchup = await tx.matchup.update({
      where: { id: matchupId },
      data: { winnerId },
      select: { id: true, nextMatchupId: true, position: true },
    })

    // 2. Propagate winner to next matchup if not the final
    if (matchup.nextMatchupId) {
      // Odd positions feed into entrant1, even into entrant2
      const isTopSlot = matchup.position % 2 === 1
      await tx.matchup.update({
        where: { id: matchup.nextMatchupId },
        data: isTopSlot
          ? { entrant1Id: winnerId }
          : { entrant2Id: winnerId },
      })
    }

    return matchup
  })
}

/**
 * Undo a matchup advancement.
 * Only allowed if the next round has NOT been opened for voting.
 * Clears the winner and removes the propagated entrant from the next matchup.
 */
export async function undoMatchupAdvancement(
  matchupId: string,
  bracketId: string
) {
  return prisma.$transaction(async (tx) => {
    const matchup = await tx.matchup.findUnique({
      where: { id: matchupId },
      select: { id: true, winnerId: true, nextMatchupId: true, position: true },
    })

    if (!matchup || !matchup.winnerId) {
      throw new Error('Matchup has no winner to undo')
    }

    // Clear winner
    await tx.matchup.update({
      where: { id: matchupId },
      data: { winnerId: null },
    })

    // Clear from next matchup
    if (matchup.nextMatchupId) {
      const isTopSlot = matchup.position % 2 === 1
      await tx.matchup.update({
        where: { id: matchup.nextMatchupId },
        data: isTopSlot
          ? { entrant1Id: null }
          : { entrant2Id: null },
      })
    }
  })
}
```

### Pattern 7: Transport Fallback for School Networks

**What:** Detect when WebSocket connections fail and fall back to periodic HTTP polling.
**When to use:** All client-side real-time subscriptions, automatically.

```typescript
// hooks/use-transport-fallback.ts
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

type TransportType = 'websocket' | 'polling'

/**
 * Detect WebSocket connectivity and provide a polling fallback.
 * School networks commonly block wss:// traffic via firewall rules.
 *
 * Strategy:
 * 1. Attempt WebSocket connection via Supabase channel
 * 2. If connection fails or times out after 5 seconds, switch to polling
 * 3. Polling fetches bracket state via HTTP GET every N seconds
 */
export function useTransportFallback(
  bracketId: string,
  pollIntervalMs = 3000
) {
  const [transport, setTransport] = useState<TransportType>('websocket')
  const [data, setData] = useState<unknown>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/brackets/${bracketId}/state`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // Network error, will retry on next interval
    }
  }, [bracketId])

  // Start polling when transport switches to polling
  useEffect(() => {
    if (transport === 'polling') {
      fetchState() // Immediate first fetch
      pollRef.current = setInterval(fetchState, pollIntervalMs)
      return () => {
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }
  }, [transport, fetchState, pollIntervalMs])

  const switchToPolling = useCallback(() => {
    setTransport('polling')
  }, [])

  return { transport, data, switchToPolling }
}
```

### Anti-Patterns to Avoid

- **Subscribing to Postgres Changes for vote updates:** With 30+ students subscribed, each vote triggers 30 database reads. Use Broadcast instead -- the server action sends a single broadcast that fans out to all clients without database amplification.
- **Sending vote counts on every single vote:** In a classroom of 30 students voting simultaneously, this creates 30 broadcast messages per second. Batch on the client (2-second interval) to aggregate updates.
- **Using Supabase client library `channel.send()` from server actions:** Server actions are stateless -- there is no persistent WebSocket connection. Use the REST API (`/realtime/v1/api/broadcast`) instead.
- **Trusting client-side vote deduplication:** A student could modify JavaScript to vote multiple times. The `@@unique([matchupId, participantId])` database constraint is the only reliable deduplication.
- **Using `framer-motion` import path:** The library was renamed to `motion`. Use `import { motion } from "motion/react"` not `from "framer-motion"`.
- **Polling bracket state from every student every second:** If WebSocket fallback triggers for an entire classroom, 30 students polling every second creates 30 req/s. Use a 3-second interval minimum and consider shared state via a single teacher-mediated refetch.
- **Re-rendering the entire bracket SVG on every vote update:** Vote count changes should only update the relevant matchup box, not the entire bracket. Use React `memo` and stable keys.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vote deduplication | Application-level read-then-write check | Prisma `@@unique` + `upsert` (delegates to `INSERT ... ON CONFLICT`) | TOCTOU race condition in read-then-write. Database constraint is atomic and concurrent-safe. |
| Real-time message fan-out | Custom WebSocket server | Supabase Realtime Broadcast | Already in the stack. Handles connection management, reconnection, and fan-out. |
| Optimistic UI with rollback | Manual useState + try/catch + revert | React 19 `useOptimistic` | Handles rebasing when server state changes mid-transition, automatic revert on error, and transition integration. |
| Confetti animation | Custom canvas particle system | `canvas-confetti` | Cross-browser, GPU-accelerated, accessibility support (`disableForReducedMotion`), under 10KB. |
| Layout/transition animations | Custom CSS keyframes for bracket transitions | `motion` library | CSS cannot animate layout changes (winner sliding into next slot). Motion handles `layoutId` animations and `AnimatePresence` for enter/exit. |
| Server-to-client broadcast | Custom SSE endpoint or WebSocket server | Supabase Broadcast REST API | One HTTP POST from server action -> fan-out to all subscribed clients. No infrastructure to manage. |

**Key insight:** The voting system is 70% application logic (deduplication, advancement rules, viewing modes, timer management) and 30% infrastructure (real-time transport, animations, UI feedback). Use libraries for infrastructure; write custom code for the classroom-specific application logic.

## Common Pitfalls

### Pitfall 1: Vote Race Conditions Without Database Constraint

**What goes wrong:** Two requests from the same student arrive simultaneously (double-tap, network retry). Without a database-level constraint, both create vote records, giving the student two votes.
**Why it happens:** Application-level "check if voted, then insert" has a TOCTOU window. Between the check and the insert, another request can slip through.
**How to avoid:** The `@@unique([matchupId, participantId])` constraint on the Vote model makes duplicate inserts impossible. Use `upsert` to gracefully handle the conflict -- it creates if not exists, updates if exists. Prisma 7 delegates this to `INSERT ... ON CONFLICT DO UPDATE` which is atomic.
**Warning signs:** A matchup has more votes than participants. Vote counts don't add up.

### Pitfall 2: Broadcast Storm from Rapid Voting

**What goes wrong:** 30 students vote in a 5-second window. Each vote triggers a broadcast. The teacher dashboard receives 30 messages and re-renders 30 times in 5 seconds, causing jank.
**Why it happens:** Per-vote broadcasting without batching. Each server action fires its own broadcast immediately.
**How to avoid:** The server still broadcasts per-vote (because other students need confirmation). The teacher dashboard batches incoming updates using a `useRef` accumulator flushed every 2 seconds via `setInterval`. This collapses 30 individual updates into 1-2 state changes.
**Warning signs:** Teacher dashboard becomes sluggish during active voting. React DevTools shows excessive re-renders.

### Pitfall 3: WebSocket Blocked on School Networks

**What goes wrong:** Students connect but Supabase Realtime channel never reaches `SUBSCRIBED` status. No real-time updates arrive. Students see stale bracket state.
**Why it happens:** School firewalls commonly block `wss://` WebSocket upgrade requests. The Supabase JavaScript client does NOT support long-polling or SSE fallback -- it is WebSocket-only.
**How to avoid:** Implement a transport detection mechanism: if the Supabase channel does not reach `SUBSCRIBED` within 5 seconds, switch to polling mode. The polling fallback fetches bracket state via a standard HTTP GET endpoint at a configurable interval (3 seconds default). This endpoint is a simple Next.js API route that returns the current bracket + vote state.
**Warning signs:** Channel status stays at `CONNECTING` or shows `TIMED_OUT`. Students report "nothing is updating."

### Pitfall 4: Winner Propagation Slot Assignment Error

**What goes wrong:** When advancing a matchup winner to the next round, the winner is placed in the wrong slot (entrant1 vs entrant2), scrambling the bracket.
**Why it happens:** The next matchup has two feeder matchups. Which slot (entrant1 or entrant2) the winner fills depends on the source matchup's position within its round.
**How to avoid:** Use the convention: odd-positioned matchups feed into `entrant1Id` of the next matchup, even-positioned into `entrant2Id`. This follows from the bracket engine's structure where matchup at position P feeds into position `ceil(P/2)` in the next round: P=1 and P=2 both feed into next position 1, with P=1 (odd) as entrant1 and P=2 (even) as entrant2. Validate with unit tests for all bracket sizes (4, 8, 16).
**Warning signs:** Bracket diagram shows entrants in unexpected positions after advancement. Entrants from different sides of the bracket appear in the same matchup.

### Pitfall 5: Undo Advancement After Next Round Opens

**What goes wrong:** Teacher undoes a matchup result, but students in the next round have already cast votes based on the original winner. Those votes become invalid (referencing an entrant no longer in the matchup).
**Why it happens:** No check on downstream state before allowing undo.
**How to avoid:** Before allowing undo, check: does the next matchup have any votes? If so, block the undo with a clear message: "Cannot undo -- voting has started on the next round." The CONTEXT.md locks this decision: "Undo available ONLY if the next round hasn't been opened for voting yet."
**Warning signs:** Orphaned votes pointing to entrants not in the matchup. Students see "vote for X" but X is no longer in the bracket.

### Pitfall 6: Matchup Status Not Tracked

**What goes wrong:** There is no way to distinguish between matchups that are "open for voting," "voting closed but no winner yet," and "decided." Teacher cannot selectively open/close voting per matchup.
**Why it happens:** The current `Matchup` model has no status field -- it only has `winnerId` (null = undecided, set = decided).
**How to avoid:** Add a `status` field to the Matchup model: `pending` (not yet open), `voting` (open for votes), `decided` (winner selected). This enables the teacher to open matchups individually for dramatic reveal, close voting without selecting a winner (to count votes and decide), and control the flow per-matchup rather than per-round.
**Warning signs:** All matchups in a round are simultaneously votable when only some should be. Teacher cannot "pause" voting on a specific matchup.

### Pitfall 7: Bracket Model Missing viewingMode and showVoteCounts Settings

**What goes wrong:** Teacher cannot set Simple vs Advanced viewing mode or toggle vote count visibility because the Bracket model has no fields for these settings.
**Why it happens:** Phase 3 built the Bracket model for structure only (name, size, status, entrants, matchups). Phase 4 voting features need per-bracket teacher preferences.
**How to avoid:** Add fields to the Bracket model: `viewingMode` (simple/advanced), `showVoteCounts` (boolean for whether students see counts at reveal), and optionally `votingTimerSeconds` (null = indefinite). These are teacher-set bracket-level preferences.
**Warning signs:** No way to configure viewing mode. All brackets behave the same way regardless of student age group.

## Code Examples

Verified patterns from official sources:

### Server Action: Cast Vote

```typescript
// actions/vote.ts
'use server'

import { z } from 'zod'
import { castVoteDAL, getVoteCountsForMatchup } from '@/lib/dal/vote'
import { broadcastVoteUpdate } from '@/lib/realtime/broadcast'

const castVoteSchema = z.object({
  matchupId: z.string().uuid(),
  participantId: z.string().uuid(),
  entrantId: z.string().uuid(),
})

/**
 * Cast a vote on a matchup. Idempotent via database upsert.
 * After persisting, broadcasts updated vote counts to the bracket channel.
 */
export async function castVote(input: unknown) {
  const parsed = castVoteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid vote data' }
  }

  const { matchupId, participantId, entrantId } = parsed.data

  try {
    // 1. Check matchup is in 'voting' status (not pending or decided)
    // 2. Check participant is not banned
    // 3. Upsert the vote (idempotent)
    await castVoteDAL(matchupId, participantId, entrantId)

    // 4. Get updated counts and broadcast
    const counts = await getVoteCountsForMatchup(matchupId)
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    // 5. Broadcast to bracket channel (non-blocking)
    // Extract bracketId from matchup for the channel topic
    broadcastVoteUpdate(
      'bracket-id-here', // Resolved from matchup lookup
      matchupId,
      counts,
      total
    ).catch(console.error)

    return { success: true, votedEntrantId: entrantId }
  } catch (error) {
    console.error('Vote error:', error)
    return { error: 'Failed to cast vote' }
  }
}
```

### Server Action: Advance Matchup Winner

```typescript
// actions/bracket-advance.ts
'use server'

import { z } from 'zod'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { advanceMatchupWinner } from '@/lib/bracket/advancement'
import { broadcastBracketUpdate } from '@/lib/realtime/broadcast'
import { revalidatePath } from 'next/cache'

const advanceSchema = z.object({
  bracketId: z.string().uuid(),
  matchupId: z.string().uuid(),
  winnerId: z.string().uuid(),
})

/**
 * Teacher advances a matchup by selecting the winner.
 * Winner is propagated to the next matchup in the bracket.
 * Broadcasts the update so student views refresh.
 */
export async function advanceMatchup(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) return { error: 'Not authenticated' }

  const parsed = advanceSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid data' }

  const { bracketId, matchupId, winnerId } = parsed.data

  try {
    await advanceMatchupWinner(matchupId, winnerId, bracketId)

    // Broadcast bracket update to all clients
    await broadcastBracketUpdate(bracketId, 'winner_selected', {
      matchupId,
      winnerId,
    })

    revalidatePath(`/brackets/${bracketId}`)
    return { success: true }
  } catch (error) {
    console.error('Advance error:', error)
    return { error: 'Failed to advance matchup' }
  }
}
```

### Supabase Broadcast REST API Call

```typescript
// Source: https://supabase.com/docs/guides/realtime/broadcast
// Verified: REST API sends HTTP POST converted to WebSocket for connected clients

// From server action (no WebSocket connection available):
const response = await fetch(
  `${SUPABASE_URL}/realtime/v1/api/broadcast`,
  {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{
        topic: `bracket:${bracketId}`,
        event: 'vote_update',
        payload: { matchupId, voteCounts, totalVotes },
      }],
    }),
  }
)
```

### React 19 useOptimistic for Vote Feedback

```typescript
// Source: https://react.dev/reference/react/useOptimistic
// Verified: Built into React 19, works with startTransition

import { useOptimistic, startTransition } from 'react'

function VoteButton({ entrant, matchupId, participantId, currentVote }) {
  const [optimisticVote, setOptimisticVote] = useOptimistic(currentVote)
  const isVoted = optimisticVote === entrant.id

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          setOptimisticVote(entrant.id)
          await castVote({ matchupId, participantId, entrantId: entrant.id })
        })
      }}
      className={isVoted ? 'voted' : ''}
    >
      {entrant.name}
      {isVoted && <CheckIcon />}
    </button>
  )
}
```

### Client-Side Broadcast Subscription

```typescript
// Source: https://supabase.com/docs/guides/realtime/broadcast
// Verified: Existing pattern from use-realtime-activities.ts in this codebase

const channel = supabase
  .channel(`bracket:${bracketId}`)
  .on('broadcast', { event: 'vote_update' }, ({ payload }) => {
    // Batch this update, don't setState immediately
    pendingUpdates.current[payload.matchupId] = payload.voteCounts
  })
  .on('broadcast', { event: 'bracket_update' }, ({ payload }) => {
    // Structural change -- refetch bracket state
    if (payload.type === 'winner_selected') {
      refetchBracket()
    }
  })
  .subscribe()
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom WebSocket server for real-time voting | Supabase Realtime Broadcast via REST API from server actions | 2024-2025 | No infrastructure to manage. Server actions send HTTP, Supabase handles WebSocket fan-out. |
| framer-motion import path | motion import path (`from "motion/react"`) | 2025 (v12) | Library renamed. Old `framer-motion` import still works but is deprecated. |
| Manual optimistic state with useState | React 19 `useOptimistic` hook | React 19 (2024) | Built-in rebasing when server state changes, automatic rollback on error, transition-aware. |
| Postgres Changes for real-time updates | Supabase Broadcast for voting (avoids N-read amplification) | Phase 2 decision (02-RESEARCH.md) | In a classroom of 30 students, Postgres Changes triggers 30 DB reads per change. Broadcast is O(1) on the database. |
| Per-vote real-time trickle to teacher | Batched vote count updates (every 2-3 seconds) | CONTEXT.md decision | Prevents UI jank from rapid concurrent voting. Teacher sees smooth progress updates. |

**Deprecated/outdated:**
- **framer-motion package name:** Use `motion` package with `import from "motion/react"`.
- **Postgres Changes for high-frequency updates:** Phase 2 research explicitly chose Broadcast to avoid read amplification in 30+ student classrooms.
- **`@supabase/auth-helpers-nextjs`:** Already replaced in Phase 1 with `@supabase/ssr`.

## Open Questions

1. **Vote Changeability Decision (Claude's Discretion)**
   - What we know: CONTEXT.md marks this as Claude's discretion -- whether votes lock immediately or are changeable until the matchup closes
   - Recommendation: **Allow vote changes until the matchup is closed.** Rationale: younger students may accidentally tap the wrong entrant (single tap, no confirmation step). The upsert pattern supports this naturally -- calling `castVote` again just updates the `entrantId`. The teacher never sees individual votes anyway (only counts), so changing doesn't create confusion. Lock votes when `matchup.status` transitions from `voting` to `decided`.

2. **Batched Update Interval Timing (Claude's Discretion)**
   - What we know: CONTEXT.md says teacher dashboard uses batched updates, interval is Claude's discretion
   - Recommendation: **2-second batch interval for the teacher dashboard.** This balances responsiveness (teacher sees progress within 2 seconds of votes arriving) with performance (collapses N individual updates into 1 render). The student view doesn't show vote counts (they're hidden until reveal), so no batching is needed there.

3. **Supabase Broadcast Channel Privacy**
   - What we know: Supabase Broadcast channels can be public or private. Private requires authentication. Students are anonymous (no Supabase auth).
   - What's unclear: Whether public channels are sufficient for this use case, given that vote counts should be hidden from students
   - Recommendation: Use **public channels** since students don't have Supabase auth. Security is enforced application-side: vote counts are not included in the `bracket_update` events that students receive, only in `vote_update` events that the teacher dashboard listens to. The student voting view subscribes to `bracket_update` events only (for structural changes like winner selection), not `vote_update` events. However, a determined student COULD subscribe to `vote_update` events since the channel is public. This is acceptable for a classroom tool -- the "hidden until reveal" is a UX feature, not a security boundary.

4. **Matchup Status Field Design**
   - What we know: The current Matchup model has no status field. Winners are tracked via `winnerId`. The teacher needs to control which matchups are open for voting.
   - Recommendation: Add a `status` field with values: `pending` (not yet open), `voting` (accepting votes), `decided` (winner selected). This enables per-matchup control and supports the "advance matchups individually for drama" CONTEXT.md requirement. Default status for newly created matchups is `pending`. The teacher opens matchups for voting (round by round or individually).

5. **Real-Time Transport Layer (Claude's Discretion)**
   - What we know: Supabase Realtime is WebSocket-only (no SSE or long-polling fallback in the JS client). School networks sometimes block WebSocket.
   - Recommendation: **Primary: Supabase Realtime WebSocket. Fallback: HTTP polling via Next.js API route.** The polling fallback activates only when WebSocket connection fails (detected by 5-second timeout on channel subscription). Polling interval: 3 seconds. This provides coverage for restrictive school networks without adding complexity for the majority of users where WebSocket works fine.

## Sources

### Primary (HIGH confidence)
- [Supabase Realtime Broadcast Docs](https://supabase.com/docs/guides/realtime/broadcast) -- REST API for server-side broadcast, channel config, self/ack options
- [Supabase Realtime Presence Docs](https://supabase.com/docs/guides/realtime/presence) -- Track/untrack, sync/join/leave events (extends Phase 2 implementation)
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits) -- 200 concurrent connections (free), 100 msg/s, 256KB broadcast payload
- [React useOptimistic Docs](https://react.dev/reference/react/useOptimistic) -- Full API: parameters, return values, reducer pattern, error handling, startTransition requirement
- [Prisma Compound Unique Constraints](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints) -- `@@unique` with `upsert`, compound `where` clause
- [Prisma Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) -- Interactive transactions, isolation levels, `$transaction` API
- [canvas-confetti GitHub](https://github.com/catdad/canvas-confetti) -- API, accessibility options, performance (<10KB)
- [Motion for React GitHub](https://github.com/motiondivision/motion) -- v12+, React 19 compatible, `import from "motion/react"`

### Secondary (MEDIUM confidence)
- [Supabase Discussion: Long-polling fallback](https://github.com/orgs/supabase/discussions/17644) -- Confirmed: JS client is WebSocket-only, no long-polling fallback
- [Prisma Race Condition with Upsert](https://github.com/prisma/prisma/issues/3242) -- P2002 handling, `INSERT ... ON CONFLICT` delegation since v4.6.0
- [Prisma Database Upsert](https://www.prisma.io/docs/orm/reference/prisma-client-reference) -- Criteria for automatic delegation to database-level upsert
- [Medium: Supabase Realtime Architecture](https://medium.com/@ansh91627/building-scalable-real-time-systems-a-deep-dive-into-supabase-realtime-architecture-and-eccb01852f2b) -- Optimistic UI patterns with Supabase

### Tertiary (LOW confidence)
- [Motion + React 19 compatibility](https://github.com/vercel/next.js/discussions/72228) -- Community reports on framer-motion/motion with Next.js 15+, React 19 strict mode fixes
- [School network WebSocket blocking](https://drdroid.io/stack-diagnosis/supabase-realtime-websocket-connection-error) -- General WebSocket troubleshooting, firewall whitelisting guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Prisma unique constraints, Supabase Broadcast REST API, React useOptimistic all verified from official documentation
- Architecture: HIGH -- Patterns follow established codebase conventions (server actions -> DAL -> broadcast, hooks for client subscriptions) and extend Phase 2's Broadcast channel approach
- Vote deduplication: HIGH -- Prisma `@@unique` + `upsert` with `INSERT ... ON CONFLICT` is the documented race-safe pattern
- Transport resilience: MEDIUM -- Supabase JS client confirmed WebSocket-only. Custom polling fallback is a reasonable strategy but untested in actual school network conditions
- Animation libraries: MEDIUM -- `motion` v12 claims React 19 support with bug fixes, but Next.js App Router shared layout animations have had historical issues. `canvas-confetti` is stable.
- Pitfalls: HIGH -- Identified from codebase analysis (missing Matchup status, missing Bracket viewingMode), Supabase documentation (read amplification), and Prisma documentation (TOCTOU race conditions)

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (30 days -- Supabase Realtime may add SSE/long-polling fallback; motion library updates frequently; verify before production)
