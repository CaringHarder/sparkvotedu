# Architecture Research

**Domain:** EdTech real-time classroom polling and tournament bracket web application
**Researched:** 2026-01-28
**Confidence:** MEDIUM-HIGH (Next.js patterns verified via official docs; Supabase, Stripe, and fingerprinting patterns based on strong training knowledge with some verification gaps noted)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                    │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │  Teacher UI   │  │  Student UI   │  │  Landing /   │                   │
│  │  (Auth'd)     │  │  (Anonymous)  │  │  Marketing   │                   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │
│         │                 │                  │                            │
│  ┌──────┴─────────────────┴──────────────────┴───────┐                   │
│  │           Next.js App Router (React RSC)           │                   │
│  │   Server Components + Client Components + Actions  │                   │
│  └──────────────────────┬────────────────────────────┘                   │
├─────────────────────────┼────────────────────────────────────────────────┤
│                   SERVER LAYER                                           │
│                                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐     │
│  │   Auth      │  │   Bracket  │  │   Voting   │  │  Subscription  │     │
│  │   Module    │  │   Engine   │  │   Engine   │  │  Gate Module   │     │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └───────┬────────┘     │
│        │               │               │                  │              │
│  ┌─────┴───────────────┴───────────────┴──────────────────┴──────┐       │
│  │              Data Access Layer (DAL) + Server Actions          │       │
│  └──────────────────────────┬────────────────────────────────────┘       │
├─────────────────────────────┼────────────────────────────────────────────┤
│                    DATA + SERVICES LAYER                                  │
│                                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐     │
│  │ Supabase │  │  Supabase    │  │  Stripe   │  │  Sports Data     │     │
│  │ Postgres │  │  Realtime    │  │  Billing  │  │  API (External)  │     │
│  │ + Auth   │  │  (WebSocket) │  │  API      │  │                  │     │
│  └──────────┘  └──────────────┘  └──────────┘  └──────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Teacher UI** | Dashboard, bracket creation/management, poll creation, analytics, account settings, subscription management | Next.js pages behind auth middleware; Server Components for data display, Client Components for interactive bracket builder |
| **Student UI** | Join via class code, vote on matchups/polls, view bracket state, leaderboard for predictive brackets | Minimal Next.js pages; no auth required; device fingerprint for identity; Client Components for real-time vote UX |
| **Landing / Marketing** | Public landing page, pricing, branding | Static Next.js pages with ISR; no auth |
| **Auth Module** | Teacher registration, login (email + social), session management, password reset | Supabase Auth with Google/Apple/Microsoft OAuth providers; JWT sessions in httpOnly cookies |
| **Bracket Engine** | Bracket CRUD, state machine (round advancement, bye handling, winner tracking), bracket type logic (single/double/predictive/round-robin) | Server Actions + Postgres stored procedures for state transitions; TypeScript state machine on server |
| **Voting Engine** | Vote collection, deduplication (one vote per device per matchup), vote tallying, ranked-choice tabulation | Server Actions with Supabase RLS; Realtime broadcast for live updates |
| **Subscription Gate Module** | Tier checking, feature gating, limit enforcement (bracket count, student count), upgrade prompts | Middleware + DAL checks; Stripe Customer Portal for management |
| **Data Access Layer (DAL)** | Centralized data queries with authorization checks, session verification, DTO shaping | Cached server functions following Next.js DAL pattern (verified in official docs) |
| **Supabase Postgres** | Primary data store: users, brackets, matchups, votes, polls, subscriptions, class sessions | PostgreSQL with Row Level Security policies; PostgREST for typed queries via Supabase client |
| **Supabase Realtime** | Live vote count updates, bracket state change broadcasts, student join notifications | WebSocket channels per class session; Broadcast for vote counts, Postgres Changes for bracket updates |
| **Stripe Billing** | Subscription creation, plan changes, payment processing, webhook handling for subscription events | Stripe Checkout + Customer Portal; webhooks sync subscription state to Supabase |
| **Sports Data API** | External tournament bracket data for NCAA, NBA, NHL, MLB | Scheduled cron fetches; cached in Supabase; teacher selects sport bracket to import |

## Recommended Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group: authentication pages
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (marketing)/              # Route group: public pages
│   │   ├── page.tsx              # Landing page
│   │   ├── pricing/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Route group: teacher dashboard (protected)
│   │   ├── layout.tsx            # Sidebar + header layout
│   │   ├── page.tsx              # Dashboard home
│   │   ├── brackets/
│   │   │   ├── page.tsx          # Bracket list
│   │   │   ├── new/page.tsx      # Create bracket
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Bracket detail/manage
│   │   │       └── live/page.tsx # Live voting view
│   │   ├── polls/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── settings/
│   │       ├── page.tsx          # Account settings
│   │       └── billing/page.tsx  # Subscription management
│   ├── join/                     # Student entry point
│   │   └── [code]/               # Class code route
│   │       ├── page.tsx          # Student voting interface
│   │       └── layout.tsx
│   ├── api/
│   │   └── webhooks/
│   │       └── stripe/route.ts   # Stripe webhook handler
│   ├── layout.tsx                # Root layout
│   └── middleware.ts             # Auth + subscription gate middleware
├── lib/                          # Shared utilities and core logic
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client
│   │   ├── admin.ts              # Service role client (webhooks)
│   │   └── middleware.ts         # Supabase auth middleware helper
│   ├── stripe/
│   │   ├── client.ts             # Stripe SDK initialization
│   │   ├── config.ts             # Price IDs, product config
│   │   └── webhooks.ts           # Webhook event handlers
│   ├── dal/                      # Data Access Layer
│   │   ├── auth.ts               # Session verification, user queries
│   │   ├── brackets.ts           # Bracket CRUD + state queries
│   │   ├── polls.ts              # Poll CRUD + vote queries
│   │   ├── votes.ts              # Vote submission + tallying
│   │   ├── subscriptions.ts      # Subscription status checks
│   │   └── sports.ts             # Sports data queries
│   ├── engine/                   # Domain logic (pure functions)
│   │   ├── bracket-state.ts      # Bracket state machine
│   │   ├── bracket-types/
│   │   │   ├── single-elimination.ts
│   │   │   ├── double-elimination.ts
│   │   │   ├── round-robin.ts
│   │   │   └── predictive.ts
│   │   ├── vote-counter.ts       # Vote tallying algorithms
│   │   ├── ranked-choice.ts      # Ranked-choice tabulation
│   │   ├── bye-assignment.ts     # Non-power-of-two handling
│   │   └── name-generator.ts     # Fun random name generation
│   ├── fingerprint/
│   │   ├── client.ts             # Browser fingerprint collection
│   │   └── server.ts             # Fingerprint validation/hashing
│   ├── constants/
│   │   ├── subscription-tiers.ts # Tier definitions + limits
│   │   └── sports-leagues.ts     # Supported leagues config
│   └── utils/
│       ├── validation.ts         # Zod schemas
│       └── helpers.ts            # Shared utilities
├── components/                   # React components
│   ├── ui/                       # Primitive UI components (shadcn/ui)
│   ├── bracket/                  # Bracket visualization components
│   │   ├── bracket-view.tsx      # Interactive bracket tree
│   │   ├── matchup-card.tsx      # Single matchup display
│   │   ├── bracket-builder.tsx   # Creation wizard
│   │   └── live-bracket.tsx      # Real-time bracket with vote counts
│   ├── poll/                     # Poll components
│   │   ├── poll-view.tsx
│   │   ├── poll-builder.tsx
│   │   └── ranked-poll.tsx
│   ├── voting/                   # Voting interface components
│   │   ├── vote-button.tsx
│   │   ├── vote-results.tsx      # Live results display
│   │   └── student-join.tsx      # Class code entry
│   ├── dashboard/                # Dashboard layout components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── stat-cards.tsx
│   ├── subscription/             # Billing/gate components
│   │   ├── upgrade-prompt.tsx
│   │   ├── pricing-cards.tsx
│   │   └── feature-gate.tsx      # Wrapper that checks tier
│   └── analytics/                # Analytics components
│       ├── chart.tsx
│       └── export-button.tsx
├── actions/                      # Server Actions (mutations)
│   ├── auth.ts                   # Login, signup, logout
│   ├── brackets.ts               # Create, advance, delete brackets
│   ├── polls.ts                  # Create, close polls
│   ├── votes.ts                  # Submit vote
│   ├── subscriptions.ts          # Manage subscription
│   └── sports.ts                 # Import sports bracket
├── hooks/                        # Custom React hooks
│   ├── use-realtime-votes.ts     # Subscribe to live vote counts
│   ├── use-bracket-state.ts      # Bracket state subscription
│   ├── use-fingerprint.ts        # Device fingerprint hook
│   └── use-subscription.ts       # Current tier + limits
└── types/                        # TypeScript types
    ├── database.ts               # Generated Supabase types
    ├── bracket.ts                # Bracket domain types
    ├── poll.ts                   # Poll domain types
    ├── vote.ts                   # Vote types
    └── subscription.ts           # Subscription tier types
```

### Structure Rationale

- **`app/` route groups:** `(auth)`, `(marketing)`, `(dashboard)` use Next.js route groups to share layouts without affecting URL paths. The dashboard layout includes sidebar/header; marketing layout has a public navbar. This is a verified Next.js App Router pattern (see Sources).
- **`lib/dal/`:** Centralized Data Access Layer is the recommended Next.js pattern for authorization-checked data fetching. Every database query goes through the DAL, which verifies sessions and applies business rules. This prevents authorization bypass at the component level (verified in Next.js auth docs).
- **`lib/engine/`:** Pure TypeScript functions for bracket state machine logic, vote counting, and name generation. No framework dependencies. Testable in isolation. This separation keeps domain logic independent of the web framework.
- **`actions/`:** Server Actions are the Next.js-recommended pattern for mutations (verified). Separated from DAL because actions handle form validation and call DAL functions for data access.
- **`components/bracket/`:** Bracket visualization is the most complex UI. Isolating it allows iterative development of the visual bracket tree independent of data fetching.
- **`lib/fingerprint/`:** Client-side collection separated from server-side validation/hashing. The client collects signals; the server hashes and stores. This split keeps fingerprint logic auditable and the hashing server-side for consistency.

## Architectural Patterns

### Pattern 1: Bracket State Machine

**What:** Model each bracket as an explicit state machine with well-defined transitions. The bracket progresses through states: `DRAFT` -> `OPEN` (accepting votes) -> `ROUND_ADVANCING` -> `OPEN` (next round) -> `COMPLETED`. Each matchup within a bracket also has states: `PENDING` -> `VOTING` -> `DECIDED`.

**When to use:** All bracket types. The state machine prevents invalid transitions (e.g., advancing a round before all matchups are decided) and makes the system predictable.

**Trade-offs:** More upfront design work, but prevents an entire class of bugs where bracket state becomes inconsistent. Worth it for the complexity of double-elimination and predictive brackets.

**Example:**
```typescript
// lib/engine/bracket-state.ts

type BracketStatus = 'DRAFT' | 'ACTIVE' | 'ROUND_ADVANCING' | 'COMPLETED' | 'ARCHIVED';
type MatchupStatus = 'PENDING' | 'VOTING' | 'DECIDED' | 'BYE';

interface BracketTransition {
  from: BracketStatus;
  to: BracketStatus;
  guard: (bracket: Bracket) => boolean;
  effect: (bracket: Bracket) => BracketUpdate;
}

const transitions: BracketTransition[] = [
  {
    from: 'DRAFT',
    to: 'ACTIVE',
    guard: (b) => b.entrants.length >= 2 && b.matchups.length > 0,
    effect: (b) => ({ ...b, currentRound: 1, openedAt: new Date() }),
  },
  {
    from: 'ACTIVE',
    to: 'ROUND_ADVANCING',
    guard: (b) => b.currentRoundMatchups.every(m => m.status === 'DECIDED'),
    effect: (b) => advanceToNextRound(b),
  },
  {
    from: 'ROUND_ADVANCING',
    to: 'ACTIVE',
    guard: (b) => b.nextRoundMatchups.length > 0,
    effect: (b) => openNextRoundVoting(b),
  },
  {
    from: 'ROUND_ADVANCING',
    to: 'COMPLETED',
    guard: (b) => b.nextRoundMatchups.length === 0, // Final decided
    effect: (b) => ({ ...b, winner: b.finalMatchup.winner, completedAt: new Date() }),
  },
];

function transitionBracket(bracket: Bracket, targetStatus: BracketStatus): BracketUpdate {
  const transition = transitions.find(
    t => t.from === bracket.status && t.to === targetStatus
  );
  if (!transition) throw new InvalidTransitionError(bracket.status, targetStatus);
  if (!transition.guard(bracket)) throw new GuardFailedError(bracket.status, targetStatus);
  return transition.effect(bracket);
}
```

### Pattern 2: Real-Time Vote Broadcasting with Optimistic Updates

**What:** When a student votes, the UI immediately shows their vote (optimistic update), then the server validates, persists, and broadcasts the updated tally to all connected clients via Supabase Realtime. Teachers see live vote counts update without polling.

**When to use:** All voting interactions (bracket matchups and polls).

**Trade-offs:** Optimistic updates create a small window where the local UI shows unconfirmed state. For voting, this is acceptable because the user experience of instant feedback far outweighs the rare case of a vote failing validation.

**Example:**
```typescript
// hooks/use-realtime-votes.ts (Client Component hook)
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRealtimeVotes(matchupId: string) {
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to broadcast channel for this matchup
    const channel = supabase
      .channel(`matchup:${matchupId}`)
      .on('broadcast', { event: 'vote_update' }, (payload) => {
        setVoteCounts(payload.payload.counts);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchupId, supabase]);

  return voteCounts;
}

// actions/votes.ts (Server Action)
'use server';

export async function submitVote(matchupId: string, entrantId: string, fingerprint: string) {
  const supabase = await createServerClient();

  // 1. Validate: one vote per device per matchup
  const existing = await supabase
    .from('votes')
    .select('id')
    .eq('matchup_id', matchupId)
    .eq('device_fingerprint', fingerprint)
    .single();

  if (existing.data) {
    return { error: 'Already voted on this matchup' };
  }

  // 2. Insert vote
  await supabase.from('votes').insert({
    matchup_id: matchupId,
    entrant_id: entrantId,
    device_fingerprint: fingerprint,
  });

  // 3. Get updated counts and broadcast
  const counts = await getMatchupVoteCounts(matchupId);
  await supabase.channel(`matchup:${matchupId}`).send({
    type: 'broadcast',
    event: 'vote_update',
    payload: { counts },
  });

  return { success: true };
}
```

### Pattern 3: Anonymous Device Identity via Composite Fingerprinting

**What:** Students do not create accounts. Instead, a composite browser fingerprint is generated client-side from multiple signals, then hashed server-side to create a stable device identifier. This identifier is paired with the class code to create a unique "student session" for a specific class activity.

**When to use:** All student interactions. The fingerprint gates duplicate vote prevention and session continuity (student can close and reopen browser, return to same session).

**Trade-offs:** Device fingerprinting is inherently imprecise. Identical school-issued devices reduce fingerprint entropy. The architecture must combine many signals and accept that some collisions may occur. Using class code + fingerprint + session timestamp as a composite key reduces collision risk to acceptable levels for a classroom of 30-40 students.

**Signals to combine (per PROJECT.md constraint about identical hardware):**
- Canvas fingerprint (rendering differences)
- WebGL renderer string
- AudioContext fingerprint
- Screen resolution + color depth
- Timezone + language
- Installed fonts (via canvas measurement)
- Hardware concurrency (CPU cores)
- Device memory
- Touch support characteristics
- Browser-specific quirks (user agent is unreliable alone)

**Example:**
```typescript
// lib/fingerprint/client.ts
export async function collectFingerprint(): Promise<FingerprintSignals> {
  const [canvas, webgl, audio, fonts] = await Promise.all([
    getCanvasFingerprint(),
    getWebGLFingerprint(),
    getAudioFingerprint(),
    getFontFingerprint(),
  ]);

  return {
    canvas,
    webgl,
    audio,
    fonts,
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
    touchPoints: navigator.maxTouchPoints,
    platform: navigator.platform,
  };
}

// lib/fingerprint/server.ts
import { createHash } from 'crypto';

export function hashFingerprint(signals: FingerprintSignals): string {
  const normalized = JSON.stringify(signals, Object.keys(signals).sort());
  return createHash('sha256').update(normalized).digest('hex');
}
```

**Confidence note:** The FingerprintJS open-source library (v4+) is a well-known option for this. It handles many of these signals automatically. However, for school-issued identical devices, a custom implementation may be needed to weight signals that actually differ across those devices (canvas rendering quirks, WebGL specifics). This needs validation during implementation -- LOW confidence on fingerprint uniqueness rates for identical Chromebooks.

### Pattern 4: Subscription Feature Gating (Middleware + Component + DAL)

**What:** Feature gating is enforced at three levels: (1) Next.js Middleware redirects for route-level gating, (2) Component-level gates that show upgrade prompts, and (3) DAL-level checks that reject operations that exceed tier limits. This defense-in-depth approach prevents bypass.

**When to use:** Any feature or limit that differs between Free / Pro / Pro Plus tiers.

**Trade-offs:** Three layers of checking adds some complexity, but is necessary because client-side gating alone can be bypassed, and server-side-only gating creates poor UX (user navigates to a page only to get an error).

**Example:**
```typescript
// lib/constants/subscription-tiers.ts
export const TIER_LIMITS = {
  free: {
    maxBrackets: 3,
    maxEntrantsPerBracket: 16,
    bracketTypes: ['single_elimination'] as const,
    pollTypes: ['simple'] as const,
    analytics: false,
    sportsIntegration: false,
    csvUpload: false,
    liveEventMode: false,
  },
  pro: {
    maxBrackets: 25,
    maxEntrantsPerBracket: 64,
    bracketTypes: ['single_elimination', 'double_elimination', 'round_robin'] as const,
    pollTypes: ['simple', 'ranked'] as const,
    analytics: true,
    sportsIntegration: false,
    csvUpload: true,
    liveEventMode: true,
  },
  pro_plus: {
    maxBrackets: Infinity,
    maxEntrantsPerBracket: 128,
    bracketTypes: ['single_elimination', 'double_elimination', 'round_robin', 'predictive'] as const,
    pollTypes: ['simple', 'ranked'] as const,
    analytics: true,
    sportsIntegration: true,
    csvUpload: true,
    liveEventMode: true,
  },
} as const;

// components/subscription/feature-gate.tsx
'use client';

interface FeatureGateProps {
  feature: keyof typeof TIER_LIMITS.free;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { tier } = useSubscription();
  const limits = TIER_LIMITS[tier];

  if (!limits[feature]) {
    return fallback ?? <UpgradePrompt feature={feature} />;
  }

  return <>{children}</>;
}
```

### Pattern 5: Sports Data Integration via Cached Import Pipeline

**What:** Sports data is fetched from an external API on a scheduled basis (cron job or Supabase Edge Function on a timer), normalized into a standard format, and cached in Supabase. Teachers browse available sport tournaments and "import" one as a bracket template. This decouples the real-time classroom experience from external API availability and rate limits.

**When to use:** Sports bracket feature (Pro Plus tier).

**Trade-offs:** Data may be slightly stale (minutes to hours depending on cron frequency). Acceptable because classroom use does not require live game scores -- teachers need bracket structure and results after games conclude.

**Data flow:**
```
External Sports API  --(cron/scheduled fetch)-->  Supabase (sports_cache table)
                                                         |
Teacher Dashboard  --(browse cached tournaments)-->  Import as Bracket Template
                                                         |
                                                  New bracket with real teams/seeds
```

## Data Flow

### Request Flow: Student Votes on a Matchup

```
Student Device
    │
    ├─ [1] Browser collects fingerprint signals
    │       (canvas, webgl, audio, fonts, screen, timezone...)
    │
    ├─ [2] Student taps vote button (Client Component)
    │       Optimistic update: UI shows vote immediately
    │
    ├─ [3] Server Action: submitVote(matchupId, entrantId, fingerprint)
    │       │
    │       ├─ [3a] Hash fingerprint server-side
    │       ├─ [3b] Check: has this fingerprint voted on this matchup?
    │       │         YES → return error (deduplicate)
    │       │         NO  → continue
    │       ├─ [3c] Check: is matchup in VOTING state?
    │       │         NO  → return error (matchup closed)
    │       ├─ [3d] INSERT vote into database
    │       ├─ [3e] Query updated vote counts for this matchup
    │       └─ [3f] Broadcast vote_update to Supabase Realtime channel
    │
    └─ [4] All connected clients receive broadcast
            ├─ Student devices: see updated vote counts
            └─ Teacher dashboard: live chart/counter updates
```

### Request Flow: Teacher Advances Bracket Round

```
Teacher Dashboard
    │
    ├─ [1] Teacher views bracket with all matchups decided
    │       Server Component fetches bracket state via DAL
    │
    ├─ [2] Teacher clicks "Advance Round" or "Pick Winner"
    │       │
    │       ├─ [2a] If vote-based: system auto-selects majority winner
    │       └─ [2b] If teacher-choice: teacher selects winner manually
    │
    ├─ [3] Server Action: advanceRound(bracketId, decisions[])
    │       │
    │       ├─ [3a] DAL: verify teacher owns this bracket
    │       ├─ [3b] DAL: verify teacher subscription allows this bracket type
    │       ├─ [3c] Engine: run state machine transition
    │       │         ACTIVE → ROUND_ADVANCING → ACTIVE (or COMPLETED)
    │       ├─ [3d] Update matchup statuses in database
    │       ├─ [3e] Create next round matchups (if not final)
    │       └─ [3f] Broadcast bracket_update to Realtime channel
    │
    └─ [4] Connected students see updated bracket
            New matchups appear for voting
```

### Request Flow: Student Joins Class Session

```
Student Device
    │
    ├─ [1] Student navigates to sparkvotedu.com/join/[CLASS_CODE]
    │       or enters class code on join page
    │
    ├─ [2] Next.js route: /join/[code]/page.tsx
    │       Server Component looks up active session by class code
    │       │
    │       ├─ NOT FOUND → Show "invalid code" page
    │       └─ FOUND → Continue
    │
    ├─ [3] Client Component: fingerprint collection + name assignment
    │       │
    │       ├─ [3a] Collect fingerprint signals
    │       ├─ [3b] Send to server to check for existing session
    │       │         EXISTING → Restore student session (same fun name)
    │       │         NEW      → Generate random fun name, create session
    │       └─ [3c] Store session token in cookie (no auth, just session ID)
    │
    └─ [4] Student sees active bracket/poll, can vote
            Subscribed to Realtime channel for live updates
```

### State Management Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT STATE                                │
│                                                                   │
│  Server Components (majority of UI)                              │
│  └── Data fetched at request time via DAL                        │
│      └── Cached with React cache() for deduplication             │
│                                                                   │
│  Client Components (interactive elements only)                   │
│  ├── Local state (useState) for form inputs, UI toggles          │
│  ├── useOptimistic for vote submission feedback                  │
│  ├── Supabase Realtime subscriptions for live data               │
│  │   └── useRealtimeVotes, useBracketState hooks                 │
│  └── SWR or React Query NOT needed (Realtime replaces polling)   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                      SERVER STATE                                │
│                                                                   │
│  Supabase Postgres (source of truth)                             │
│  ├── brackets, matchups, votes, polls, poll_responses            │
│  ├── users, subscriptions, class_sessions, student_sessions      │
│  └── sports_cache (external API data)                            │
│                                                                   │
│  Supabase Realtime (ephemeral state distribution)                │
│  ├── Channel per active bracket/poll session                     │
│  ├── Broadcast: vote count updates (fan-out to all clients)      │
│  └── Presence: (optional) show connected student count           │
│                                                                   │
│  Stripe (billing state -- synced via webhooks)                   │
│  └── subscription_status, current_period_end in Supabase         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Data Flows Summary

1. **Vote submission:** Student device -> Server Action (validate + persist) -> Broadcast to Realtime channel -> All connected clients update
2. **Bracket advancement:** Teacher action -> State machine transition -> DB update -> Realtime broadcast -> Students see new round
3. **Student join:** Class code lookup -> Fingerprint collection -> Session creation/restoration -> Realtime channel subscription
4. **Subscription check:** Middleware (optimistic route guard) -> DAL (authoritative tier check) -> Component (UI gating)
5. **Sports data:** Cron fetch -> Cache in DB -> Teacher browse -> Import as bracket template
6. **Stripe sync:** Stripe webhook -> API route -> Update subscription record in Supabase -> Next request picks up new tier

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **1 classroom (30 students)** | Default architecture handles this trivially. Single Supabase project. No optimization needed. Realtime handles 30 concurrent WebSocket connections easily. |
| **100 classrooms (3,000 students)** | Still within Supabase free/pro tier limits. Realtime channels are isolated per classroom, so load is distributed. Add database indexes on `votes(matchup_id, device_fingerprint)` and `class_sessions(code)`. Consider connection pooling via Supabase's built-in pgBouncer. |
| **1,000+ classrooms (30,000+ students)** | Supabase Realtime at this scale needs the Pro plan. Consider Edge Functions for vote processing to reduce latency. May need to partition vote counting (aggregate in batches rather than per-vote recount). Sports API caching becomes important to avoid rate limits. |
| **10,000+ classrooms** | Beyond initial product scope, but architecture supports it. Supabase scales horizontally. Consider read replicas for analytics queries. Vote broadcast can be optimized with debouncing (batch updates every 500ms instead of per-vote). |

### Scaling Priorities

1. **First bottleneck: Vote counting on hot matchups.** When 30+ students vote simultaneously on the same matchup, the "count all votes and broadcast" pattern could create a thundering herd. **Fix:** Debounce vote count broadcasts (accumulate for 300-500ms, then broadcast batch). Use Postgres `COUNT` aggregate rather than fetching all votes.

2. **Second bottleneck: Realtime channel connections.** Each student keeps an open WebSocket. **Fix:** This is handled well by Supabase Realtime's architecture (built on Phoenix/Elixir, designed for massive concurrent connections). Unlikely to be a real issue at classroom scale. If needed, downgrade from per-vote Realtime to polling at 2-second intervals for the teacher dashboard.

3. **Third bottleneck: Bracket state queries.** Complex bracket trees with many rounds create deep joins. **Fix:** Denormalize bracket state -- store the full bracket tree as a JSONB column alongside normalized matchup rows. Read the JSONB for display; update normalized rows for voting. Sync with a database trigger.

## Anti-Patterns

### Anti-Pattern 1: Client-Side Bracket State Machine

**What people do:** Put bracket advancement logic in React state, computing next-round matchups on the client and sending the result to the server.

**Why it's wrong:** Race conditions when teacher and students are interacting simultaneously. Client state can diverge from server state. A browser refresh loses all computed state. Multiple teacher devices could advance differently.

**Do this instead:** All bracket state transitions happen server-side in Server Actions. The client displays what the server provides. The bracket state machine runs exclusively in `lib/engine/` called by Server Actions, never in React components.

### Anti-Pattern 2: Polling for Real-Time Updates

**What people do:** Use `setInterval` + fetch to check for new votes every N seconds.

**Why it's wrong:** Creates unnecessary server load proportional to connected clients. Updates are delayed by the polling interval. Wastes bandwidth when nothing has changed.

**Do this instead:** Use Supabase Realtime broadcast channels. Zero server load when nothing happens. Instant updates when votes arrive. Much better UX for the teacher's live dashboard.

### Anti-Pattern 3: Storing Subscription Tier in JWT/Cookie Only

**What people do:** Put the subscription tier in the session token and only check the token, never the database.

**Why it's wrong:** When a user upgrades or downgrades, the token still contains the old tier until it expires or the user logs out. This creates a window where the user has the wrong access level.

**Do this instead:** Use the token for optimistic checks (middleware, quick UI decisions) but always verify against the database in the DAL for authoritative decisions. Stripe webhooks update the database immediately. The middleware check just prevents obviously unauthorized navigation.

### Anti-Pattern 4: One-Size-Fits-All Bracket Data Model

**What people do:** Use a single database table/schema for all bracket types (single-elim, double-elim, round-robin, predictive).

**Why it's wrong:** These bracket types have fundamentally different structures. Double-elimination has a losers bracket. Round-robin has a group stage with no elimination. Predictive brackets need to track predictions separate from results. Forcing them into one schema creates complexity and bugs.

**Do this instead:** Use a base `brackets` table for shared fields (name, type, owner, status, class_code) and type-specific tables or JSONB columns for type-specific data. The bracket engine in `lib/engine/bracket-types/` has separate implementations for each type, sharing a common interface.

### Anti-Pattern 5: Fingerprint as Primary Key

**What people do:** Use the raw device fingerprint as the student's primary identifier across all sessions.

**Why it's wrong:** Fingerprints can change (browser updates, settings changes). Fingerprints can collide on identical hardware. Using it as a primary key makes the system fragile.

**Do this instead:** Use fingerprint as ONE input to a composite identity: `hash(fingerprint + class_code + session_id)`. The fingerprint disambiguates devices within a class session; it is not a global identity. Store a generated `student_session_id` (UUID) as the actual foreign key for votes.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Supabase Auth** | OAuth providers (Google, Apple, Microsoft) + email/password. Supabase JS client handles token refresh. Server-side session via `getUser()`. | Teachers only. Students have no auth. Supabase Auth integrates with RLS policies for row-level data isolation. |
| **Supabase Realtime** | WebSocket channels per active classroom session. Broadcast for vote updates. Optionally Presence for student count. | Channel naming: `class:{classCode}:bracket:{bracketId}` for scoped subscriptions. Clean up channels when sessions end. |
| **Stripe** | Checkout Sessions for initial subscription. Customer Portal for management. Webhooks for subscription lifecycle events (`customer.subscription.created`, `updated`, `deleted`). | Webhook handler in `/api/webhooks/stripe/route.ts`. Verify webhook signature. Sync to `subscriptions` table in Supabase. |
| **Sports Data API** | REST API calls from Supabase Edge Function or Next.js cron route. Fetch tournament brackets for configured leagues. Cache responses in `sports_cache` table. | Provider TBD (SportsDataIO, ESPN API, or similar). Rate limits apply -- cache aggressively. Normalize different API formats into a standard bracket structure. **LOW confidence on specific provider -- needs implementation-phase research.** |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Client Components <-> Server Actions** | React form actions + `useActionState`. Client calls server via form submission or `startTransition`. | Server Actions are the mutation boundary. All writes go through actions. |
| **Server Actions <-> DAL** | Direct function calls. Actions import DAL functions. | DAL functions enforce authorization. Actions handle validation and call DAL. |
| **DAL <-> Supabase** | Supabase JS client (`@supabase/ssr` for server-side). Typed queries using generated types. | RLS policies provide database-level security. DAL adds application-level business rules. |
| **Engine <-> DAL** | DAL fetches data, passes to engine for computation, writes results back. | Engine functions are pure -- they take data in and return results. No database access inside engine. |
| **Stripe Webhooks <-> Supabase** | API route receives webhook, validates, updates Supabase via admin client. | Webhook handler uses Supabase service role key (admin access) to update subscription records regardless of user session. |
| **Student UI <-> Teacher UI** | No direct communication. Both subscribe to same Realtime channels. Server is the intermediary. | Student votes -> Server -> Broadcast -> Teacher dashboard. Teacher advances -> Server -> Broadcast -> Student bracket view. |

## Build Order (Dependency Analysis)

The following build order reflects architectural dependencies -- each phase depends on components from previous phases.

```
Phase 1: Foundation
├── Next.js project setup + Supabase project
├── Database schema (core tables: users, brackets, matchups, votes)
├── Supabase Auth integration (teacher accounts)
├── Basic DAL structure
└── UI component library setup (shadcn/ui)
    │
    ▼
Phase 2: Core Bracket + Voting
├── Bracket engine (single-elimination first -- simplest type)
├── Bracket creation wizard (teacher UI)
├── Bracket visualization component
├── Student join flow (class code entry)
├── Device fingerprinting (basic implementation)
├── Vote submission (Server Action + deduplication)
└── Teacher bracket management (advance rounds)
    │  DEPENDS ON: Auth, DB schema, DAL
    │
    ▼
Phase 3: Real-Time + Polls
├── Supabase Realtime integration (live vote counts)
├── Live dashboard for teachers
├── Poll creation and voting (simpler than brackets)
├── Ranked-choice poll tabulation
└── Student session persistence (return to same session)
    │  DEPENDS ON: Voting engine, fingerprinting
    │
    ▼
Phase 4: Subscription + Gating
├── Stripe integration (Checkout, Portal, Webhooks)
├── Subscription state sync (webhooks -> Supabase)
├── Feature gating (middleware + component + DAL)
├── Pricing page
└── Upgrade prompts in UI
    │  DEPENDS ON: Auth (user identity for Stripe Customer)
    │
    ▼
Phase 5: Advanced Brackets + Sports
├── Double-elimination bracket engine
├── Round-robin bracket engine
├── Predictive bracket engine + leaderboard
├── Non-power-of-two bye assignment
├── Sports API integration (external data import)
├── Live Event mode (timed rounds)
└── CSV upload for entrants
    │  DEPENDS ON: Base bracket engine, subscription gating
    │
    ▼
Phase 6: Analytics + Polish
├── Analytics dashboard (participation stats, vote history)
├── CSV/data export
├── Landing page + marketing site
├── Performance optimization
└── Error handling + edge cases
    DEPENDS ON: All core features complete
```

**Build order rationale:**
- **Auth before brackets** because brackets are owned by teachers (foreign key dependency)
- **Single-elimination before other types** because it is the simplest bracket type and proves the state machine pattern
- **Voting before real-time** because real-time displays vote data that must exist first
- **Subscription gating after core features** because you need features to gate (and can develop faster without tier checks initially)
- **Advanced brackets after subscription** because they are gated features (Pro/Pro Plus only)
- **Analytics last** because it reads data produced by all other features

## Database Schema Sketch

This is a high-level schema to inform architecture decisions. Detailed schema design happens during implementation.

```
users
├── id (UUID, PK)
├── email
├── name
├── avatar_url
├── subscription_tier (free/pro/pro_plus)
├── stripe_customer_id
└── created_at

brackets
├── id (UUID, PK)
├── owner_id (FK → users)
├── title
├── type (single_elim/double_elim/round_robin/predictive)
├── status (draft/active/completed/archived)
├── class_code (unique, 6-char)
├── current_round
├── settings (JSONB — type-specific config)
├── entrants (JSONB — ordered list of entrant objects)
└── created_at

matchups
├── id (UUID, PK)
├── bracket_id (FK → brackets)
├── round_number
├── position (order within round)
├── entrant_a_id
├── entrant_b_id
├── winner_id (nullable)
├── status (pending/voting/decided/bye)
├── decided_by (vote/teacher_choice)
└── created_at

votes
├── id (UUID, PK)
├── matchup_id (FK → matchups)
├── entrant_id (voted for)
├── device_fingerprint (hashed)
├── student_session_id (FK → student_sessions)
└── created_at
-- UNIQUE(matchup_id, device_fingerprint) enforces one vote per device

student_sessions
├── id (UUID, PK)
├── class_code
├── device_fingerprint (hashed)
├── display_name (fun random name)
├── joined_at
└── last_active_at

polls
├── id (UUID, PK)
├── owner_id (FK → users)
├── title
├── type (simple/ranked)
├── class_code
├── status (draft/active/closed)
├── options (JSONB — array of option objects)
└── created_at

poll_responses
├── id (UUID, PK)
├── poll_id (FK → polls)
├── device_fingerprint
├── student_session_id
├── response (JSONB — single choice or ranked array)
└── created_at

subscriptions
├── id (UUID, PK)
├── user_id (FK → users)
├── stripe_subscription_id
├── stripe_price_id
├── status (active/canceled/past_due)
├── current_period_end
└── updated_at

sports_cache
├── id (UUID, PK)
├── league (ncaa_basketball/nba/nhl/mlb)
├── season
├── tournament_name
├── bracket_data (JSONB — normalized bracket structure)
├── fetched_at
└── expires_at
```

## Sources

- **Next.js App Router Architecture:** Verified via official Next.js documentation (https://nextjs.org/docs/app/building-your-application/routing) -- file-system routing, route groups, layouts, dynamic segments. HIGH confidence.
- **Next.js Data Fetching Patterns:** Verified via official docs (https://nextjs.org/docs/app/building-your-application/data-fetching) -- Server Components, streaming, Suspense, React cache(). HIGH confidence.
- **Next.js Server Actions:** Verified via official docs (https://nextjs.org/docs/app/api-reference/functions/server-actions) -- form handling, validation with Zod, useActionState, optimistic updates. HIGH confidence.
- **Next.js Authentication Patterns:** Verified via official docs (https://nextjs.org/docs/app/building-your-application/authentication) -- DAL pattern, middleware auth, RBAC, session management. HIGH confidence.
- **Next.js Deployment:** Verified via official docs (https://nextjs.org/docs/app/building-your-application/deploying) -- Node.js server, Docker, Vercel, other platforms. HIGH confidence.
- **Supabase Realtime (Broadcast, Presence, Postgres Changes):** Based on training knowledge of Supabase Realtime features. WebSocket-based real-time with channel subscriptions, broadcast for fan-out messaging, presence for tracking connected users. MEDIUM confidence (could not verify via WebFetch; patterns are well-established from training data).
- **Supabase Auth + RLS:** Based on training knowledge. OAuth providers, JWT sessions, Row Level Security for database-level authorization. MEDIUM confidence.
- **Stripe Subscriptions + Webhooks:** Based on training knowledge. Checkout Sessions, Customer Portal, webhook-driven state sync. Well-established patterns. MEDIUM confidence.
- **Device Fingerprinting:** Based on training knowledge of FingerprintJS and browser fingerprinting techniques. The challenge of identical school hardware is a known problem in EdTech. LOW-MEDIUM confidence (fingerprint uniqueness on identical Chromebooks needs real-world testing).
- **Sports Data APIs:** Based on training knowledge of SportsDataIO, ESPN API, and similar providers. Provider selection and data format need implementation-phase research. LOW confidence.
- **Bracket State Machine Pattern:** Based on general software engineering knowledge of state machines applied to tournament brackets. The pattern is well-established in game/tournament software. MEDIUM confidence.

---
*Architecture research for: EdTech real-time classroom polling and tournament bracket system*
*Researched: 2026-01-28*
