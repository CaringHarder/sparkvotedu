---
phase: quick
plan: 260409-erc
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(dashboard)/sessions/page.tsx
  - src/components/dashboard/sidebar-nav.tsx
  - src/components/dashboard/shell.tsx
  - src/app/(dashboard)/sessions/[sessionId]/session-detail.tsx
  - src/app/(dashboard)/sessions/archived/page.tsx
  - src/components/teacher/session-workspace.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Visiting /sessions redirects to /dashboard"
    - "Sidebar 'Sessions' nav item links to /dashboard"
    - "Dashboard 'Create Session' card opens SessionCreator inline instead of navigating away"
    - "Back links from session detail and archived pages point to /dashboard"
    - "/sessions/[id] and /sessions/archived routes still work"
  artifacts:
    - path: "src/app/(dashboard)/sessions/page.tsx"
      provides: "Redirect from /sessions to /dashboard"
      contains: "redirect"
    - path: "src/components/dashboard/shell.tsx"
      provides: "Dashboard with SessionCreator integration"
      contains: "SessionCreator"
  key_links:
    - from: "src/app/(dashboard)/sessions/page.tsx"
      to: "/dashboard"
      via: "next/navigation redirect"
      pattern: "redirect.*dashboard"
    - from: "src/components/dashboard/sidebar-nav.tsx"
      to: "/dashboard"
      via: "navItems href"
      pattern: "href.*dashboard"
---

<objective>
Remove the redundant sessions list page and consolidate everything into the dashboard.

Purpose: The sessions page now duplicates the dashboard. Removing it simplifies navigation and makes the dashboard the single entry point for session management.
Output: /sessions redirects to /dashboard, all back-links updated, SessionCreator added to dashboard shell.
</objective>

<execution_context>
@/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/.claude/get-shit-done/workflows/execute-plan.md
@/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/(dashboard)/sessions/page.tsx
@src/components/dashboard/shell.tsx
@src/components/dashboard/sidebar-nav.tsx
@src/components/teacher/session-creator.tsx
@src/app/(dashboard)/sessions/[sessionId]/session-detail.tsx
@src/app/(dashboard)/sessions/archived/page.tsx
@src/components/teacher/session-workspace.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace sessions page with redirect and update sidebar nav</name>
  <files>src/app/(dashboard)/sessions/page.tsx, src/components/dashboard/sidebar-nav.tsx</files>
  <action>
1. Replace the entire contents of `src/app/(dashboard)/sessions/page.tsx` with a simple server-side redirect to `/dashboard`:
```tsx
import { redirect } from 'next/navigation'

export default function SessionsPage() {
  redirect('/dashboard')
}
```
This preserves the route for bookmarks/links but immediately redirects to dashboard.

2. In `src/components/dashboard/sidebar-nav.tsx`, change the Sessions nav item href from `/sessions` to `/dashboard`:
   - Line 16: Change `{ label: 'Sessions', href: '/sessions', icon: Users }` to `{ label: 'Sessions', href: '/dashboard', icon: Users }`
   
   IMPORTANT: Since mobile-nav.tsx imports `navItems` from this file, the mobile nav will automatically pick up the change -- no separate edit needed.

3. Also in sidebar-nav.tsx, the `isActive` logic uses prefix matching. With both "Dashboard" (`/dashboard`) and "Sessions" (`/dashboard`) pointing to the same href, only one will highlight. Since Sessions is now just Dashboard, REMOVE the Sessions entry entirely from `navItems`. The "Dashboard" item already covers `/dashboard`. The "Archived" item (`/sessions/archived`) remains and still works independently.

Updated navItems:
```tsx
export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Archived', href: '/sessions/archived', icon: Archive },
]
```

Remove the `Users` import from lucide-react since it is no longer used in this file (check -- it may also be unused after removing the Sessions nav item).
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Sessions page redirects to /dashboard. Sidebar nav no longer has a separate "Sessions" link. Archived link remains.</done>
</task>

<task type="auto">
  <name>Task 2: Update dashboard shell and all back-links</name>
  <files>src/components/dashboard/shell.tsx, src/app/(dashboard)/sessions/[sessionId]/session-detail.tsx, src/app/(dashboard)/sessions/archived/page.tsx, src/components/teacher/session-workspace.tsx</files>
  <action>
1. **src/components/dashboard/shell.tsx** -- Make three changes:

   a. Replace the "Create Session" Link card (lines 58-75) with a section that renders the `SessionCreator` component inline. Import `SessionCreator` from `@/components/teacher/session-creator`. Since `SessionCreator` is a client component ('use client') and `DashboardShell` is a server component, this is fine -- Next.js handles the boundary automatically. Replace the Link card with just the SessionCreator component rendered in the same grid slot. Keep the "Plan & Usage" card as-is.

   b. Remove the "View all" link (line 149-153, the `<Link href="/sessions">View all</Link>`). The active sessions list is already shown right below on the dashboard -- there is no separate page to "view all" anymore.

   c. In the empty state section (lines 186-203), change the `<Link href="/sessions">Create your first session</Link>` button to instead render the `SessionCreator` component inline, or simply change the link to `href="/dashboard"` (which is the current page). Better approach: remove the Link button entirely and just show the text, since the SessionCreator is already rendered above in the grid. Update the empty state to say "Create a session above to start engaging your students."

   Remove unused imports after changes: `Plus`, `ArrowRight`, `Zap` may become unused (check each). Keep `Sparkles` if still used in empty state.

2. **src/app/(dashboard)/sessions/[sessionId]/session-detail.tsx** line 67:
   Change `<Link href="/sessions"` to `<Link href="/dashboard"` and change the link text from "Sessions" to "Dashboard".

3. **src/app/(dashboard)/sessions/archived/page.tsx** line 41:
   Change `href="/sessions"` to `href="/dashboard"`.

4. **src/components/teacher/session-workspace.tsx** line 132:
   Change `<Link href="/sessions"` to `<Link href="/dashboard"` and change the link text from "Sessions" to "Dashboard".
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30 && echo "--- grep check ---" && grep -rn 'href="/sessions"' src/ --include="*.tsx" --include="*.ts" | grep -v '/sessions/' | grep -v 'archived' || echo "No stale /sessions links found"</automated>
  </verify>
  <done>Dashboard renders SessionCreator inline. All breadcrumb back-links point to /dashboard. No remaining href="/sessions" links (only /sessions/[id] and /sessions/archived references remain, which are correct).</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- no type errors
2. `grep -rn 'href="/sessions"' src/ --include="*.tsx"` -- should only show results inside `/sessions/[sessionId]/` route files linking to sub-resources, NOT any top-level `/sessions` links
3. Dev server: Visit /sessions -- should redirect to /dashboard
4. Dev server: Dashboard shows SessionCreator inline
5. Dev server: /sessions/archived still works with back arrow going to /dashboard
6. Dev server: Session detail breadcrumb says "Dashboard" and links to /dashboard
</verification>

<success_criteria>
- /sessions redirects to /dashboard (bookmarks preserved)
- Sidebar nav has Dashboard and Archived (no separate Sessions item)
- Dashboard renders SessionCreator component for inline session creation
- All back-links (session detail, archived, session workspace) point to /dashboard
- /sessions/[id] and /sessions/archived routes remain fully functional
- No TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/260409-erc-remove-sessions-list-page-redirect-sessi/260409-erc-SUMMARY.md`
</output>
