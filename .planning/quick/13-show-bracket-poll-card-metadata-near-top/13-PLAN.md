---
phase: quick-13
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/shared/activity-metadata-bar.tsx
  - src/components/bracket/bracket-detail.tsx
  - src/components/teacher/live-dashboard.tsx
  - src/components/poll/poll-detail-view.tsx
  - src/app/(dashboard)/polls/[pollId]/live/client.tsx
  - src/app/(dashboard)/brackets/[bracketId]/page.tsx
  - src/app/(dashboard)/polls/[pollId]/page.tsx
  - src/app/(dashboard)/brackets/[bracketId]/live/page.tsx
  - src/app/(dashboard)/polls/[pollId]/live/page.tsx
autonomous: true
requirements: [QUICK-13]

must_haves:
  truths:
    - "Bracket detail page shows bracket type, viewing mode, pacing/prediction mode, session name, entrant count, and created date near the top"
    - "Bracket live dashboard shows the same metadata badges near the top bar"
    - "Poll detail page shows poll type, session name, option count, and created date near the top"
    - "Poll live page shows poll type, session name, and option count near the top"
    - "Metadata badges use the same visual style as the card badges from quick task 10"
  artifacts:
    - path: "src/components/shared/activity-metadata-bar.tsx"
      provides: "Shared metadata badge rendering for brackets and polls"
    - path: "src/components/bracket/bracket-detail.tsx"
      provides: "Bracket detail header with metadata badges"
    - path: "src/components/teacher/live-dashboard.tsx"
      provides: "Live dashboard top bar with metadata badges"
    - path: "src/components/poll/poll-detail-view.tsx"
      provides: "Poll detail header with metadata badges"
    - path: "src/app/(dashboard)/polls/[pollId]/live/client.tsx"
      provides: "Poll live header with metadata badges"
  key_links:
    - from: "src/components/bracket/bracket-detail.tsx"
      to: "src/components/shared/activity-metadata-bar.tsx"
      via: "import BracketMetadataBar"
      pattern: "BracketMetadataBar"
    - from: "src/components/teacher/live-dashboard.tsx"
      to: "src/components/shared/activity-metadata-bar.tsx"
      via: "import BracketMetadataBar"
      pattern: "BracketMetadataBar"
    - from: "src/components/poll/poll-detail-view.tsx"
      to: "src/components/shared/activity-metadata-bar.tsx"
      via: "import PollMetadataBar"
      pattern: "PollMetadataBar"
    - from: "src/app/(dashboard)/polls/[pollId]/live/client.tsx"
      to: "src/components/shared/activity-metadata-bar.tsx"
      via: "import PollMetadataBar"
      pattern: "PollMetadataBar"
---

<objective>
Show bracket/poll card metadata near the top of detail and live pages. When a teacher clicks a bracket or poll card, the same info displayed on the card (bracket type, viewing mode, pacing, prediction mode, session name, entrant count, dates) should also appear near the top of the detail and live pages.

Purpose: Teachers should see at-a-glance context about a bracket/poll on every page, not just the card listing. This eliminates needing to go back to the listing to remember what type/mode a bracket is.

Output: Metadata badges on 4 pages (bracket detail, bracket live, poll detail, poll live) using a shared component.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/10-add-complete-info-to-bracket-poll-cards-/10-SUMMARY.md
@src/components/bracket/bracket-card.tsx
@src/components/poll/poll-card.tsx
@src/components/bracket/bracket-detail.tsx
@src/components/teacher/live-dashboard.tsx
@src/components/poll/poll-detail-view.tsx
@src/app/(dashboard)/polls/[pollId]/live/client.tsx
@src/app/(dashboard)/brackets/[bracketId]/page.tsx
@src/app/(dashboard)/polls/[pollId]/page.tsx
@src/app/(dashboard)/brackets/[bracketId]/live/page.tsx
@src/app/(dashboard)/polls/[pollId]/live/page.tsx
@src/lib/bracket/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create shared metadata bar component and wire session name into server pages</name>
  <files>
    src/components/shared/activity-metadata-bar.tsx
    src/app/(dashboard)/brackets/[bracketId]/page.tsx
    src/app/(dashboard)/brackets/[bracketId]/live/page.tsx
    src/app/(dashboard)/polls/[pollId]/page.tsx
    src/app/(dashboard)/polls/[pollId]/live/page.tsx
  </files>
  <action>
Create `src/components/shared/activity-metadata-bar.tsx` with two exported components:

**BracketMetadataBar** - Props: `{ bracketType: string; status: string; viewingMode: string; roundRobinPacing?: string | null; predictiveMode?: string | null; sportGender?: string | null; entrantCount: number; sessionName?: string | null; createdAt: string }`.

Renders a horizontal flex row of badges matching the exact visual style from `bracket-card.tsx`:
- Bracket type badge (use same `BRACKET_TYPE_LABELS` map: double_elimination -> "Double Elim", round_robin -> "Round Robin", predictive -> "Predictive", sports -> "Sports"). Sports uses emerald colors, others use violet. Show sport gender next to sports badge.
- Viewing mode badge: Eye icon, teal for Simple, slate for Advanced. Use `rounded-full px-2 py-0.5 text-[10px] font-medium` sizing.
- Pacing badge (round robin only): orange tones, "All At Once" or "Round by Round".
- Prediction mode badge (predictive only): rose tones, "Predict Then Vote" or "Vote Only".
- Entrant count: Trophy icon + "{N} entrants" in muted text.
- Created date: Calendar icon + formatted date (Month Day, Year) in muted text.
- Session name badge (when present): BookOpen icon, blue-100 bg, blue-700 text, dark mode blue-900/40 bg, blue-300 text. Truncate at 15 chars.

Use `flex flex-wrap items-center gap-2 text-xs` for the container.

Import lucide icons: `Trophy, Calendar, Eye, BookOpen`.

**PollMetadataBar** - Props: `{ pollType: string; sessionName?: string | null; optionCount: number; createdAt: string }`.

Renders a horizontal flex row:
- Poll type badge: "Simple" with indigo colors or "Ranked" with purple colors (match `poll-card.tsx` pollTypeConfig). Use BarChart3 icon for simple, ListOrdered for ranked.
- Option count: "{N} options" in muted text.
- Created date: Calendar icon + formatted date in muted text.
- Session name badge (same style as bracket).

**Server page changes to pass session name:**

In `src/app/(dashboard)/brackets/[bracketId]/page.tsx`:
- The page already fetches `sessions` (active sessions for dropdown). It also has `bracket.sessionId`. Look up the session name: if `bracket.sessionId` is set, find the matching session from the sessions list. If not found in active sessions (session may be ended), do a separate prisma query: `prisma.classSession.findUnique({ where: { id: bracket.sessionId }, select: { name: true } })`. Pass `sessionName` as a new prop to `BracketDetail`.

In `src/app/(dashboard)/brackets/[bracketId]/live/page.tsx`:
- The page already fetches the session for its code. Expand the session query to also select `name`. Pass `sessionName` as a new prop to `LiveDashboard`.

In `src/app/(dashboard)/polls/[pollId]/page.tsx`:
- The page already fetches `sessions` (active sessions for dropdown). Look up session name from sessions list or do a separate query if not found. Pass `sessionName` as a new prop to `PollDetailView`.

In `src/app/(dashboard)/polls/[pollId]/live/page.tsx`:
- The page already fetches the session for its code. Expand the query to also select `name`. Pass `sessionName` as a new prop to `PollLiveClient`.
  </action>
  <verify>
Run `npx tsc --noEmit` -- no type errors. Verify `activity-metadata-bar.tsx` exports both components.
  </verify>
  <done>
Shared metadata bar component exists with BracketMetadataBar and PollMetadataBar exports. All four server pages pass sessionName prop to their respective client components.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add metadata bars to bracket detail, bracket live, poll detail, and poll live components</name>
  <files>
    src/components/bracket/bracket-detail.tsx
    src/components/teacher/live-dashboard.tsx
    src/components/poll/poll-detail-view.tsx
    src/app/(dashboard)/polls/[pollId]/live/client.tsx
  </files>
  <action>
**bracket-detail.tsx:**
- Add `sessionName?: string | null` to `BracketDetailProps` interface.
- Import `BracketMetadataBar` from `@/components/shared/activity-metadata-bar`.
- In the header section (after the existing `<span>` showing "{size} entrants . {totalRounds} rounds"), remove that span since the metadata bar will show entrant count. Keep the status badge inline with the title.
- Add a new line below the header flex row (below the `<h1>` row, above `bracket.description`): render `<BracketMetadataBar bracketType={bracket.bracketType} status={bracket.status} viewingMode={bracket.viewingMode} roundRobinPacing={bracket.roundRobinPacing} predictiveMode={bracket.predictiveMode} sportGender={bracket.sportGender} entrantCount={bracket.entrants.length} sessionName={sessionName} createdAt={bracket.createdAt} />`.
- Keep the "{totalRounds} rounds" info inline with the title or in the metadata bar area since the metadata bar does not show rounds.

**live-dashboard.tsx:**
- Add `sessionName?: string | null` to `LiveDashboardProps` interface.
- Import `BracketMetadataBar` from `@/components/shared/activity-metadata-bar`.
- In the top bar (the `<div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">` section around line 1027), add the metadata bar below the bracket name and LIVE badge. Insert it as a new row below the existing top bar OR as a secondary line within it. Best approach: add a second row inside the top bar card, separated by a thin border-t or just gap. Render `<BracketMetadataBar bracketType={bracket.bracketType} status={bracket.status} viewingMode={bracket.viewingMode} roundRobinPacing={bracket.roundRobinPacing} predictiveMode={bracket.predictiveMode} sportGender={bracket.sportGender} entrantCount={bracket.entrants.length} sessionName={sessionName} createdAt={bracket.createdAt} />`.
- Keep the live dashboard compact -- do not make the metadata bar too tall. Use the same `text-xs` sizing.

**poll-detail-view.tsx:**
- Add `sessionName?: string | null` to `PollDetailViewProps` interface.
- Import `PollMetadataBar` from `@/components/shared/activity-metadata-bar`.
- In the header section (after the existing poll type and options count spans), add a new line below: render `<PollMetadataBar pollType={poll.pollType} sessionName={sessionName} optionCount={poll.options.length} createdAt={poll.createdAt} />`.
- Since the header already shows poll type icon and option count inline, you can either keep those AND add the bar below (with the bar adding session name + date), or move the type/options into the bar and simplify the header. Preferred: keep the header lean (just title + status badge) and move poll type, option count to the metadata bar. This matches the bracket detail pattern.

**poll live client.tsx (src/app/(dashboard)/polls/[pollId]/live/client.tsx):**
- Add `sessionName?: string | null` to `PollLiveClientProps` interface.
- Import `PollMetadataBar` from `@/components/shared/activity-metadata-bar`.
- In the header (after `<h1>` showing poll question, around line 106), add the metadata bar below: render `<PollMetadataBar pollType={poll.pollType} sessionName={sessionName} optionCount={poll.options.length} createdAt={poll.createdAt} />`.
- Keep the QR code chip on the right side of the header, do not interfere with it.
  </action>
  <verify>
Run `npx tsc --noEmit` -- no type errors. Run `npm run build` to confirm no build errors. Visually inspect: navigate to a bracket detail page, bracket live page, poll detail page, and poll live page -- metadata badges should appear near the top matching the card styles.
  </verify>
  <done>
All four pages (bracket detail, bracket live, poll detail, poll live) display metadata badges near the top that match the visual style of the listing card badges. Session name, bracket/poll type, viewing mode, pacing, prediction mode, entrant/option count, and created date are all visible.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- `npm run build` succeeds
- Bracket detail page shows: bracket type badge, viewing mode, pacing (if round robin), prediction mode (if predictive), entrant count, created date, session name (if assigned)
- Bracket live page shows same metadata in the top bar area
- Poll detail page shows: poll type badge, option count, created date, session name (if assigned)
- Poll live page shows same metadata near the header
- Badge colors and styles match those on the bracket/poll listing cards exactly
</verification>

<success_criteria>
When a teacher clicks a bracket or poll card, the detail and live pages display the same metadata badges shown on the card near the top of the page.
</success_criteria>

<output>
After completion, create `.planning/quick/13-show-bracket-poll-card-metadata-near-top/13-SUMMARY.md`
</output>
