# Stack Research: v2.0 Teacher Power-Ups

**Domain:** EdTech classroom voting platform -- teacher controls, quick-create, UX polish
**Researched:** 2026-02-28
**Confidence:** HIGH (all recommendations verified against installed versions, existing codebase patterns, and current Radix/shadcn docs)

---

## Executive Summary

v2.0 requires **two new Radix UI packages** (switch, tabs) and **one optional package** (sonner for toast feedback). Everything else is achievable with the existing stack. The new features split into three categories:

1. **State machine extensions** (pause/resume, undo, reopen) -- require a Prisma migration to add `paused` status to brackets and polls, plus new broadcast event types. No new npm packages.
2. **Quick-create UX** (bracket topic chips, simplified poll) -- pure UI work using existing components plus new shadcn/ui Switch and Tabs primitives for settings toggles and creation mode switching.
3. **Real-time vote indicators** (green dots in Student Activity panel) -- extend existing broadcast + refetch pattern with a new `student_voted` event. No new packages.

The critical architectural insight: pause/resume is NOT a new status value. It is a boolean `pausedAt` timestamp column on both `brackets` and `polls` tables. This avoids breaking the existing `draft -> active -> completed` status machine while allowing pause/resume to work at any point during `active` status.

---

## Current Stack (Verified from package.json)

| Technology | Installed Version | Changes for v2.0 |
|------------|-------------------|-------------------|
| Next.js | 16.1.6 | No changes needed |
| React | 19.2.3 | No changes needed |
| Prisma | ^7.3.0 | Migration: add `paused_at` column to brackets + polls |
| @supabase/supabase-js | ^2.93.3 | New broadcast event types only |
| @radix-ui/react-dialog | ^1.1.15 | Already installed; used for undo confirmations |
| @radix-ui/react-dropdown-menu | ^2.1.16 | Already installed; no changes |
| Tailwind CSS | ^4 | No changes needed |
| motion (Framer Motion) | ^12.29.2 | No changes needed |
| lucide-react | ^0.563.0 | New icons: Pause, Play, Undo2, RotateCcw, Settings, Zap |
| Zod | ^4.3.6 | New validation schemas for settings updates |

---

## New Packages Required

### 1. @radix-ui/react-switch (for Settings Editing)

| Property | Value |
|----------|-------|
| Package | `@radix-ui/react-switch` |
| Version | `^1.2.6` |
| Purpose | Toggle controls for bracket/poll display settings (showVoteCounts, showSeedNumbers, showLiveResults, allowVoteChange) |
| Why | The settings editing feature needs toggle switches for boolean settings. Switch is the correct semantic control (not checkbox) for on/off display preferences. Already used by shadcn/ui `Switch` component wrapper. Matches existing Radix primitive pattern in the project. |

**Alternative considered:** Plain checkbox inputs or custom toggle buttons. Not recommended because Switch provides proper ARIA semantics for toggle controls, keyboard accessibility (Space to toggle), and consistent Radix animation patterns matching the existing dropdown-menu and dialog primitives.

### 2. @radix-ui/react-tabs (for Quick Create Mode Switching)

| Property | Value |
|----------|-------|
| Package | `@radix-ui/react-tabs` |
| Version | `^1.1.13` |
| Purpose | Switch between "Quick Create" and "Step-by-Step" creation modes for both brackets and polls |
| Why | The bracket creation form needs a clean toggle between Quick Create (topic chips + entrant count) and the existing Step-by-Step wizard. Tabs is the correct pattern for mutually exclusive content panels. Keyboard navigation (arrow keys), ARIA tablist/tab/tabpanel roles, and automatic activation are built in. |

**Alternative considered:** Custom button group with conditional rendering. Not recommended because Tabs provides correct accessibility semantics (tablist role, automatic focus management) that a custom solution would need to reimplement.

### 3. sonner (Optional -- for Action Feedback Toasts)

| Property | Value |
|----------|-------|
| Package | `sonner` |
| Version | `^2.0.7` |
| Purpose | Non-blocking success/error feedback for pause, resume, undo, reopen, and settings edit actions |
| Why | The v2.0 teacher controls (pause, undo, reopen, settings edit) are rapid-fire actions that need lightweight feedback without modal dialogs. Currently the app has no toast/notification system -- it uses either inline error text or Dialog modals. Toasts are the right pattern for confirmable-but-non-disruptive feedback ("Bracket paused", "Round 2 undone", "Settings saved"). shadcn/ui has a first-class `Sonner` component wrapper. |

**Alternative: Skip sonner, use inline feedback.** This is viable for MVP. The pause/resume button can show state change visually (icon swap + label change). Undo can show inline success text. Settings edit can show a checkmark. Toasts add polish but are not strictly required. **Recommendation: Add sonner.** The teacher will be performing many rapid actions in v2.0, and toast feedback is the standard pattern.

---

## What Does NOT Need New Packages

### Pause/Resume Controls
**Why no new package:** This is a database state change + broadcast event + UI button swap. The `pausedAt` timestamp column uses Prisma's existing `DateTime?` type. The student-facing "needs to cook" message is a conditional render in existing student voting components. The broadcast uses the existing `broadcastBracketUpdate` and `broadcastPollUpdate` functions with new event types (`bracket_paused`, `bracket_resumed`, `poll_paused`, `poll_resumed`).

### Undo Round Advancement / Reopen Voting
**Why no new package:** `undoMatchupAdvancement` already exists in `src/lib/bracket/advancement.ts`. Undo round is a batch version of existing undo logic. Reopen completed bracket/poll is a status transition (`completed` -> `active`) with vote cleanup. The existing `Dialog` component (`@radix-ui/react-dialog ^1.1.15`) handles undo confirmation dialogs using the established pattern in `delete-confirm-dialog.tsx`.

### Real-Time Student Vote Indicators (Green Dots)
**Why no new package:** The `ParticipationSidebar` already shows per-student vote status with green dots for a selected matchup. The v2.0 feature extends this to show "has voted on ANY active matchup" without requiring matchup selection. This is a query change in the activities API endpoint + a new broadcast event. The existing Supabase broadcast pattern handles it.

### Quick Create for Brackets
**Why no new package:** The `TopicPicker` component and `CURATED_TOPICS` data already exist. Quick Create is a new UI flow that: (1) shows topic list chips from `curated-topics.ts`, (2) lets teacher pick entrant count, (3) auto-creates bracket with defaults. All primitives (Button, Card, Badge, Input) exist.

### Simplified Poll Quick Create
**Why no new package:** The `POLL_TEMPLATES` data already exists in `src/lib/poll/templates.ts`. Simplified flow is: question input + options list, create with default settings. The existing `OptionList` component handles option management.

### Post-Creation Settings Editing
**Why no new package (besides Switch):** Settings editing is a form with the existing Dialog component as container, Input/Label for text fields, and the new Switch for boolean toggles. Zod validates the update payload. A new `updateBracketSettings` server action calls a new DAL function.

---

## Prisma Migration Plan

A single migration adds the `paused_at` column to both tables:

```sql
-- Add pause capability to brackets and polls
ALTER TABLE "brackets" ADD COLUMN "paused_at" TIMESTAMP(3);
ALTER TABLE "polls" ADD COLUMN "paused_at" TIMESTAMP(3);
```

**Schema additions:**

```prisma
model Bracket {
  // ... existing fields ...
  pausedAt  DateTime? @map("paused_at")
}

model Poll {
  // ... existing fields ...
  pausedAt  DateTime? @map("paused_at")
}
```

**Why `pausedAt` timestamp instead of a `paused` status:**

1. **Preserves the status machine.** The existing `draft -> active -> completed` flow is deeply embedded in queries, gates, broadcast events, and student views. Adding `paused` as a fourth status would require updating every `status: 'active'` check across 40+ files.
2. **Pause is orthogonal to status.** A bracket can be paused while `active`. It can be unpaused and remain `active`. This is a modifier on the `active` state, not a separate lifecycle stage.
3. **Timestamp provides audit trail.** Teachers can see when they paused. Future analytics can track pause frequency and duration.
4. **Simple boolean check.** `isPaused = pausedAt !== null` in application code. Resume = `set pausedAt to null`.

---

## New Broadcast Event Types

Added to the existing `BracketUpdateType` and `PollUpdateType` unions in `src/lib/realtime/broadcast.ts`:

```typescript
// Bracket additions
type BracketUpdateType =
  | 'winner_selected'
  | 'round_advanced'
  | 'matchup_opened'
  | 'bracket_completed'
  | 'voting_opened'
  | 'prediction_status_changed'
  | 'reveal_round'
  | 'reveal_complete'
  | 'results_prepared'
  | 'bracket_paused'      // NEW: teacher paused the bracket
  | 'bracket_resumed'     // NEW: teacher resumed the bracket
  | 'bracket_reopened'    // NEW: teacher reopened a completed bracket
  | 'round_undone'        // NEW: teacher undid a round advancement

// Poll additions
type PollUpdateType =
  | 'poll_activated'
  | 'poll_closed'
  | 'poll_archived'
  | 'poll_paused'         // NEW: teacher paused the poll
  | 'poll_resumed'        // NEW: teacher resumed the poll
  | 'poll_reopened'       // NEW: teacher reopened a closed poll
```

These events are handled by the existing `useRealtimeBracket` and `useRealtimePoll` hooks via their `bracket_update` and `poll_update` listeners, which already trigger `fetchBracketState()` and `fetchPollState()` refetches on any structural event. No hook changes needed -- just add the new event types to the switch statements.

---

## New shadcn/ui Components to Generate

After installing the Radix packages, generate the shadcn/ui wrappers:

```bash
# Generate shadcn/ui component wrappers (copies source into src/components/ui/)
npx shadcn@latest add switch
npx shadcn@latest add tabs
npx shadcn@latest add sonner   # if adding toast support
```

These will create:
- `src/components/ui/switch.tsx` -- wraps `@radix-ui/react-switch`
- `src/components/ui/tabs.tsx` -- wraps `@radix-ui/react-tabs`
- `src/components/ui/sonner.tsx` -- wraps `sonner` library (if added)

---

## Installation

```bash
# Required new packages (2)
npm install @radix-ui/react-switch@^1.2.6 @radix-ui/react-tabs@^1.1.13

# Optional (recommended) toast package
npm install sonner@^2.0.7

# Generate shadcn/ui wrappers
npx shadcn@latest add switch tabs

# If adding sonner:
npx shadcn@latest add sonner
```

No new dev dependencies needed.

---

## New Zod Validation Schemas

```typescript
// Update bracket settings (post-creation editing)
export const updateBracketSettingsSchema = z.object({
  bracketId: z.string().uuid(),
  // Display settings (changeable during live)
  viewingMode: z.enum(['simple', 'advanced']).optional(),
  showVoteCounts: z.boolean().optional(),
  showSeedNumbers: z.boolean().optional(),
  votingTimerSeconds: z.number().int().min(5).max(300).nullable().optional(),
  // RR-specific (changeable during live if no rounds decided)
  roundRobinStandingsMode: z.enum(['live', 'suspenseful']).optional(),
})

// Update poll settings (post-creation editing)
export const updatePollSettingsSchema = z.object({
  pollId: z.string().uuid(),
  // Display settings (changeable during live)
  showLiveResults: z.boolean().optional(),
  allowVoteChange: z.boolean().optional(),
})

// Pause/resume bracket
export const pauseBracketSchema = z.object({
  bracketId: z.string().uuid(),
})

// Pause/resume poll
export const pausePollSchema = z.object({
  pollId: z.string().uuid(),
})

// Reopen completed bracket
export const reopenBracketSchema = z.object({
  bracketId: z.string().uuid(),
})

// Undo round (batch undo all matchups in a round)
export const undoRoundSchema = z.object({
  bracketId: z.string().uuid(),
  round: z.number().int().min(1),
})
```

---

## New Server Actions Required

| Action | File | Purpose |
|--------|------|---------|
| `pauseBracket` | `src/actions/bracket.ts` | Set `pausedAt = now()` on bracket, broadcast `bracket_paused` |
| `resumeBracket` | `src/actions/bracket.ts` | Set `pausedAt = null`, broadcast `bracket_resumed` |
| `pausePoll` | `src/actions/poll.ts` | Set `pausedAt = now()` on poll, broadcast `poll_paused` |
| `resumePoll` | `src/actions/poll.ts` | Set `pausedAt = null`, broadcast `poll_resumed` |
| `reopenBracket` | `src/actions/bracket.ts` | Set `status = 'active'`, clear final winner, broadcast `bracket_reopened` |
| `reopenPoll` | `src/actions/poll.ts` | Set `status = 'active'`, broadcast `poll_reopened` |
| `undoRound` | `src/actions/bracket-advance.ts` | Batch undo all decided matchups in round N, reopen voting, broadcast `round_undone` |
| `updateBracketSettings` | `src/actions/bracket.ts` | Update display settings, broadcast settings change |
| `updatePollSettings` | `src/actions/poll.ts` | Update display settings, broadcast settings change |

All follow the established pattern: `auth -> validate (Zod) -> ownership check -> DAL mutation -> broadcast -> revalidatePath -> return`.

---

## New DAL Functions Required

| Function | File | Purpose |
|----------|------|---------|
| `pauseBracketDAL` | `src/lib/dal/bracket.ts` | `UPDATE brackets SET paused_at = NOW() WHERE id = ? AND teacher_id = ?` |
| `resumeBracketDAL` | `src/lib/dal/bracket.ts` | `UPDATE brackets SET paused_at = NULL WHERE id = ? AND teacher_id = ?` |
| `pausePollDAL` | `src/lib/dal/poll.ts` | Same pattern for polls |
| `resumePollDAL` | `src/lib/dal/poll.ts` | Same pattern for polls |
| `reopenBracketDAL` | `src/lib/dal/bracket.ts` | Set status to `active`, clear final matchup winner |
| `reopenPollDAL` | `src/lib/dal/poll.ts` | Set status to `active` |
| `undoRoundDAL` | `src/lib/dal/bracket.ts` | Batch reset matchups in round N, reopen for voting |
| `updateBracketSettingsDAL` | `src/lib/dal/bracket.ts` | Update settings fields on bracket |
| `updatePollSettingsDAL` | `src/lib/dal/poll.ts` | Update settings fields on poll |

---

## Alternatives Considered

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| `pausedAt` timestamp column | `paused` boolean column | Timestamp provides audit trail and "when paused" info for free |
| `pausedAt` timestamp column | New `paused` status value | Would break 40+ files that check `status: 'active'`; pause is orthogonal to lifecycle |
| @radix-ui/react-switch | Plain HTML checkbox | No ARIA toggle semantics, no animation, inconsistent with existing Radix primitive usage |
| @radix-ui/react-tabs | Custom button toggle | No tablist/tab/tabpanel ARIA roles, no keyboard arrow navigation |
| sonner | react-hot-toast | sonner has first-class shadcn/ui wrapper, better TypeScript types, newer API |
| sonner | No toasts (inline feedback only) | Viable for MVP; toasts add polish for rapid teacher actions but not strictly required |
| Extend existing broadcast events | New WebSocket channels per feature | Unnecessary complexity; existing channel+refetch pattern handles all new events cleanly |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@radix-ui/react-alert-dialog` | Already have `@radix-ui/react-dialog` installed; AlertDialog is for destructive confirmations which can use the existing Dialog pattern from `delete-confirm-dialog.tsx` | Reuse existing Dialog component for undo/reopen confirmations |
| `@radix-ui/react-tooltip` | Green dot vote indicators are self-explanatory; tooltips would add interaction overhead on a panel that teachers glance at, not hover over | Use aria-label attributes for accessibility instead |
| `zustand` or `jotai` for pause state | Pause state lives in the database and is broadcast via Supabase Realtime; client state management would duplicate server state | Keep server-authoritative state with broadcast+refetch |
| `@tanstack/react-query` | The existing `fetch` + `useState` + broadcast refetch pattern works well; adding TanStack Query adds a paradigm shift with no clear benefit for 80K LOC codebase | Continue with existing `useCallback` fetch pattern |
| `react-hook-form` | Settings editing forms are small (3-5 toggles); RHF is overkill when controlled components + Zod validation work fine | Controlled `useState` + Zod `safeParse` on submit |
| Socket.IO / Pusher / Ably | Supabase Broadcast already handles all real-time needs; adding a second transport would duplicate infrastructure | Extend existing Supabase broadcast with new event types |
| `postgres_changes` for pause detection | RLS deny-all blocks postgres_changes for anon role; broadcast is faster and already the established pattern | Use broadcast+refetch pattern |

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@radix-ui/react-switch@^1.2.6` | `react@19.2.3`, `react-dom@19.2.3` | Verified: Radix 1.2.x supports React 19 |
| `@radix-ui/react-tabs@^1.1.13` | `react@19.2.3`, `react-dom@19.2.3` | Verified: Radix 1.1.x supports React 19 |
| `sonner@^2.0.7` | `react@19.2.3`, `next@16.1.6` | Verified: sonner 2.x supports React 18+ and Next.js App Router |
| `@radix-ui/react-switch@^1.2.6` | `@radix-ui/react-dialog@1.1.15` | Same Radix ecosystem; no version conflicts |
| `@radix-ui/react-tabs@^1.1.13` | `@radix-ui/react-dropdown-menu@2.1.16` | Same Radix ecosystem; no version conflicts |
| Prisma migration (add column) | `prisma@^7.3.0` | Simple ALTER TABLE; no Prisma version issues |

---

## Integration Points by Feature

### Pause/Resume
- **Schema:** `pausedAt` on Bracket and Poll models
- **Broadcast:** New event types in existing broadcast functions
- **Student view:** Conditional "needs to cook" overlay in student voting components, gated by `pausedAt !== null` from bracket/poll state API
- **Teacher view:** Play/Pause toggle button in live dashboard header, context menu, and bracket/poll card
- **API:** Activities endpoint filters paused items to still show but with visual indicator

### Undo Round / Reopen
- **Existing code:** `undoMatchupAdvancement` in `src/lib/bracket/advancement.ts` already handles single matchup undo with vote blocking check on next matchup
- **Extension needed:** Batch undo (all matchups in a round) using `$transaction`
- **Reopen:** Status transition `completed -> active` with optional vote/winner cleanup
- **Broadcast:** `round_undone` and `bracket_reopened` events trigger full refetch on student views

### Quick Create (Brackets)
- **Existing code:** `TopicPicker`, `CURATED_TOPICS` already exist
- **New flow:** Topic chip selection -> entrant count picker -> auto-create with SE defaults
- **No API changes:** Uses existing `createBracket` server action with pre-filled data

### Simplified Poll Quick Create
- **Existing code:** `POLL_TEMPLATES`, `PollWizard` already exist
- **New flow:** Question + options only -> create with default settings (allowVoteChange=true, showLiveResults=false)
- **No API changes:** Uses existing `createPoll` server action

### Real-Time Vote Indicators
- **Existing code:** `ParticipationSidebar` already shows green dots per matchup
- **Extension:** Aggregate "has voted on any active matchup" indicator without requiring matchup selection
- **Broadcast:** New `student_voted` event on `activities:{sessionId}` channel
- **API:** Activities endpoint already returns `hasVoted` per participant

### Settings Editing
- **New UI:** Dialog/sheet with Switch toggles and Input fields
- **Validation:** Zod schemas for safe settings updates
- **Safety:** Some settings locked during active voting (bracket type, size, entrants); display settings (showVoteCounts, viewingMode) always editable

---

## React Pattern Reference for v2.0

### Pattern 1: Optimistic Toggle (Pause/Resume Button)

```typescript
'use client'
import { useTransition } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pauseBracket, resumeBracket } from '@/actions/bracket'

function PauseResumeButton({ bracketId, isPaused }: { bracketId: string; isPaused: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      if (isPaused) {
        await resumeBracket({ bracketId })
      } else {
        await pauseBracket({ bracketId })
      }
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
    >
      {isPaused ? <Play className="mr-1 h-4 w-4" /> : <Pause className="mr-1 h-4 w-4" />}
      {isPaused ? 'Resume' : 'Pause'}
    </Button>
  )
}
```

### Pattern 2: Settings Edit Dialog with Switch

```typescript
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

// Inside a Dialog
<div className="flex items-center justify-between">
  <Label htmlFor="show-votes">Show vote counts to students</Label>
  <Switch
    id="show-votes"
    checked={showVoteCounts}
    onCheckedChange={setShowVoteCounts}
  />
</div>
```

### Pattern 3: Quick Create Tabs

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Zap, Settings } from 'lucide-react'

<Tabs defaultValue="quick">
  <TabsList>
    <TabsTrigger value="quick">
      <Zap className="mr-1 h-4 w-4" /> Quick Create
    </TabsTrigger>
    <TabsTrigger value="wizard">
      <Settings className="mr-1 h-4 w-4" /> Step-by-Step
    </TabsTrigger>
  </TabsList>
  <TabsContent value="quick">
    {/* Topic chips + entrant count picker */}
  </TabsContent>
  <TabsContent value="wizard">
    {/* Existing BracketForm wizard */}
  </TabsContent>
</Tabs>
```

---

## Supabase Realtime Architecture (Minimal Changes)

The existing dual-channel broadcast pattern extends cleanly:

```
Teacher Server Action (pause/undo/reopen/settings)
    |
    | POST /realtime/v1/api/broadcast (service_role key)
    v
Supabase Broadcast
    |
    | WebSocket (or polling fallback)
    v
Student Browser (useRealtimeBracket / useRealtimePoll)
    | bracket_update or poll_update event received
    | type = 'bracket_paused' | 'bracket_resumed' | 'round_undone' | ...
    v
fetchBracketState() / fetchPollState()
    | response includes pausedAt field
    v
UI renders pause overlay or updated state
```

No new channels. No new subscription hooks. The existing hooks already handle any `bracket_update` or `poll_update` event by refetching. The only code change is adding the new event types to the type unions and ensuring the state API endpoints include `pausedAt` in their response.

---

## Migration Execution Order

Based on dependencies:

1. **Prisma migration** -- add `pausedAt` column (all features depend on schema)
2. **Install packages** -- @radix-ui/react-switch, @radix-ui/react-tabs, sonner
3. **Generate shadcn/ui wrappers** -- switch, tabs, sonner
4. **Broadcast event types** -- extend type unions (enables all real-time features)
5. **Pause/resume** -- simplest teacher control, validates broadcast pattern
6. **Settings editing** -- uses new Switch component, validates settings update flow
7. **Undo round / reopen** -- builds on existing `undoMatchupAdvancement`
8. **Quick create brackets** -- UI-only, no backend changes
9. **Simplified poll create** -- UI-only, no backend changes
10. **Real-time vote indicators** -- extends existing participation sidebar
11. **Bug fixes & label changes** -- independent, can be done in parallel

---

## Sources

- **package.json (HIGH confidence):** Direct read of `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/package.json` -- all installed versions verified
- **Prisma schema (HIGH confidence):** Direct read of `prisma/schema.prisma` -- Bracket and Poll models analyzed for status fields, existing columns, and migration patterns
- **Existing codebase (HIGH confidence):** Read `src/lib/realtime/broadcast.ts` (broadcast event types), `src/hooks/use-realtime-bracket.ts` (event handling pattern), `src/hooks/use-realtime-poll.ts` (poll event handling), `src/hooks/use-realtime-activities.ts` (activity refresh pattern), `src/components/teacher/participation-sidebar.tsx` (green dot vote indicator pattern), `src/lib/bracket/types.ts` (BracketStatus type), `src/lib/bracket/advancement.ts` (existing undoMatchupAdvancement), `src/lib/bracket/curated-topics.ts` (topic data), `src/lib/poll/templates.ts` (poll template data), `src/components/bracket/topic-picker.tsx` (existing topic picker UI), `src/components/bracket/bracket-form.tsx` (creation wizard), `src/components/poll/poll-wizard.tsx` (poll creation wizard), `src/components/teacher/delete-confirm-dialog.tsx` (confirmation dialog pattern)
- **@radix-ui/react-switch npm (HIGH confidence):** https://www.npmjs.com/package/@radix-ui/react-switch -- v1.2.6 latest, supports React 19
- **@radix-ui/react-tabs npm (HIGH confidence):** https://www.npmjs.com/package/@radix-ui/react-tabs -- v1.1.13 latest, supports React 19
- **sonner npm (HIGH confidence):** https://www.npmjs.com/package/sonner -- v2.0.7 latest, supports React 18+ and Next.js App Router
- **shadcn/ui Switch docs (HIGH confidence):** https://ui.shadcn.com/docs/components/radix/switch -- wraps @radix-ui/react-switch
- **shadcn/ui Tabs docs (HIGH confidence):** https://ui.shadcn.com/docs/components/radix/tabs -- wraps @radix-ui/react-tabs
- **shadcn/ui Sonner docs (HIGH confidence):** https://ui.shadcn.com/docs/components/radix/sonner -- wraps sonner library
- **shadcn/ui February 2026 changelog (MEDIUM confidence):** https://ui.shadcn.com/docs/changelog/2026-02-radix-ui -- unified radix-ui package for new-york style; this project uses individual @radix-ui packages which remain supported
- **Existing Prisma migration (HIGH confidence):** Read `prisma/migrations/20260223183446_phase23_session_archiving/migration.sql` -- confirms ALTER TABLE + ADD COLUMN pattern for nullable timestamp columns

---

*Stack research for: SparkVotEDU v2.0 Teacher Power-Ups*
*Researched: 2026-02-28*
