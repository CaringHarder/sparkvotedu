---
phase: quick-10
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/dal/bracket.ts
  - src/lib/dal/poll.ts
  - src/app/(dashboard)/brackets/page.tsx
  - src/app/(dashboard)/polls/page.tsx
  - src/app/(dashboard)/activities/page.tsx
  - src/app/(dashboard)/activities/activities-list.tsx
  - src/components/bracket/bracket-card.tsx
  - src/components/bracket/bracket-card-list.tsx
  - src/components/poll/poll-card.tsx
  - src/components/poll/poll-card-list.tsx
autonomous: true
requirements: [QUICK-10]

must_haves:
  truths:
    - "Bracket cards show viewing mode (Simple/Advanced), pacing info, and prediction mode where applicable"
    - "Bracket cards show linked session name when assigned to a session"
    - "Poll cards show linked session name when assigned to a session"
    - "Activities page, brackets page, and polls page are all filterable by session"
  artifacts:
    - path: "src/components/bracket/bracket-card.tsx"
      provides: "Complete bracket info display including viewingMode, pacing, predictive mode, session"
    - path: "src/components/poll/poll-card.tsx"
      provides: "Complete poll info display including session name"
    - path: "src/app/(dashboard)/activities/activities-list.tsx"
      provides: "Session filter dropdown for activities"
    - path: "src/app/(dashboard)/brackets/page.tsx"
      provides: "Session filter for brackets list"
    - path: "src/app/(dashboard)/polls/page.tsx"
      provides: "Session filter for polls list"
  key_links:
    - from: "src/lib/dal/bracket.ts"
      to: "prisma.bracket"
      via: "include session name in getTeacherBrackets query"
      pattern: "session.*select.*name"
    - from: "src/lib/dal/poll.ts"
      to: "prisma.poll"
      via: "include session relation in getPollsByTeacherDAL query"
      pattern: "session.*select.*name"
---

<objective>
Add complete contextual info to bracket and poll cards across all listing pages, and add session-based filtering to all three listing pages (Activities, Brackets, Polls).

Purpose: Teachers need to see at-a-glance what mode, pacing, and session each activity belongs to -- and filter by session when managing a classroom.

Output: Enhanced bracket/poll cards with full metadata; session filter dropdowns on all listing pages.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@prisma/schema.prisma (Bracket model: viewingMode, roundRobinPacing, predictiveMode, sessionId; Poll model: sessionId; ClassSession model: name, code)
@src/lib/dal/bracket.ts (getTeacherBrackets -- already includes session.code but not session.name; need to add viewingMode, roundRobinPacing, predictiveMode to serialization)
@src/lib/dal/poll.ts (getPollsByTeacherDAL -- does NOT include session relation yet)
@src/components/bracket/bracket-card.tsx (current bracket card -- shows type, status, entrants, date)
@src/components/bracket/bracket-card-list.tsx (list wrapper with AnimatePresence)
@src/components/poll/poll-card.tsx (current poll card -- shows type, status, votes)
@src/components/poll/poll-card-list.tsx (list wrapper with AnimatePresence)
@src/app/(dashboard)/brackets/page.tsx (brackets page -- fetches and serializes brackets)
@src/app/(dashboard)/polls/page.tsx (polls page -- fetches and serializes polls)
@src/app/(dashboard)/activities/page.tsx (activities page -- merges brackets + polls)
@src/app/(dashboard)/activities/activities-list.tsx (client component with status + type filters)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Expand DAL queries and card components with complete metadata</name>
  <files>
    src/lib/dal/bracket.ts
    src/lib/dal/poll.ts
    src/app/(dashboard)/brackets/page.tsx
    src/app/(dashboard)/polls/page.tsx
    src/app/(dashboard)/activities/page.tsx
    src/components/bracket/bracket-card.tsx
    src/components/bracket/bracket-card-list.tsx
    src/components/poll/poll-card.tsx
    src/components/poll/poll-card-list.tsx
  </files>
  <action>
    **DAL changes:**

    1. In `src/lib/dal/bracket.ts` `getTeacherBrackets()`: The session include already has `{ select: { id: true, code: true, status: true } }`. Add `name: true` to the select so session name is available. No other DAL change needed -- the bracket model fields (viewingMode, roundRobinPacing, predictiveMode) are already returned by findMany since there's no `select` clause limiting fields.

    2. In `src/lib/dal/poll.ts` `getPollsByTeacherDAL()`: Add `session: { select: { id: true, code: true, name: true } }` to the include alongside the existing `options` and `_count` includes.

    **Brackets page serialization** (`src/app/(dashboard)/brackets/page.tsx`):
    Add these fields to the serialized object passed to BracketCardList:
    - `viewingMode: b.viewingMode` (string, "simple" or "advanced")
    - `roundRobinPacing: b.roundRobinPacing ?? null` (string | null, "round_by_round" or "all_at_once")
    - `predictiveMode: b.predictiveMode ?? null` (string | null, "vote" or "predict_then_vote")
    - `sessionName: b.session?.name ?? null` (string | null)

    **Polls page serialization** (`src/app/(dashboard)/polls/page.tsx`):
    Add to serialized object:
    - `sessionCode: p.session?.code ?? null`
    - `sessionName: p.session?.name ?? null`

    **Activities page serialization** (`src/app/(dashboard)/activities/page.tsx`):
    Add to bracketItems meta:
    - `bracketType: b.bracketType`
    - `viewingMode: b.viewingMode`
    - `roundRobinPacing: b.roundRobinPacing ?? null`
    - `predictiveMode: b.predictiveMode ?? null`
    - `sessionName: b.session?.name ?? null`
    Add to pollItems meta:
    - `sessionName: p.session?.name ?? null`

    **BracketCard component** (`src/components/bracket/bracket-card.tsx`):
    1. Expand the `BracketCardProps.bracket` interface to include: `viewingMode?: string`, `roundRobinPacing?: string | null`, `predictiveMode?: string | null`, `sessionName?: string | null`.
    2. In the metadata row (below the title, near the existing type badge), add info pills/badges:
       - **Viewing mode badge**: Always show. If `viewingMode === 'simple'`, show a small pill "Simple" in teal/cyan coloring. If `viewingMode === 'advanced'`, show "Advanced" in slate/gray coloring. Use same rounded-full px-2 py-0.5 text-[10px] style as existing type badges.
       - **Pacing badge** (only for round_robin brackets): If `roundRobinPacing === 'all_at_once'`, show "All At Once" pill. If `roundRobinPacing === 'round_by_round'` or null, show "Round by Round" pill. Use orange/amber tones.
       - **Prediction mode badge** (only for predictive brackets): If `predictiveMode === 'predict_then_vote'`, show "Predict Then Vote" pill. If `predictiveMode === 'vote'` or null, show "Vote Only" pill. Use pink/rose tones.
       - **Session badge**: If `sessionName` is truthy, show a small pill with a graduation cap or book icon + session name (truncated to ~15 chars). Use blue coloring. If session name is null, don't show anything.
    3. Place these new badges in the existing badge row (line ~158 area, the `flex items-center gap-1.5` div). Keep the bracket type label and status badge. Add viewing mode badge after them. Add pacing and prediction mode badges only when applicable. Add session badge on a new line below the existing metadata row (in the `mt-3 flex items-center gap-4` section alongside entrants and date) so the card doesn't get too wide.

    **BracketCardList** (`src/components/bracket/bracket-card-list.tsx`):
    Update the `BracketData` interface to include the new fields: `viewingMode?: string`, `roundRobinPacing?: string | null`, `predictiveMode?: string | null`, `sessionName?: string | null`.

    **PollCard component** (`src/components/poll/poll-card.tsx`):
    1. Expand `PollCardData` interface to include: `sessionCode?: string | null`, `sessionName?: string | null`.
    2. In the metadata row (the `mt-1.5 flex flex-wrap items-center gap-2` div), add a session badge after the vote count: If `sessionName` is truthy, show a small pill with book/graduation-cap icon + session name (truncated ~15 chars). Use blue coloring matching the bracket card session badge style.

    **PollCardList** (`src/components/poll/poll-card-list.tsx`):
    Update `PollData` interface to include: `sessionCode?: string | null`, `sessionName?: string | null`.

    **Activities list card** (`src/app/(dashboard)/activities/activities-list.tsx`):
    1. Expand `ActivityItem.meta` interface to include: `bracketType?: string`, `viewingMode?: string`, `roundRobinPacing?: string | null`, `predictiveMode?: string | null`, `sessionName?: string | null`.
    2. In `ActivityItemCard`, add the same badge pattern as bracket/poll cards:
       - For brackets: show viewing mode badge and (where applicable) pacing and prediction mode badges.
       - For all items: show session name badge if present.
    3. Place these in the `mt-1.5 flex flex-wrap items-center gap-2` div, after the existing status, type, and meta info badges.

    **Style consistency**: All new badges should use the same `rounded-full px-2 py-0.5 text-xs font-medium` pattern used by existing type badges. Use Lucide icons where helpful (e.g., `BookOpen` for session, `Eye` for viewing mode). Import only from `lucide-react`.
  </action>
  <verify>
    Run `npx tsc --noEmit` to verify no TypeScript errors.
    Run `npm run build` to confirm the app builds without errors.
    Visually confirm in the cards that new badge info appears correctly.
  </verify>
  <done>
    Bracket cards display viewing mode, pacing (round robin), prediction mode (predictive), and linked session name. Poll cards display linked session name. Activities list cards display the same metadata for their respective types.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add session-based filtering to Brackets, Polls, and Activities pages</name>
  <files>
    src/app/(dashboard)/brackets/page.tsx
    src/app/(dashboard)/polls/page.tsx
    src/app/(dashboard)/activities/page.tsx
    src/app/(dashboard)/activities/activities-list.tsx
    src/components/bracket/bracket-card-list.tsx
    src/components/poll/poll-card-list.tsx
  </files>
  <action>
    The goal is to add a session filter dropdown to all three pages so teachers can filter activities by the session they belong to.

    **Brackets page** (`src/app/(dashboard)/brackets/page.tsx`):
    1. This is a server component. Derive the distinct session list from the already-fetched brackets: extract unique `{ sessionId, sessionName, sessionCode }` tuples from the brackets data. Also include a "No Session" option for brackets with null sessionId.
    2. Pass the sessions list as a prop to `BracketCardList`: `sessions: Array<{ id: string; name: string | null; code: string }>`.
    3. In `BracketCardList` (`src/components/bracket/bracket-card-list.tsx`):
       - Add a `sessions` prop to the interface.
       - Add `sessionFilter` state (default: `'all'`).
       - Render a filter bar above the card grid. Use a simple `<select>` element styled with Tailwind (rounded-md border bg-background px-3 py-1.5 text-sm) or a row of filter pills. Options: "All Sessions", then each session by name (or code if name is null), plus "No Session".
       - Filter `items` by session before rendering: if `sessionFilter !== 'all'`, filter brackets where the bracket's `sessionCode` (or a new `sessionId` field) matches.
       - Add `sessionId: string | null` to the `BracketData` interface and pass it through from the page serialization. In brackets/page.tsx serialization, add `sessionId: b.sessionId ?? null`.

    **Polls page** (`src/app/(dashboard)/polls/page.tsx`):
    1. The poll DAL now includes session data (from Task 1). Derive distinct sessions from the fetched polls the same way.
    2. Add `sessionId: p.sessionId ?? null` to the serialized poll data.
    3. Pass sessions list to `PollCardList`.
    4. In `PollCardList` (`src/components/poll/poll-card-list.tsx`):
       - Add `sessions` prop, `sessionFilter` state, filter bar, and filtering logic -- same pattern as BracketCardList.
       - Add `sessionId: string | null` to `PollData` interface.

    **Activities page** (`src/app/(dashboard)/activities/page.tsx`):
    1. Derive distinct sessions from the merged allItems. Add `sessionId` and `sessionName` to the unified item shape (add to bracketItems: `sessionId: b.sessionId ?? null`, to pollItems: `sessionId: p.sessionId ?? null`).
    2. Collect distinct sessions and pass as prop to `ActivitiesList`.
    3. In `ActivitiesList` (`src/app/(dashboard)/activities/activities-list.tsx`):
       - Add `sessions` prop to `ActivitiesListProps`.
       - Add `sessionFilter` state (default: `'all'`).
       - Add `sessionId: string | null` and `sessionName: string | null` to the `ActivityItem` interface (top level, not in meta).
       - Render session filter as a dropdown/select in the filter bar, alongside existing status tabs and type filters. Place it after the type filter pills with a small gap. Style: same select element pattern or pill style.
       - Apply session filter in the `filtered` computation: if `sessionFilter !== 'all'`, check `item.sessionId === sessionFilter` (or `item.sessionId === null` for "No Session" with a sentinel value like `'none'`).

    **Filter UX pattern**: Use a `<select>` dropdown rather than pills (since there could be many sessions). Style it consistently:
    ```
    <select
      value={sessionFilter}
      onChange={(e) => setSessionFilter(e.target.value)}
      className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
    >
      <option value="all">All Sessions</option>
      <option value="none">No Session</option>
      {sessions.map(s => (
        <option key={s.id} value={s.id}>{s.name || `Session ${s.code}`}</option>
      ))}
    </select>
    ```

    Add a label or prefix text "Session:" before the dropdown in muted-foreground text.
  </action>
  <verify>
    Run `npx tsc --noEmit` to verify no TypeScript errors.
    Run `npm run build` to confirm the app builds.
    Test filtering: selecting a session should show only activities linked to that session. Selecting "No Session" shows unlinked items. Selecting "All Sessions" shows everything.
  </verify>
  <done>
    All three listing pages (Activities, Brackets, Polls) have a session filter dropdown. Filtering by session correctly shows only items linked to that session. "No Session" filter shows items without a session. "All Sessions" shows everything.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with zero errors
- `npm run build` succeeds
- Bracket cards show: bracket type, viewing mode (Simple/Advanced), pacing (for round robin), prediction mode (for predictive), session name
- Poll cards show: poll type, session name
- Activities cards show: matching metadata per type + session name
- Session filter dropdown appears on /brackets, /polls, and /activities pages
- Filtering by a specific session correctly narrows the list
- "No Session" filter works for unlinked items
- "All Sessions" shows the full unfiltered list
</verification>

<success_criteria>
- All bracket cards display complete metadata: type, viewing mode, pacing/prediction mode where applicable, and session name
- All poll cards display session name when linked to a session
- Activities page cards mirror the same metadata
- All three listing pages have a working session filter dropdown
- TypeScript compiles clean, app builds successfully
</success_criteria>

<output>
After completion, create `.planning/quick/10-add-complete-info-to-bracket-poll-cards-/10-SUMMARY.md`
</output>
