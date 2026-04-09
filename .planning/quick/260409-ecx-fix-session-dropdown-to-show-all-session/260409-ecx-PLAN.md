---
phase: quick
plan: 260409-ecx
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/dashboard/shell.tsx
  - src/app/(dashboard)/sessions/page.tsx
autonomous: true
must_haves:
  truths:
    - "Session dropdown shows ALL active sessions, not just 6"
    - "Session dropdown items are sorted alphabetically by name"
    - "Session cards on dashboard are limited to 6 most recent"
    - "Session cards on sessions page show all sessions (existing behavior preserved)"
  artifacts:
    - path: "src/components/dashboard/shell.tsx"
      provides: "Dashboard with dropdown showing all sessions alphabetically and session cards limited to 6"
    - path: "src/app/(dashboard)/sessions/page.tsx"
      provides: "Sessions page with dropdown showing all sessions alphabetically"
  key_links:
    - from: "shell.tsx"
      to: "DashboardSessionDropdown"
      via: "props passing all active sessions sorted alphabetically"
---

<objective>
Fix the session dropdown to show ALL active sessions sorted alphabetically by name, and limit the `.slice(0, 6)` to only session card displays (not the dropdown).

Purpose: The previous implementation incorrectly applied `.slice(0, 6)` to the dropdown data. The dropdown should be a quick-switch to ANY active session, while the card grid can be limited to recent sessions.

Output: Corrected shell.tsx and sessions/page.tsx
</objective>

<context>
@src/components/dashboard/shell.tsx
@src/app/(dashboard)/sessions/page.tsx
@src/components/dashboard/dashboard-session-dropdown.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix shell.tsx — dropdown gets all sessions alphabetically</name>
  <files>src/components/dashboard/shell.tsx</files>
  <action>
In `DashboardShell` component (shell.tsx):

1. Remove the `.slice(0, 6)` from the `DashboardSessionDropdown` sessions prop (line 133). Pass ALL `activeSessions` to the dropdown.

2. Sort the sessions passed to the dropdown alphabetically by name. Before the JSX return, create a sorted copy:
   ```
   const dropdownSessions = [...activeSessions].sort((a, b) => {
     const nameA = (a.name || '').toLowerCase()
     const nameB = (b.name || '').toLowerCase()
     return nameA.localeCompare(nameB)
   })
   ```

3. Pass `dropdownSessions` (not `activeSessions`) to the `DashboardSessionDropdown` component, mapping with the same shape: `{ id, name, code, _count: { participants } }`.

The dashboard does not display session cards itself (it links to /sessions), so no card limiting is needed here.
  </action>
  <verify>
    <automated>npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>DashboardSessionDropdown in shell.tsx receives all active sessions sorted alphabetically with no .slice(0, 6)</done>
</task>

<task type="auto">
  <name>Task 2: Fix sessions/page.tsx — dropdown gets all sessions, cards unchanged</name>
  <files>src/app/(dashboard)/sessions/page.tsx</files>
  <action>
In `SessionsPage` component (sessions/page.tsx):

1. On line 18, the current code applies `.slice(0, 6)` when creating `activeSessions`:
   `const activeSessions = sessions.filter(s => s.status === 'active').slice(0, 6)`
   
   Change this to NOT slice — the dropdown needs all active sessions:
   `const activeSessions = sessions.filter(s => s.status === 'active')`

2. Create a sorted copy for the dropdown (same pattern as Task 1):
   ```
   const dropdownSessions = [...activeSessions].sort((a, b) => {
     const nameA = (a.name || '').toLowerCase()
     const nameB = (b.name || '').toLowerCase()
     return nameA.localeCompare(nameB)
   })
   ```

3. Pass `dropdownSessions` to the `DashboardSessionDropdown`, mapping with the same shape: `{ id, name, code, _count: { participants } }`.

4. The session cards grid below (lines 49-98) already iterates over `sessions` (ALL sessions, not just active), so that existing behavior is preserved. No changes needed to the card grid.

Note: The sessions page card grid intentionally shows ALL sessions (active + ended), not limited to 6. This is correct existing behavior.
  </action>
  <verify>
    <automated>npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Sessions page dropdown shows all active sessions alphabetically. Session cards grid continues to show all sessions as before.</done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- In shell.tsx: no `.slice(0, 6)` on dropdown data, sessions sorted alphabetically
- In sessions/page.tsx: no `.slice(0, 6)` on active sessions filter, dropdown gets alphabetically sorted sessions
- Session card grid on sessions page still shows all sessions (no regression)
</verification>

<success_criteria>
- Dropdown on dashboard shows ALL active sessions sorted A-Z by name
- Dropdown on sessions page shows ALL active sessions sorted A-Z by name
- No `.slice(0, 6)` applied to dropdown data in either file
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/260409-ecx-fix-session-dropdown-to-show-all-session/260409-ecx-SUMMARY.md`
</output>
