---
phase: quick
plan: 260409-drh
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/dashboard/dashboard-session-dropdown.tsx
  - src/components/dashboard/shell.tsx
  - src/app/(dashboard)/sessions/page.tsx
autonomous: true
must_haves:
  truths:
    - "Dashboard shows a dropdown with up to 6 most recent active sessions"
    - "Sessions page shows a dropdown with up to 6 most recent active sessions"
    - "Selecting a session from either dropdown navigates to /sessions/{id}"
  artifacts:
    - path: "src/components/dashboard/dashboard-session-dropdown.tsx"
      provides: "Reusable session quick-jump dropdown component"
    - path: "src/components/dashboard/shell.tsx"
      provides: "Dashboard page passing max 6 active sessions to dropdown"
    - path: "src/app/(dashboard)/sessions/page.tsx"
      provides: "Sessions page with session dropdown at top"
  key_links:
    - from: "src/components/dashboard/shell.tsx"
      to: "DashboardSessionDropdown"
      via: "passes activeSessions.slice(0, 6)"
    - from: "src/app/(dashboard)/sessions/page.tsx"
      to: "DashboardSessionDropdown"
      via: "filters active sessions, passes slice(0, 6)"
---

<objective>
Add a session quick-jump dropdown to both the dashboard and sessions pages, each showing the most recent 6 active sessions.

Purpose: Teachers need fast navigation to active sessions from both main landing pages without hunting through a list.
Output: Both pages render a session dropdown; dashboard caps at 6 active sessions; sessions page adds the same dropdown above the session grid.
</objective>

<execution_context>
@/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/.claude/get-shit-done/workflows/execute-plan.md
@/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/dashboard/dashboard-session-dropdown.tsx
@src/components/dashboard/shell.tsx
@src/app/(dashboard)/sessions/page.tsx
@src/lib/dal/class-session.ts (getTeacherSessions function)

<interfaces>
From src/components/dashboard/dashboard-session-dropdown.tsx:
```typescript
interface SessionItem {
  id: string
  name: string | null
  code: string
  _count: { participants: number }
}

interface DashboardSessionDropdownProps {
  sessions: SessionItem[]
}
```

From src/lib/dal/class-session.ts:
```typescript
export async function getTeacherSessions(teacherId: string)
// Returns sessions sorted active-first by createdAt desc, then ended by endedAt desc
// Each session has: id, name, code, status, createdAt, endedAt, _count.participants, _count.brackets, _count.polls
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Cap dashboard dropdown to 6 active sessions</name>
  <files>src/components/dashboard/shell.tsx</files>
  <action>
In DashboardShell, where activeSessions are passed to DashboardSessionDropdown (around line 133), slice the array to a maximum of 6 items:

Change:
```
sessions={activeSessions.map(s => ({...}))}
```
To:
```
sessions={activeSessions.slice(0, 6).map(s => ({...}))}
```

The activeSessions array is already sorted by createdAt desc from getTeacherSessions, so slicing gives the 6 most recent.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Dashboard passes at most 6 active sessions to the dropdown component.</done>
</task>

<task type="auto">
  <name>Task 2: Add session dropdown to sessions page</name>
  <files>src/app/(dashboard)/sessions/page.tsx</files>
  <action>
Import DashboardSessionDropdown at the top of sessions/page.tsx:
```typescript
import { DashboardSessionDropdown } from '@/components/dashboard/dashboard-session-dropdown'
```

After fetching sessions with getTeacherSessions (line 16), compute active sessions capped at 6:
```typescript
const activeSessions = sessions.filter(s => s.status === 'active').slice(0, 6)
```

Insert the dropdown between the page header (h1 + p) and the SessionCreator component, so it appears prominently at the top. Render it conditionally when there are active sessions:

```tsx
{activeSessions.length > 0 && (
  <DashboardSessionDropdown
    sessions={activeSessions.map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      _count: { participants: s._count.participants },
    }))}
  />
)}
```

Place this inside the existing `space-y-8` div, between the header div and the SessionCreator.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Sessions page shows a session quick-jump dropdown with up to 6 active sessions above the session creator. Selecting a session navigates to its detail page.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

No new trust boundaries introduced. Both pages already authenticate the teacher and fetch only their own sessions via getTeacherSessions(teacher.id).

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | I (Info Disclosure) | Session dropdown | accept | Sessions already scoped to authenticated teacher; no cross-tenant data exposure |
</threat_model>

<verification>
1. Visit /dashboard -- dropdown shows up to 6 active sessions (or empty state if none)
2. Visit /sessions -- dropdown shows up to 6 active sessions above the session creator
3. Select a session from either dropdown -- navigates to /sessions/{id}
4. TypeScript compiles without errors
</verification>

<success_criteria>
- Dashboard dropdown renders max 6 active sessions (not all)
- Sessions page has a new dropdown matching the dashboard's appearance
- Both dropdowns navigate to the correct session detail page on selection
- No TypeScript or build errors
</success_criteria>

<output>
After completion, create `.planning/quick/260409-drh-the-dashboard-and-sessions-page-should-b/260409-drh-SUMMARY.md`
</output>
