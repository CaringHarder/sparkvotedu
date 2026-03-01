# Architecture Research: v2.0 Teacher Power-Ups

**Domain:** Integration architecture for teacher activity controls, quick-create brackets, and UX polish
**Researched:** 2026-02-28
**Confidence:** HIGH (direct codebase analysis of 80,750 LOC across 564 files)

---

## Current Architecture Snapshot

SparkVotEDU uses a layered architecture with clean separation. Every new v2.0 feature integrates into this existing flow:

```
TEACHER BROWSER                              STUDENT BROWSER
  LiveDashboard / PollLiveClient               ActivityGrid / Bracket/Poll pages
         |                                              |
  +----- Client Components ------+            +---- Client Components ----+
  | RoundAdvancementControls     |            | SimpleVotingView          |
  | ParticipationSidebar         |            | AdvancedVotingView        |
  | VoteProgressBar              |            | SimplePollVote            |
  | PollResults                  |            | ActivityCard              |
  +------------------------------+            +---------------------------+
         |                                              |
  +----- Realtime Hooks ---------+            +---- Realtime Hooks -------+
  | useRealtimeBracket()         |            | useRealtimeBracket()      |
  | useRealtimePoll()            |            | useRealtimeActivities()   |
  | useSessionPresence()         |            | useRealtimePoll()         |
  +------------------------------+            +---------------------------+
         |                                              |
         +---------- Supabase Realtime WebSocket -------+
                     (with HTTP polling fallback)
                              |
                  +-----------+-----------+
                  |                       |
           bracket:{id}            activities:{sessionId}
           poll:{id}               (session-wide channel)
           (activity-specific       Event: activity_update
            channels)               Event: participant_joined
           Event: vote_update
           Event: bracket_update
           Event: poll_vote_update
           Event: poll_update

                              |
                    Server Actions
                  (src/actions/*.ts)
                  Auth -> Validate -> DAL -> Broadcast -> Revalidate
                              |
                    Data Access Layer
                  (src/lib/dal/*.ts)
                  Prisma queries, ownership checks
                              |
                    Bracket Engine
                  (src/lib/bracket/*.ts)
                  Advancement, matchup generation, byes
                              |
                    PostgreSQL via Prisma v7
                  (Supabase hosted, RLS deny-all)
```

### Key Architectural Patterns Already Established

| Pattern | Where Used | Implication for v2.0 |
|---------|-----------|----------------------|
| Forward-only status transitions | `VALID_TRANSITIONS` in DAL bracket/poll | Must expand transition maps for pause/resume/reopen |
| Server action → DAL → Broadcast | Every mutation in `src/actions/` | New actions follow same Auth → Validate → DAL → Broadcast → Revalidate |
| Dual-channel broadcast | `broadcastActivityUpdate` + `broadcastBracketUpdate` | Pause/resume must notify both channels |
| Transport fallback | `useRealtimeBracket`, `useRealtimePoll` | Pause state must be included in polling API responses |
| Ownership enforcement via teacherId | Every DAL function | New DAL functions follow same pattern |
| `useEffect` prop sync for client state | Bracket/poll cards after `router.refresh()` | New status values need same sync pattern |

---

## Feature-by-Feature Integration Analysis

### 1. Pause/Resume Brackets and Polls

**Status model change -- the core decision:**

The current bracket status flow is:
```
draft → active → completed → archived
```

Adding `paused` requires a bidirectional transition between `active` and `paused`. This is the only backward transition for brackets (polls already have `closed → draft`).

**Recommended approach: Add `paused` status value, no schema migration needed.**

The `status` field is already a `String` type (not an enum), so no Prisma migration is required. The change is purely in the transition validation maps.

#### Modified Files

| Layer | File | Change |
|-------|------|--------|
| DAL | `src/lib/dal/bracket.ts` | Add `paused` to `VALID_TRANSITIONS`: `active → ['paused', 'completed', 'archived']`, `paused → ['active', 'completed', 'archived']` |
| DAL | `src/lib/dal/poll.ts` | Add `paused` to `VALID_POLL_TRANSITIONS`: `active → ['paused', 'closed', 'archived']`, `paused → ['active', 'closed', 'archived']` |
| Broadcast | `src/lib/realtime/broadcast.ts` | Add `BracketUpdateType: 'bracket_paused' \| 'bracket_resumed'`, add `PollUpdateType: 'poll_paused' \| 'poll_resumed'` |
| Server Action | `src/actions/bracket.ts` | `updateBracketStatus` already handles any valid transition; add broadcast for paused/resumed events |
| Server Action | `src/actions/poll.ts` | `updatePollStatus` same -- add broadcast for paused/resumed |
| Live Dashboard | `src/components/teacher/live-dashboard.tsx` | Add Pause/Resume button in header (toggles between `active` ↔ `paused`) |
| Poll Live | `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | Add Pause/Resume button alongside existing Close Poll button |
| Bracket State API | `src/app/api/brackets/[bracketId]/state/route.ts` | Already returns `status` field -- no change needed, `paused` propagates automatically |
| Poll State API | `src/app/api/polls/[pollId]/state/route.ts` | Already returns `status` field -- same |
| Session Activities API | `src/app/api/sessions/[sessionId]/activities/route.ts` | Add `paused` to the status filter: `status: { in: ['active', 'paused', 'closed'] }` so paused activities still appear to students |

#### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `PausedOverlay` | `src/components/student/paused-overlay.tsx` | Full-screen overlay shown to students when activity is paused. Playful "needs to cook" message with cooking animation. Listens to realtime for resume event to auto-dismiss. |

#### Student-Side Behavior

When bracket/poll status is `paused`:
- Student voting pages show `PausedOverlay` component over the existing voting UI
- Activity cards in student grid show a "Paused" badge instead of "Active" pulse
- Vote submission server actions reject with "Activity is paused" if status is `paused` (add guard to `castPollVote` in poll.ts and `castVote` in vote.ts)
- When resumed, broadcast triggers `useRealtimeBracket`/`useRealtimePoll` refetch, overlay auto-dismisses

#### Data Flow

```
Teacher clicks "Pause"
  → updateBracketStatus({ bracketId, status: 'paused' })
    → DAL validates: active → paused (allowed)
    → Prisma update
    → broadcastBracketUpdate(bracketId, 'bracket_paused', {})
    → broadcastActivityUpdate(sessionId)  // student grid updates
    → revalidatePath
  ← Student: useRealtimeBracket receives bracket_update → refetch
    → PausedOverlay renders when status === 'paused'
  ← Student: useRealtimeActivities receives activity_update → refetch
    → ActivityCard shows "Paused" badge

Teacher clicks "Resume"
  → updateBracketStatus({ bracketId, status: 'active' })
    → DAL validates: paused → active (allowed)
    → broadcastBracketUpdate(bracketId, 'bracket_resumed', {})
    → broadcastActivityUpdate(sessionId)
  ← PausedOverlay auto-dismisses
```

---

### 2. Undo Round Advancement & Reopen Voting

**Already partially implemented.** The `undoAdvancement` server action and `undoMatchupAdvancement` engine function exist in `src/actions/bracket-advance.ts` and `src/lib/bracket/advancement.ts`. The `RoundAdvancementControls` component already has an undo button per decided matchup.

**What's new for v2.0:** Undo an entire round (batch undo), not just individual matchups. And reopen voting on a round that was closed.

#### Modified Files

| Layer | File | Change |
|-------|------|--------|
| Engine | `src/lib/bracket/advancement.ts` | Add `batchUndoRound(bracketId, round)`: iterates decided matchups in round, calls `undoMatchupAdvancement` for each in reverse position order. Must also clear winners from next-round matchups. |
| Server Action | `src/actions/bracket-advance.ts` | Add `batchUndoRound` server action following existing pattern |
| Component | `src/components/teacher/round-advancement-controls.tsx` | Add "Undo Round" button when all matchups in current round are decided. Already has per-matchup undo. |
| Live Dashboard | `src/components/teacher/live-dashboard.tsx` | Wire new batch undo action |

#### Key Constraint

The existing `undoMatchupAdvancement` already blocks undo if the next matchup has votes:
```typescript
if (voteCount > 0) {
  throw new Error('Cannot undo: next matchup already has votes')
}
```

This cascading guard must be respected in batch undo. If ANY next-round matchup has votes, the entire batch undo is blocked with a clear error message.

#### Round Robin Undo

Round Robin uses a different advancement path (`src/actions/round-robin.ts` → `src/lib/dal/round-robin.ts`). Undo for RR means clearing the `winnerId` on a matchup and setting status back to `voting`. Simpler than SE/DE because RR matchups don't propagate to next matchups via `nextMatchupId`.

---

### 3. Reopen Completed Brackets/Polls

**Status transition change:**

Currently:
- Brackets: `completed → archived` only
- Polls: `closed → archived` or `closed → draft`

Adding reopen means:
- Brackets: `completed → active` (reopen for more voting)
- Polls: `closed → active` (reopen for more voting, already partially possible via `closed → draft → active`)

#### Modified Files

| Layer | File | Change |
|-------|------|--------|
| DAL | `src/lib/dal/bracket.ts` | Add `completed → ['active', 'archived']` to VALID_TRANSITIONS |
| DAL | `src/lib/dal/poll.ts` | Add `closed → ['active', 'archived', 'draft']` (already has `closed → ['archived', 'draft']`, add `active`) |
| Server Action | `src/actions/bracket.ts` | `updateBracketStatus` handles transition; add reopen broadcast |
| Bracket Detail Page | `src/app/(dashboard)/brackets/[bracketId]/page.tsx` | Add "Reopen" button for completed brackets |
| Poll Live Client | `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | Already has close/reopen controls for polls; verify `closed → active` works |

#### Reopen Semantics for Brackets

When a completed bracket is reopened:
- Status goes back to `active`
- The last decided matchup(s) could optionally be re-opened for voting
- Simplest approach: status changes to `active`, teacher manually opens specific matchups for re-voting using existing "Open for Voting" controls
- This avoids complex "which matchups to reopen?" logic

#### Broadcast

```
Teacher clicks "Reopen" on completed bracket
  → updateBracketStatus({ bracketId, status: 'active' })
  → broadcastBracketUpdate(bracketId, 'voting_opened', {})
  → broadcastActivityUpdate(sessionId)
  ← Students: bracket reappears as active in activity grid
```

---

### 4. Quick Create for Brackets

**New component alongside existing BracketForm wizard.** The existing wizard is 3 steps (Info → Entrants → Review). Quick Create collapses this to a single panel.

#### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `BracketQuickCreate` | `src/components/bracket/bracket-quick-create.tsx` | Single-panel bracket creation: topic list chips + entrant count picker → create |

#### Integration Points

| Integration | How |
|-------------|-----|
| Routing | New page at `src/app/(dashboard)/brackets/new/page.tsx` -- add tab toggle between "Quick Create" and "Step-by-Step" (existing `BracketForm`) |
| Data source | Reuses existing `CURATED_TOPICS` from `src/lib/bracket/curated-topics.ts` |
| Creation action | Calls existing `createBracket` server action (same as wizard) |
| Feature gates | Same tier checks applied (bracket type, entrant count, total/draft limits) |
| Session assignment | Quick Create defaults to current active session (auto-assign) |
| Naming | Auto-generates bracket name from selected topic list name |

#### UX Flow

```
Teacher arrives at /brackets/new
  → Sees two tabs: "Quick Create" | "Step-by-Step"
  → Quick Create tab (default):
    1. Grid of topic list chips (from CURATED_TOPICS), searchable
    2. Teacher taps a topic chip → shows entrant count picker (4, 8, 16, custom)
    3. Teacher picks count → "Create Bracket" button
    4. createBracket() called with:
       - name: topic list name
       - bracketType: single_elimination (default)
       - size: selected count
       - entrants: first N from topic list
       - sessionId: current active session (if any)
    5. Redirect to bracket detail page
```

#### Existing Code Reuse

The `TopicPicker` component already handles topic selection and slicing to bracket size. Quick Create can either:
- (A) Compose `TopicPicker` directly with a size picker alongside
- (B) Build a new streamlined component that uses `CURATED_TOPICS` data directly

Recommendation: (B) -- build a new `BracketQuickCreate` component. The `TopicPicker` was designed for the wizard step flow with "Back" navigation. Quick Create should be a flat, chip-based layout with immediate feedback. Different UX goals warrant a separate component, but same data source.

---

### 5. Simplified Poll Quick Create

**Same pattern as bracket quick create -- simplified poll creation alongside existing step-by-step form.**

#### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `PollQuickCreate` | `src/components/poll/poll-quick-create.tsx` | Question + options input only. No description, no poll type toggle, no showLiveResults toggle. Defaults: simple poll, allowVoteChange=true, showLiveResults=false |

#### Integration Points

| Integration | How |
|-------------|-----|
| Routing | Add to existing poll creation page at `src/app/(dashboard)/polls/new/page.tsx` -- tab toggle between "Quick Create" and "Step-by-Step" |
| Creation action | Calls existing `createPoll` server action |
| Session assignment | Auto-assigns to current active session |
| Defaults | pollType: 'simple', allowVoteChange: true, showLiveResults: false, rankingDepth: null |

#### UX Flow

```
Teacher arrives at /polls/new
  → Quick Create tab (default):
    1. Text input: "What's your question?"
    2. Dynamic option inputs (2 minimum, + button to add more)
    3. "Create Poll" button
    4. createPoll() called with defaults
    5. Redirect to poll detail or live page
```

---

### 6. Real-Time Student Vote Indicators (Green Dots)

**Extends the ParticipationSidebar to show vote status across ALL activity types, not just the currently selected matchup.**

#### Current State

The `ParticipationSidebar` (src/components/teacher/participation-sidebar.tsx) already shows:
- Student tiles with green dots for "voted" (per selected matchup)
- Blue dots for "connected"
- Gray dots for "disconnected"

But it's **matchup-scoped**: only shows vote status for the currently selected matchup via `voterIds` prop.

#### Required Change

Add an **activity-level** vote indicator -- a green dot visible even without a matchup selected, showing "this student has voted on at least one active matchup in this bracket/poll."

#### Modified Files

| Layer | File | Change |
|-------|------|--------|
| Live Dashboard | `src/components/teacher/live-dashboard.tsx` | Compute `activityVoterIds` -- set of participant IDs who have voted on ANY active voting matchup. Pass to sidebar as new prop. |
| Participation Sidebar | `src/components/teacher/participation-sidebar.tsx` | New prop `activityVoterIds: Set<string>`. When no matchup selected, show green dot for students in this set. Label: "has voted" vs "hasn't voted yet". |
| Poll Live | `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | If the poll live dashboard has a participation sidebar (or add one), show green dots for students who have voted. |

#### Data Source for Activity-Level Voters

The bracket live dashboard already receives vote counts per matchup via `useRealtimeBracket`. Computing activity-level voters requires knowing WHICH participants voted, not just counts. Two options:

**(A) Extend the bracket state API** to return voter IDs per matchup (adds data to `/api/brackets/[bracketId]/state`). This leaks some info but is teacher-only.

**(B) Fetch voter IDs separately** via a new endpoint like `/api/brackets/[bracketId]/voters` that returns `Record<matchupId, participantId[]>`.

Recommendation: **(B)** -- separate endpoint, fetched by the live dashboard only (teacher-side). Keeps the state API lean for student polling fallback. The live dashboard periodically refetches this on vote_update events.

#### New Files

| File | Purpose |
|------|---------|
| `src/app/api/brackets/[bracketId]/voters/route.ts` | Returns voter participant IDs grouped by matchup. Teacher-only (auth required). |
| `src/lib/dal/vote.ts` (modify) | Add `getVotersByBracket(bracketId)` DAL function |

---

### 7. Edit Settings After Creation

**Display settings (viewingMode, showVoteCounts, showSeedNumbers, votingTimerSeconds) are already editable during live via `updateBracketVotingSettings` action.** The server action exists but the UI may not expose all settings.

#### Current State

`updateBracketVotingSettings` in `src/actions/bracket-advance.ts` already handles:
- `viewingMode` (simple/advanced)
- `showVoteCounts` (boolean)
- `showSeedNumbers` (boolean)
- `votingTimerSeconds` (number | null)

These are **display settings** that are safe to change during live.

#### What's New for v2.0

1. **Settings panel UI** -- a slide-out panel or modal on the live dashboard that exposes these toggles
2. **Poll settings editing** -- analogous toggles for polls (showLiveResults, allowVoteChange) during live
3. **Pre-creation settings editing** -- edit settings on a draft bracket/poll before going live

#### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `BracketSettingsPanel` | `src/components/teacher/bracket-settings-panel.tsx` | Slide-out panel on live dashboard showing display setting toggles. Calls `updateBracketVotingSettings`. |
| `PollSettingsPanel` | `src/components/teacher/poll-settings-panel.tsx` | Same for polls. New server action needed: `updatePollSettings`. |

#### Modified Files

| Layer | File | Change |
|-------|------|--------|
| Server Action | `src/actions/poll.ts` | Existing `updatePoll` already handles field updates. May need to allow during `active` status (currently no status guard). |
| DAL | `src/lib/dal/poll.ts` | `updatePollDAL` has no status restriction -- already works for active polls. |
| Live Dashboard | `src/components/teacher/live-dashboard.tsx` | Add settings gear icon that opens `BracketSettingsPanel` |
| Poll Live | `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | Add settings gear icon that opens `PollSettingsPanel` |

#### Broadcast on Settings Change

When display settings change during live, students should see the effect immediately:
- `viewingMode` change → broadcast needed so student bracket views switch between simple/advanced
- `showVoteCounts` change → broadcast needed so vote count display toggles
- `showLiveResults` change for polls → broadcast needed

The existing `updateBracketVotingSettings` action does `revalidatePath` but does NOT broadcast. **Add a broadcast** for settings changes:

```typescript
broadcastBracketUpdate(bracketId, 'settings_changed', {
  viewingMode, showVoteCounts, showSeedNumbers, votingTimerSeconds
})
```

Add `'settings_changed'` to `BracketUpdateType` in `src/lib/realtime/broadcast.ts`.

---

## Component Boundaries

### New Components Summary

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `PausedOverlay` | Student-facing pause message | `useRealtimeBracket` / `useRealtimePoll` for resume detection |
| `BracketQuickCreate` | Two-click bracket creation from topic chips | `createBracket` action, `CURATED_TOPICS` data |
| `PollQuickCreate` | Question + options only poll creation | `createPoll` action |
| `BracketSettingsPanel` | Live display settings toggles | `updateBracketVotingSettings` action |
| `PollSettingsPanel` | Live poll settings toggles | `updatePoll` action |

### Modified Components Summary

| Component | Modification |
|-----------|-------------|
| `ParticipationSidebar` | Add `activityVoterIds` prop for activity-level green dots |
| `RoundAdvancementControls` | Add "Undo Round" button for batch undo |
| `LiveDashboard` | Add Pause/Resume button, Settings gear, activity voter computation |
| `PollLiveClient` | Add Pause/Resume button, Settings gear |
| `ActivityCard` | Handle `paused` status display |

---

## Data Flow Changes

### New Broadcast Event Types

| Event Type | Channel | Trigger | Consumer |
|------------|---------|---------|----------|
| `bracket_paused` | `bracket:{id}` | Teacher pauses bracket | Student bracket views → show PausedOverlay |
| `bracket_resumed` | `bracket:{id}` | Teacher resumes bracket | Student bracket views → hide PausedOverlay |
| `poll_paused` | `poll:{id}` | Teacher pauses poll | Student poll views → show PausedOverlay |
| `poll_resumed` | `poll:{id}` | Teacher resumes poll | Student poll views → hide PausedOverlay |
| `settings_changed` | `bracket:{id}` | Teacher changes display settings | Student bracket views → update display |

All new events follow the existing fire-and-forget broadcast pattern via `broadcastMessage` in `src/lib/realtime/broadcast.ts`.

### New API Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/brackets/[bracketId]/voters` | GET | Voter participant IDs per matchup (for green dots) | Teacher only |

### Modified Transition Maps

**Bracket VALID_TRANSITIONS (src/lib/dal/bracket.ts):**
```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'completed', 'archived'],
  active: ['paused', 'completed', 'archived'],
  paused: ['active', 'completed', 'archived'],
  completed: ['active', 'archived'],  // 'active' = reopen
  archived: [],
}
```

**Poll VALID_POLL_TRANSITIONS (src/lib/dal/poll.ts):**
```typescript
const VALID_POLL_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'archived'],
  active: ['paused', 'closed', 'archived'],
  paused: ['active', 'closed', 'archived'],
  closed: ['active', 'archived', 'draft'],  // 'active' = reopen
  archived: [],
}
```

### Vote Guard for Paused Activities

Both vote server actions must check for paused status:

**Bracket votes** (`src/actions/vote.ts` → `castVote`): Add status check on the matchup's bracket.
**Poll votes** (`src/actions/poll.ts` → `castPollVote`): Currently checks `poll.status !== 'active'`. Since `paused` is not `active`, this guard already works for polls.

For bracket votes, verify the existing status check path. The vote action likely checks matchup status (`voting`) not bracket status. A paused bracket should also prevent votes, so add a bracket-level status check.

---

## Suggested Build Order

Dependencies and risk drive the ordering:

```
Phase 1: Status Infrastructure (foundation for everything)
  ├── Expand VALID_TRANSITIONS for bracket and poll
  ├── Add new broadcast event types
  ├── Add vote guards for paused status
  └── Dependency: None. Enables everything else.

Phase 2: Pause/Resume (highest teacher value, straightforward)
  ├── Teacher-side: Pause/Resume buttons on live dashboards
  ├── Student-side: PausedOverlay component
  ├── Student-side: ActivityCard paused badge
  └── Dependency: Phase 1 status infrastructure

Phase 3: Reopen Completed (builds on Phase 1 transitions)
  ├── Reopen button on completed bracket/poll detail pages
  ├── Broadcast on reopen
  └── Dependency: Phase 1 status infrastructure

Phase 4: Undo Round (batch undo, more complex engine work)
  ├── batchUndoRound engine function
  ├── batchUndoRound server action
  ├── "Undo Round" button in RoundAdvancementControls
  └── Dependency: Phase 1. Independent of Phases 2-3.

Phase 5: Quick Create Brackets (new UI, independent)
  ├── BracketQuickCreate component
  ├── Tab toggle on /brackets/new page
  └── Dependency: None. Purely additive.

Phase 6: Poll Quick Create (same pattern as Phase 5)
  ├── PollQuickCreate component
  ├── Tab toggle on /polls/new page
  └── Dependency: None. Purely additive.

Phase 7: Settings Editing (extends live dashboards)
  ├── BracketSettingsPanel component
  ├── PollSettingsPanel component + server action
  ├── Settings broadcast for live sync
  └── Dependency: None. Uses existing updateBracketVotingSettings.

Phase 8: Real-Time Vote Indicators (green dots)
  ├── New /api/brackets/[bracketId]/voters endpoint
  ├── getVotersByBracket DAL function
  ├── ParticipationSidebar activityVoterIds prop
  └── Dependency: None. Extends existing sidebar.

Phase 9: UX Polish & Bug Fixes
  ├── "View Live" → "Go Live" label change
  ├── Poll image options preview matching bracket style
  ├── Fix: duplicated poll retains removed options
  ├── Fix: 2-option poll centering
  ├── Fix: duplicate name flow suggests last initial
  └── Dependency: None. Independent fixes.
```

**Rationale for ordering:**
1. Status infrastructure is foundation -- must come first since pause/resume, reopen all depend on transition map changes
2. Pause/Resume is highest teacher value and tests the status infrastructure
3. Reopen is a small incremental step after pause/resume
4. Undo round is more complex engine work, benefits from stable status layer
5-6. Quick Create features are fully independent -- can be built in parallel
7. Settings editing is independent but benefits from having live dashboards stable
8. Green dots are enhancement-only, no blocking dependency
9. Bug fixes are independent and can be interspersed

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Adding Schema Migration for Status Values

**What people do:** Create a Prisma enum for bracket/poll status, requiring a migration for each new value.
**Why it's wrong:** The project intentionally uses `String` type for status fields (same rationale as `role` column). Adding `paused` requires NO migration.
**Do this instead:** Keep String type. Validate in DAL transition maps. Document valid values in code comments.

### Anti-Pattern 2: Complex Undo State Machine

**What people do:** Build a full event-sourcing system or undo stack to support arbitrary undo depth.
**Why it's wrong:** Classroom brackets are ephemeral. Teachers need "undo last round" not "undo to any point."
**Do this instead:** Simple batch undo for current round with cascading guard (block if next round has votes). Single-level undo only.

### Anti-Pattern 3: Separate Pause State vs Status Field

**What people do:** Add a `isPaused` boolean alongside `status` field, creating two sources of truth.
**Why it's wrong:** The status transition map becomes ambiguous. Is `active + isPaused` the same as `paused`?
**Do this instead:** Use `paused` as a first-class status value in the existing status field. One source of truth.

### Anti-Pattern 4: Broadcasting Full State on Settings Change

**What people do:** Send the entire bracket/poll object in the broadcast payload when settings change.
**Why it's wrong:** Broadcast payloads should be small. Students refetch on structural changes.
**Do this instead:** Send a `settings_changed` event with just the changed fields. Client-side hook does a targeted refetch.

### Anti-Pattern 5: Quick Create as Separate Route/Action

**What people do:** Create new server actions and DAL functions for quick-created brackets.
**Why it's wrong:** Quick create produces the same bracket structure. Duplicating logic causes drift.
**Do this instead:** Quick Create component calls the SAME `createBracket` server action. The component just pre-fills arguments from topic data.

---

## Scalability Considerations

| Concern | Current (classroom scale) | At scale (100+ concurrent sessions) |
|---------|--------------------------|--------------------------------------|
| Vote indicators (green dots) | Fetch voter IDs per matchup on demand | Add Redis caching or aggregate at broadcast time |
| Pause/resume broadcast | Single REST call per channel | No concern -- one broadcast per action |
| Batch undo transaction | Prisma $transaction, fine for 4-16 matchups | Transaction timeout at 30s handles large brackets |
| Quick Create | Same creation path, no new concerns | N/A |
| Settings broadcast | One broadcast per settings change | No concern -- infrequent action |

For classroom-scale usage (30 students, 1-5 teachers), none of these features introduce scalability bottlenecks. The existing transport fallback (WebSocket → HTTP polling) handles school network variability.

---

## Integration Points

### External Services

| Service | Integration | Impact from v2.0 |
|---------|-------------|------------------|
| Supabase Realtime | Broadcast API (REST) | 5 new event types, same broadcast pattern |
| Supabase PostgreSQL | Prisma queries | No schema changes, just new DAL functions |
| Stripe | Feature gates | Quick Create must respect same tier limits |
| Vercel | Deployment | No infrastructure changes |

### Internal Boundaries

| Boundary | Communication | v2.0 Impact |
|----------|---------------|-------------|
| Teacher UI ↔ Server Actions | Direct function calls (use server) | 2-3 new server actions |
| Server Actions ↔ DAL | Direct function imports | 3-5 new DAL functions |
| Server ↔ Client (realtime) | Supabase Broadcast | 5 new event types |
| Server ↔ Client (polling) | REST API routes | 1 new endpoint, existing routes unchanged |
| Bracket Engine ↔ DAL | Direct imports | 1 new function (batchUndoRound) |

---

## Sources

- Direct codebase analysis of 564 files, 80,750 LOC TypeScript
- `src/lib/dal/bracket.ts` -- bracket DAL with VALID_TRANSITIONS (lines 604-609)
- `src/lib/dal/poll.ts` -- poll DAL with VALID_POLL_TRANSITIONS (lines 4-9)
- `src/lib/realtime/broadcast.ts` -- broadcast infrastructure (185 lines)
- `src/lib/bracket/advancement.ts` -- undo engine (129 lines)
- `src/actions/bracket-advance.ts` -- server actions for advancement (333 lines)
- `src/components/teacher/participation-sidebar.tsx` -- student activity panel (175 lines)
- `src/components/teacher/live-dashboard.tsx` -- teacher live dashboard (~1200 lines)
- `src/components/bracket/bracket-form.tsx` -- creation wizard (step-by-step flow)
- `src/components/bracket/topic-picker.tsx` -- curated topic selection (187 lines)
- `prisma/schema.prisma` -- data model (286 lines, String status fields)

---
*Architecture research for: SparkVotEDU v2.0 Teacher Power-Ups*
*Researched: 2026-02-28*
