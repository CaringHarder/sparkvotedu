# Phase 36: Bug Fixes - Research

**Researched:** 2026-03-02
**Domain:** Next.js bug fixes across poll creation, student voting, teacher dashboard, and activity lifecycle
**Confidence:** HIGH

## Summary

This phase addresses nine known bugs across the SparkVotEDU application. All bugs are in existing code with clear reproduction paths. The research involved tracing each bug through the full data flow: server actions, DAL functions, realtime hooks, and UI components.

The bugs fall into four categories: (1) data persistence issues (FIX-01 ghost options), (2) UI/layout issues (FIX-02 centering, FIX-03 name prompt, FIX-04 session dropdown), (3) realtime/display issues (FIX-05 live results, FIX-06 fullscreen, FIX-07 poll realtime, FIX-08 bracket indicators), and (4) lifecycle flow issues (FIX-09 Start/Go Live). No new libraries are needed. All fixes involve modifying existing components and actions.

**Primary recommendation:** Fix each bug by modifying existing files only. Follow established patterns (bracket realtime for poll realtime, bracket quick create for poll quick create, etc.). No architectural changes needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Duplicate creates an exact copy immediately (existing behavior is fine)
- Duplicated polls always start with zero votes -- clean slate
- Bug: when teacher removes options from a duplicated poll and clicks "Create Poll" (save), ghost options from the original persist
- Fix: ensure the save/create action correctly deletes removed options from the database
- Removed options should just disappear from the form instantly -- no animation or fade-out
- Polls with exactly 2 options: side-by-side larger cards, centered horizontally
- Cards should be larger than normal 3+ option cards -- take advantage of the extra space for a more impactful feel
- No "VS" badge or divider between cards -- just a clean gap
- On mobile (narrow screens): stack vertically, consistent with how grids reflow for 3+ options
- When name is taken, show: "Name taken. Add your last initial to join."
- Suggestion format: last initial (e.g., "David R.") -- not numbered suffix
- Input keeps the original name ("David") -- student appends their initial
- Tone: short and direct, not playful
- If student submits the exact same name again: block and re-prompt with the same message. Must differentiate to join.
- Poll Quick Create must include an "Assign to session (optional)" dropdown
- Match the bracket Quick Create layout exactly: same dropdown component, same label, same "No session (assign later)" default
- When "Show Live Results" toggle is ON, students must see the same results display the teacher dashboard shows
- Results should update in real time as votes come in (same realtime pattern)
- Fullscreen mode on teacher live dashboard auto-closes after a few seconds -- it should NOT
- Fix: fullscreen stays open until teacher presses Esc or F key
- Only these two exit methods -- no click-outside-to-exit
- Poll teacher live dashboard does not auto-update when students vote -- requires manual page refresh
- Fix: implement realtime updates matching the pattern brackets already use (Supabase realtime subscription)
- Poll vote indicators work correctly: blue dot for joined, green dot + sort to bottom when voted
- Bracket vote indicators are broken: blue dot appears but never turns green when student votes (in both advanced and simple mode)
- Affects at least SE brackets, possibly all types (needs investigation)
- Fix: match the working poll indicator behavior -- green dot on vote, sort voted students to bottom
- Go Live button currently shows and is clickable on bracket/poll detail pages before the activity is started -- it should be hidden
- Clicking Start should both activate the activity (draft -> active) AND auto-navigate to the live dashboard page
- Applies to both brackets and polls
- After start, if teacher navigates back to detail page: Claude's discretion on whether Go Live button appears

### Claude's Discretion
- Post-start Go Live button visibility on detail page (if teacher navigates back)
- Technical approach for poll realtime updates (match existing bracket pattern)
- Which bracket types are affected by vote indicator bug (investigate all types)
- Any internal refactoring needed to support these fixes

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (No New Libraries)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | existing | App router, server components, server actions | Already in use |
| Prisma | existing | Database access for option deletion, vote queries | Already in use |
| Supabase Realtime | existing | Broadcast channels for live updates | Already in use |
| Tailwind CSS | existing | Layout changes (2-option grid, fullscreen) | Already in use |

### Supporting
No new libraries needed. All fixes use existing stack components.

### Alternatives Considered
None. All fixes are modifications to existing code.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Relevant Project Structure
```
src/
├── actions/               # Server actions (poll.ts, bracket.ts, vote.ts, student.ts)
├── app/
│   ├── (dashboard)/       # Teacher routes (polls/[id], brackets/[id], polls/[id]/live)
│   ├── (student)/         # Student routes (session/[id]/poll/[id])
│   └── api/               # API routes (polls/[id]/state, brackets/[id]/state)
├── components/
│   ├── bracket/           # bracket-detail.tsx, bracket-status.tsx, bracket-quick-create.tsx
│   ├── poll/              # poll-form.tsx, poll-detail-view.tsx, poll-results.tsx, presentation-mode.tsx
│   ├── student/           # simple-poll-vote.tsx, name-disambiguation.tsx, name-entry-form.tsx
│   ├── teacher/           # live-dashboard.tsx, participation-sidebar.tsx
│   └── shared/            # activity-metadata-bar.tsx, quick-settings-toggle.tsx
├── hooks/                 # use-realtime-poll.ts, use-realtime-bracket.ts, use-vote.ts
├── lib/
│   ├── dal/               # poll.ts (DAL functions), vote.ts
│   └── realtime/          # broadcast.ts (broadcastPollVoteUpdate, broadcastVoteUpdate)
└── types/                 # student.ts (DuplicateCandidate)
```

### Pattern 1: Server Action -> DAL -> Broadcast -> Realtime Hook (Existing)
**What:** Vote cast flows through server action to DAL to Supabase broadcast to client hook
**When to use:** All real-time data updates
**Example:**
```typescript
// Source: src/actions/poll.ts (castPollVote)
// 1. Server action validates and persists via DAL
await castSimplePollVoteDAL(pollId, participantId, optionId)
// 2. Compute updated counts
const voteCounts = await getSimplePollVoteCounts(pollId)
// 3. Broadcast to channel (non-blocking)
broadcastPollVoteUpdate(pollId, voteCounts, totalVotes, participantId).catch(console.error)

// Source: src/hooks/use-realtime-poll.ts
// 4. Client hook subscribes to channel, batches updates, flushes to state
channel.on('broadcast', { event: 'poll_vote_update' }, (message) => {
  pendingVoteCounts.current = { ...pendingVoteCounts.current, ...counts }
  pendingTotalVotes.current = total
})
```

### Pattern 2: Session Dropdown in Quick Create (Existing Reference)
**What:** Server component fetches sessions, passes to client component as prop
**When to use:** FIX-04 (poll quick create session selector)
**Example:**
```typescript
// Source: src/app/(dashboard)/brackets/new/page.tsx
// Server component:
const sessions = await prisma.classSession.findMany({
  where: { teacherId: teacher.id, status: 'active' },
  select: { id: true, code: true, name: true, createdAt: true },
  orderBy: { createdAt: 'desc' },
})
// Pass to client component:
return <BracketCreationPage sessions={serializedSessions} />

// Source: src/components/bracket/bracket-quick-create.tsx
// Client component renders dropdown:
<select value={selectedSessionId ?? ''} onChange={...}>
  <option value="">No session (assign later)</option>
  {sessions.map((s) => (
    <option key={s.id} value={s.id}>{s.name ? `${s.name} (${s.code})` : `Unnamed Session (${s.code})`}</option>
  ))}
</select>
```

### Anti-Patterns to Avoid
- **Don't hand-roll realtime for polls:** The `useRealtimePoll` hook already exists and works. FIX-07 is about making sure it's properly connected, not about building new realtime infrastructure.
- **Don't add new animation libraries:** FIX-01 specifies no animation for removed options. FIX-02 specifies clean layout only.
- **Don't create wrapper components:** Fix existing components directly. No need for new abstraction layers.

## Bug-by-Bug Technical Analysis

### FIX-01: Duplicate Poll Ghost Options
**Confidence:** HIGH

**Root cause:** When editing a poll (especially after duplication), the `updatePollOptionsDAL` in `src/lib/dal/poll.ts` (line 159) only UPDATES options passed in. It never DELETES options that were removed from the form. The `OptionList` component (`src/components/poll/option-list.tsx`) removes options from local state (line 50-55), but the form submit in `PollForm` (`src/components/poll/poll-form.tsx`, line 134-153) only sends updates for remaining options.

**Files to modify:**
- `src/lib/dal/poll.ts` -- `updatePollOptionsDAL` needs to delete options not in the provided list
- OR `src/components/poll/poll-form.tsx` -- add explicit delete calls for removed options
- OR `src/actions/poll.ts` -- `updatePollOptions` action needs to handle deletions

**Recommended approach:** Modify `updatePollOptionsDAL` to accept the full set of option IDs that should exist, then delete any PollOption rows for the poll that are NOT in that set. This is a "sync" pattern -- the client sends the intended final list, and the DAL reconciles.

**Key code locations:**
- `src/components/poll/option-list.tsx` -- `removeOption` (line 50-55, client-side only)
- `src/components/poll/poll-form.tsx` -- `handleSubmit` edit branch (line 117-153)
- `src/lib/dal/poll.ts` -- `updatePollOptionsDAL` (line 159-189)
- `src/actions/poll.ts` -- `updatePollOptions` (line 164-189)

**Database consideration:** The `@@unique([pollId, position])` constraint on PollOption means positions must be updated atomically when deleting options to avoid constraint violations. The transaction already handles this.

### FIX-02: 2-Option Poll Centering
**Confidence:** HIGH

**Root cause:** In `src/components/student/simple-poll-vote.tsx` (line 87), the grid is always `grid-cols-2 gap-3 sm:grid-cols-3` regardless of option count. Two options render as two normal-sized cards in the 2-column grid, not centered or enlarged.

**Files to modify:**
- `src/components/student/simple-poll-vote.tsx` -- conditional grid classes based on `poll.options.length`

**Recommended approach:** When `poll.options.length === 2`, use a different layout:
```
// 2 options: centered, larger cards
"flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6"
// Each card gets wider: "w-full sm:w-64 md:w-72"
// 3+ options: existing grid
"grid grid-cols-2 gap-3 sm:grid-cols-3"
```

The `min-h-[80px]` on CardContent (line 106) should become larger for 2-option polls (e.g., `min-h-[120px]` or `min-h-[140px]`). On mobile: stack vertically (the `flex-col` default does this).

### FIX-03: Duplicate Name Prompt
**Confidence:** HIGH

**Root cause:** The current name disambiguation flow (`src/components/student/name-disambiguation.tsx`) shows a list of existing participants and lets the student claim one or differentiate. The new requirement changes this to a simpler prompt: "Name taken. Add your last initial to join."

**Files to modify:**
- `src/components/student/name-disambiguation.tsx` -- replace the candidate list UI with a simple re-prompt
- `src/components/student/name-entry-form.tsx` -- adjust how the disambiguation component receives props
- `src/actions/student.ts` -- `joinSessionByName` (line 254-312) may need to detect exact-same-name resubmission

**Current flow:**
1. Student enters "David" -> `joinSessionByName` returns `{ duplicates: [...] }`
2. `NameEntryForm` switches to `NameDisambiguation` component
3. Student sees candidate list + "I'm someone different" button

**New flow:**
1. Student enters "David" -> `joinSessionByName` returns duplicates
2. Show inline message: "Name taken. Add your last initial to join."
3. Input keeps "David", student types "David R."
4. If "David R." exists: block, re-prompt with same message
5. If "David R." is unique: create participant

**Key decisions from context:**
- No candidate list / "That's me!" flow for first-time joiners (the disambiguation component UI changes significantly)
- The `claimIdentity` action may still be needed for returning students (but the initial join prompt changes)
- Input pre-fills with original name, student appends their initial
- Exact same name re-submission: block and re-prompt (server already returns duplicates again via line 307-311 in `joinSessionByName`)

### FIX-04: Poll Quick Create Session Selector
**Confidence:** HIGH

**Root cause:** The `PollForm` component (`src/components/poll/poll-form.tsx`) has no session selector in quick create mode. The bracket's `BracketQuickCreate` (`src/components/bracket/bracket-quick-create.tsx`, lines 166-185) does.

**Files to modify:**
- `src/app/(dashboard)/polls/new/page.tsx` -- convert from client component to server component, fetch sessions, pass to client
- `src/components/poll/poll-form.tsx` -- accept `sessions` prop, render dropdown in quick create mode
- `src/actions/poll.ts` -- `createPoll` action needs to handle `sessionId` in poll creation

**Bracket reference implementation:**
- Server component: `src/app/(dashboard)/brackets/new/page.tsx` (fetches sessions from Prisma)
- Client component: `src/components/bracket/bracket-quick-create.tsx` (renders dropdown, passes `selectedSessionId` to `createBracket`)

**Note:** The poll `createPollDAL` doesn't currently accept `sessionId`. The poll form creates the poll then uses `assignPollToSession` separately. For Quick Create, the sessionId should be set during creation for simplicity. Either modify `createPollDAL` to accept `sessionId`, or call `assignPollToSession` after creation.

**Additional note:** The existing `createPollSchema` in validation may need `sessionId` added:
```typescript
// src/lib/utils/validation.ts -- createPollSchema
sessionId: z.string().uuid().nullable().optional()
```

### FIX-05: Show Live Results on Student Dashboard
**Confidence:** HIGH

**Root cause:** When `showLiveResults` is ON, the student poll page (`src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx`) only shows "Results will be shown when the poll closes" (line 78-82 in `simple-poll-vote.tsx`). It does NOT display actual vote counts or charts to students.

**Files to modify:**
- `src/components/student/simple-poll-vote.tsx` -- add results display when `poll.showLiveResults === true`
- `src/components/student/ranked-poll-vote.tsx` -- same for ranked polls
- `src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx` -- pass realtime vote data to voting components

**Existing data available:** The student page already subscribes to realtime via `useRealtimePoll` (line 112) and has `voteCounts` and `bordaScores` available. It just doesn't render them.

**Recommended approach:** When `showLiveResults === true`, render a simplified version of the teacher's results display (bar chart or vote percentages) below the voting cards. Reuse `AnimatedBarChart` from `src/components/poll/bar-chart.tsx`. The `voteCounts` from `useRealtimePoll` are already available in the page component -- they need to be passed down to the voting components or rendered alongside them.

### FIX-06: Fullscreen Auto-Close
**Confidence:** MEDIUM

**Root cause:** The `PresentationMode` component (`src/components/poll/presentation-mode.tsx`) requests fullscreen on mount (line 36) and listens for `fullscreenchange` events (line 41-44). When `document.fullscreenElement` becomes null, it calls `onExit()`. The likely cause of "auto-close after a few seconds" is:

1. **Fullscreen API rejection:** If `requestFullscreen()` is rejected (common in some browsers/contexts), the browser may fire `fullscreenchange` event, which detects no fullscreenElement and exits.
2. **React re-render timing:** If the component re-renders (e.g., from realtime vote updates), the `useEffect` cleanup fires `document.exitFullscreen()` (line 52), then the new effect re-requests fullscreen. This creates a flicker/close cycle.
3. **The `onExit` dependency in useEffect (line 56):** If `onExit` is not stable (not wrapped in useCallback), the effect re-runs on every render, causing the fullscreen exit/re-enter cycle.

**Investigation needed:** Check whether `onExitPresentation` in `poll-results.tsx` (line 194) creates a new function reference on each render. Looking at the code: `onExitPresentation={() => setPresenting(false)}` on line 194 -- this IS an inline arrow function that creates a new reference every render, causing the useEffect to re-run.

**Files to modify:**
- `src/components/poll/presentation-mode.tsx` -- decouple the fullscreen API from the overlay rendering, handle fullscreen rejection gracefully
- `src/app/(dashboard)/polls/[pollId]/live/client.tsx` -- stabilize `onExitPresentation` callback with useCallback

**Recommended approach:**
1. Make `PresentationMode` NOT call `onExit()` when fullscreen exits via browser (Escape). Instead, only exit presentation when the explicit Exit button is clicked or F key is pressed.
2. Alternatively: separate the Fullscreen API call from the overlay. The overlay (fixed div) should persist independently of fullscreen state. Only use Fullscreen API as an enhancement.
3. The `useEffect` dependency on `onExit` (line 56) causes re-runs. Either stabilize it with useCallback or use a ref.

### FIX-07: Poll Teacher Dashboard Realtime
**Confidence:** MEDIUM

**Root cause analysis:** The poll live dashboard (`src/app/(dashboard)/polls/[pollId]/live/client.tsx`) renders `PollResults` which internally calls `useRealtimePoll(poll.id, poll.sessionId)`. The `useRealtimePoll` hook (`src/hooks/use-realtime-poll.ts`) subscribes to `poll:{pollId}` channel and handles `poll_vote_update` events with batched flushing. The `broadcastPollVoteUpdate` in the `castPollVote` action correctly broadcasts to this channel.

**The realtime infrastructure appears complete.** If the teacher dashboard isn't updating, possible causes:
1. **WebSocket connection failure:** School networks may block WebSocket. The 5-second fallback to polling should handle this, but there could be edge cases.
2. **Supabase client initialization:** The `createClient()` call in the hook creates a new client per useMemo. If the Supabase URL or anon key has issues, the channel won't connect.
3. **Channel naming mismatch:** Verify `poll:${pollId}` is consistent between broadcast and subscription.
4. **Server-side issue:** The `broadcastPollVoteUpdate` call in `castPollVote` uses `.catch(console.error)` -- errors are logged but not surfaced. The Supabase admin client may have issues.

**Investigation approach during implementation:**
1. Add console.log in the `useRealtimePoll` channel subscription callback to verify SUBSCRIBED status
2. Check browser DevTools -> Network -> WS to verify WebSocket connection
3. Verify the broadcast function in `src/lib/realtime/broadcast.ts` is correctly configured with the Supabase admin client

**Note:** The `PollLiveClient` also calls `useRealtimePoll` separately for voterIds (line 95). The `PollResults` internally calls it again for vote counts. This dual subscription is noted as safe (Supabase deduplicates), but it means TWO hooks are running for the same poll. If one works but the other doesn't, it could be a hook initialization timing issue.

### FIX-08: Bracket Vote Indicators
**Confidence:** HIGH

**Root cause analysis:** For SE brackets, the sidebar voter IDs are computed in `src/components/teacher/live-dashboard.tsx` (line 787-811):

```typescript
// SE/DE: single matchup
if (!selectedMatchupId) return []
return mergedVoterIds[selectedMatchupId] ?? []
```

For SE brackets, `selectedMatchupId` defaults to `null` (line 109). It's only set when:
1. Teacher clicks a matchup in the bracket diagram (line 1008)
2. During batch advance when a tied matchup needs manual resolution (line 696, 719)

**This means for SE brackets during normal voting, the sidebar shows zero voted students because no matchup is selected.** The sidebar always shows connected students (blue dots from presence), but voter data requires a selected matchup.

For **RR brackets** (line 788-801), it works differently -- it intersects voter IDs across all matchups in the current round, without requiring a selected matchup. This is why RR brackets may show correct indicators while SE brackets don't.

**All bracket types affected:**
- **SE:** Broken -- needs selectedMatchupId or aggregate approach
- **DE:** Same issue -- uses selectedMatchupId logic (line 807-809)
- **RR:** Works correctly -- uses round-based intersection (line 788-801)
- **Predictive:** Uses 'predictions' key (line 803-805), separate mechanism

**Recommended fix for SE/DE:** Auto-set `selectedMatchupId` to the currently voting matchup. For SE brackets with a single voting matchup per round, detect the active voting matchup and auto-select it. For multiple concurrent voting matchups, aggregate voter IDs across all voting matchups for the current round (same pattern as RR).

**Alternative approach:** Change the `currentVoterIds` computation for SE/DE to union voter IDs across all currently voting matchups when no matchup is explicitly selected:
```typescript
// SE/DE: if no explicit selection, aggregate voting matchups in current round
if (!selectedMatchupId) {
  const votingMatchups = currentMatchups.filter(m => m.status === 'voting' && m.round === currentRound)
  const allVoterIds = new Set<string>()
  for (const m of votingMatchups) {
    for (const id of (mergedVoterIds[m.id] ?? [])) allVoterIds.add(id)
  }
  return [...allVoterIds]
}
return mergedVoterIds[selectedMatchupId] ?? []
```

**Files to modify:**
- `src/components/teacher/live-dashboard.tsx` -- `currentVoterIds` computation (line 787-811)

### FIX-09: Go Live / Start Flow
**Confidence:** HIGH

**Root cause:** Two issues in the detail pages for both polls and brackets:

**Issue 1: Go Live visible on draft activities**
- Poll: `src/components/poll/poll-detail-view.tsx` line 239-255 -- Go Live link always renders
- Bracket: `src/components/bracket/bracket-detail.tsx` line 201-218 -- Go Live link renders for all non-predictive brackets

**Issue 2: Start doesn't navigate to live dashboard**
- Poll: `handleStatusChange` in `src/components/poll/poll-detail-view.tsx` (line 182-192) calls `router.refresh()` after activation, not `router.push()`
- Bracket: `handleStatusChange` in `src/components/bracket/bracket-status.tsx` (line 48-59) has no navigation at all after status change

**Files to modify:**
- `src/components/poll/poll-detail-view.tsx`:
  - Hide Go Live link when `poll.status === 'draft'` (add condition around lines 239-255)
  - In `handleStatusChange`, when newStatus is 'active', navigate to `/polls/${poll.id}/live` instead of refreshing
- `src/components/bracket/bracket-detail.tsx`:
  - Hide Go Live link when `bracket.status === 'draft'`
- `src/components/bracket/bracket-status.tsx`:
  - In `handleStatusChange`, when newStatus is 'active', navigate to `/brackets/${bracketId}/live`

**Claude's discretion recommendation for post-start Go Live:**
Show the Go Live button when the teacher navigates back to the detail page IF the activity is active or paused. This is already the visual pattern -- the button gets green styling for active/paused. Just hide it for draft status. The existing code already differentiates styling, so the fix is simply to not render it at all for draft.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Realtime updates | Custom WebSocket server | `useRealtimePoll` / `useRealtimeBracket` hooks | Already built, tested, has polling fallback |
| Option sync (FIX-01) | Custom diff algorithm | Prisma `deleteMany` with NOT IN | Database handles atomicity |
| Student results display (FIX-05) | New results component | Reuse `AnimatedBarChart` from poll/bar-chart.tsx | Already styled, handles animations |
| Session dropdown (FIX-04) | New dropdown component | Copy bracket-quick-create pattern | Proven pattern, same styling |

**Key insight:** Every fix has an existing reference pattern in the codebase. Match existing patterns rather than inventing new approaches.

## Common Pitfalls

### Pitfall 1: Prisma Unique Constraint on PollOption Position
**What goes wrong:** Deleting options then updating positions can violate `@@unique([pollId, position])` if done in wrong order
**Why it happens:** If you delete option at position 2 and update option at position 3 to position 2, the delete must happen first
**How to avoid:** Do all deletes first in the transaction, then update remaining positions
**Warning signs:** Prisma P2002 unique constraint error

### Pitfall 2: Fullscreen API Browser Differences
**What goes wrong:** `requestFullscreen()` may be rejected or behave differently across browsers
**Why it happens:** Some browsers require user gesture, some school browser policies block fullscreen
**How to avoid:** Treat fullscreen as an enhancement. The presentation overlay should work independently of Fullscreen API success.
**Warning signs:** PresentationMode flashing or closing immediately after opening

### Pitfall 3: React useEffect Dependency on Unstable Callbacks
**What goes wrong:** useEffect re-runs on every render when callback prop is an inline function
**Why it happens:** `onExit={() => setPresenting(false)}` creates new function reference each render
**How to avoid:** Wrap callbacks in useCallback, or use refs for effect-internal callbacks
**Warning signs:** Fullscreen flashing, presentation mode toggling rapidly

### Pitfall 4: Dual useRealtimePoll Subscriptions
**What goes wrong:** Two instances of `useRealtimePoll` for the same poll may compete for state
**Why it happens:** `PollLiveClient` calls it for voterIds, `PollResults` calls it for vote counts
**How to avoid:** Consider lifting the hook to a shared parent and passing data down, OR confirm Supabase properly deduplicates
**Warning signs:** Vote counts flickering or resetting

### Pitfall 5: Name Disambiguation UX Regression
**What goes wrong:** Removing the candidate list may break the "returning student" flow
**Why it happens:** The current flow lets returning students reclaim their identity via candidate list
**How to avoid:** Keep `claimIdentity` action available for returning students. The new prompt only changes the FIRST join experience for name collisions. Consider: if duplicates exist AND one matches the name exactly, the student may still need a way to say "that's me."
**Warning signs:** Returning students unable to rejoin their session

### Pitfall 6: Server Component to Client Component Conversion
**What goes wrong:** Converting `/polls/new/page.tsx` from client to server component may break form state
**Why it happens:** The page currently uses `useState` for creation mode toggle
**How to avoid:** Extract the client-side parts into a child component (like brackets do with `BracketCreationPage`), keep the page as server component for data fetching
**Warning signs:** Hydration errors, "useState cannot be used in server component"

## Code Examples

### FIX-01: Delete Removed Options in Transaction
```typescript
// Source: Pattern from existing updatePollOptionsDAL
// Modified to delete options not in the provided list
export async function updatePollOptionsDAL(
  pollId: string,
  teacherId: string,
  options: { id: string; text: string; imageUrl?: string | null; position: number }[]
) {
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, teacherId },
  })
  if (!poll) return null

  const optionIds = options.map(o => o.id)

  return prisma.$transaction(async (tx) => {
    // Delete options that are no longer in the list
    await tx.pollOption.deleteMany({
      where: {
        pollId,
        id: { notIn: optionIds },
      },
    })

    // Update remaining options
    for (const option of options) {
      await tx.pollOption.updateMany({
        where: { id: option.id, pollId },
        data: {
          text: option.text,
          imageUrl: option.imageUrl ?? null,
          position: option.position,
        },
      })
    }

    return tx.poll.findUniqueOrThrow({
      where: { id: pollId },
      include: { options: { orderBy: { position: 'asc' } } },
    })
  })
}
```

### FIX-02: Two-Option Layout
```typescript
// Source: Modification to src/components/student/simple-poll-vote.tsx
const is2Options = poll.options.length === 2

// Grid classes
<div className={is2Options
  ? "flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6"
  : "grid grid-cols-2 gap-3 sm:grid-cols-3"
}>
  {poll.options.sort(...).map((option) => (
    <Card
      className={cn(
        "cursor-pointer transition-all",
        is2Options && "w-full sm:w-64 md:w-72",
        // ... existing selection classes
      )}
    >
      <CardContent className={cn(
        "flex flex-col items-center justify-center gap-2 px-3 py-4",
        is2Options ? "min-h-[120px] sm:min-h-[140px]" : "min-h-[80px]"
      )}>
```

### FIX-04: Session Dropdown Pattern
```typescript
// Source: Exact bracket-quick-create.tsx pattern
// In PollForm component, when mode === 'quick':
<div className="space-y-2">
  <h2 className="text-sm font-medium text-muted-foreground">
    Assign to session (optional)
  </h2>
  <select
    value={selectedSessionId ?? ''}
    onChange={(e) => setSelectedSessionId(e.target.value || null)}
    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
  >
    <option value="">No session (assign later)</option>
    {sessions.map((s) => (
      <option key={s.id} value={s.id}>
        {s.name ? `${s.name} (${s.code})` : `Unnamed Session (${s.code})`}
      </option>
    ))}
  </select>
</div>
```

### FIX-09: Start + Navigate Pattern
```typescript
// Source: Modified handleStatusChange for polls
function handleStatusChange(newStatus: PollStatus) {
  setError(null)
  startTransition(async () => {
    const result = await updatePollStatus({ pollId: poll.id, status: newStatus })
    if (result && 'error' in result) {
      setError(result.error as string)
    } else {
      if (newStatus === 'active') {
        // Navigate to live dashboard immediately
        router.push(`/polls/${poll.id}/live`)
      } else {
        router.refresh()
      }
    }
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual page refresh for poll results | Realtime via Supabase Broadcast (already built) | Phase 5 | FIX-07 -- verify it works, don't rebuild |
| Candidate list for name collisions | Direct prompt with last initial | Phase 36 (this fix) | FIX-03 -- simpler UX |
| Fullscreen API controlling overlay | Overlay independent of Fullscreen API | Phase 36 (this fix) | FIX-06 -- more robust |

## Open Questions

1. **FIX-07 Root Cause**
   - What we know: The realtime infrastructure (hook, broadcast, channel) appears complete and correct in code review
   - What's unclear: Why the teacher dashboard doesn't auto-update in practice -- could be WebSocket connectivity, Supabase config, or a subtle timing bug
   - Recommendation: During implementation, add debug logging to the `useRealtimePoll` subscription callback. Test with browser DevTools Network tab open to verify WS connection. If WS fails, verify the polling fallback triggers.

2. **FIX-03 Returning Students**
   - What we know: The new prompt replaces the candidate list for name collisions
   - What's unclear: How should returning students (who already have a participant record) rejoin? The current "That's me!" flow won't exist.
   - Recommendation: Keep the `claimIdentity` flow as a secondary path. When duplicates are found, show the "Name taken" prompt. But also provide a small link like "Returning? Tap here" that shows the candidate list. This preserves both flows without the candidate list being the default.

3. **FIX-08 Multi-Matchup SE Rounds**
   - What we know: SE brackets can have multiple voting matchups in a round (batch opened)
   - What's unclear: Should voter IDs be unioned (any matchup) or intersected (all matchups) for the sidebar?
   - Recommendation: Union -- show green dot if student voted on ANY matchup in the current round. This matches the intuitive meaning of "has participated."

## Sources

### Primary (HIGH confidence)
- Codebase analysis of all files listed in each fix section
- `src/actions/poll.ts` -- poll server actions (duplicatePoll, updatePollOptions, castPollVote)
- `src/lib/dal/poll.ts` -- poll DAL functions (duplicatePollDAL, updatePollOptionsDAL, createPollDAL)
- `src/hooks/use-realtime-poll.ts` -- poll realtime hook
- `src/hooks/use-realtime-bracket.ts` -- bracket realtime hook (reference for FIX-07)
- `src/components/teacher/live-dashboard.tsx` -- teacher bracket live dashboard (reference for FIX-08)
- `src/components/poll/presentation-mode.tsx` -- fullscreen implementation (FIX-06)
- `src/components/poll/poll-detail-view.tsx` -- poll detail page (FIX-09)
- `src/components/bracket/bracket-detail.tsx` -- bracket detail page (FIX-09)
- `src/components/bracket/bracket-status.tsx` -- bracket lifecycle controls (FIX-09)
- `src/components/student/simple-poll-vote.tsx` -- student voting grid (FIX-02, FIX-05)
- `src/components/student/name-disambiguation.tsx` -- name collision UI (FIX-03)
- `src/components/bracket/bracket-quick-create.tsx` -- bracket quick create with session dropdown (FIX-04)
- `prisma/schema.prisma` -- Poll, PollOption, PollVote, Bracket, Matchup, Vote models

### Secondary (MEDIUM confidence)
- `src/components/poll/poll-results.tsx` -- teacher results display (used by FIX-05 as reference)
- `src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx` -- student poll page (FIX-05 context)
- `src/lib/realtime/broadcast.ts` -- broadcast functions (FIX-07 verification)

## Metadata

**Confidence breakdown:**
- FIX-01 (ghost options): HIGH -- clear root cause in DAL, straightforward Prisma fix
- FIX-02 (2-option centering): HIGH -- simple CSS/layout change
- FIX-03 (name prompt): HIGH -- clear UI change, but needs care for returning student flow
- FIX-04 (session dropdown): HIGH -- exact reference implementation exists in bracket quick create
- FIX-05 (live results): HIGH -- data already available, just needs rendering
- FIX-06 (fullscreen): MEDIUM -- multiple possible causes, needs browser testing
- FIX-07 (poll realtime): MEDIUM -- code looks correct, may be environment/config issue
- FIX-08 (bracket indicators): HIGH -- root cause identified (selectedMatchupId defaults to null)
- FIX-09 (Go Live/Start): HIGH -- straightforward condition + navigation changes

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (stable codebase, no external dependency changes expected)
