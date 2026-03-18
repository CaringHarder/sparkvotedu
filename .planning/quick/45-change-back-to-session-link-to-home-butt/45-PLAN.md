---
phase: "45"
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx
  - src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
autonomous: true
requirements: [QUICK-45]
must_haves:
  truths:
    - "Student sees a prominent blue HOME button with home icon instead of small text link"
    - "HOME button navigates back to the student session dashboard"
    - "Button is easy for younger students to identify and tap"
  artifacts:
    - path: "src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx"
      provides: "HOME button replacing back-to-session text link on poll pages"
    - path: "src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx"
      provides: "HOME button replacing back-to-brackets text link on bracket pages"
  key_links:
    - from: "HOME button"
      to: "/session/${sessionId}"
      via: "Next.js Link component"
---

<objective>
Replace the small "Back to session" / "Back to brackets" text links on student activity pages with a prominent blue HOME button featuring a home icon. This makes navigation easier for younger students who may not notice the small text link.

Purpose: Improve navigation UX for younger students by providing a large, visually obvious button.
Output: Updated poll and bracket student pages with HOME button.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx
@src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace backLink in poll and bracket student pages with HOME button</name>
  <files>src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx, src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx</files>
  <action>
In BOTH files, replace the `backLink` variable definition.

Current pattern (small text link with arrow SVG):
```tsx
const backLink = (
  <Link
    href={`/session/${sessionId}`}
    className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
  >
    <svg ...>...</svg>
    Back to session
  </Link>
)
```

Replace with a prominent blue HOME button:
```tsx
import { Home } from 'lucide-react'
```

```tsx
const backLink = (
  <Link
    href={`/session/${sessionId}`}
    className="mb-4 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 active:bg-blue-700 transition-colors"
  >
    <Home className="h-4 w-4" />
    HOME
  </Link>
)
```

Key details:
- Add `import { Home } from 'lucide-react'` at the top of each file (merge with existing lucide imports if any)
- Blue background (bg-blue-500) with white text for high visibility
- Rounded corners, padding, and shadow for button appearance
- Active state for touch feedback on mobile (active:bg-blue-700)
- Keep the variable name `backLink` unchanged so all existing usages continue working
- In the bracket page, the text currently says "Back to brackets" -- change to "HOME" as well
- Keep the `mb-4` spacing class to maintain layout
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Both student activity pages show a blue HOME button with home icon instead of the previous small text link. TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- Visual check: navigate to a student poll or bracket page and confirm the blue HOME button appears
- Button navigates to the session dashboard when clicked
</verification>

<success_criteria>
- The "Back to session" and "Back to brackets" text links are replaced with prominent blue HOME buttons with a home icon in both the poll and bracket student pages
- Button is visually prominent (blue background, white text, rounded) for younger students
- Navigation still works correctly to /session/${sessionId}
</success_criteria>

<output>
After completion, create `.planning/quick/45-change-back-to-session-link-to-home-butt/45-01-SUMMARY.md`
</output>
