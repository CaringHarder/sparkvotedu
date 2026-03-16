---
phase: "quick-38"
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/teacher/live-dashboard.tsx
autonomous: true
requirements: [QUICK-38]
must_haves:
  truths:
    - "Sports brackets auto-sync scores every 60 seconds without teacher interaction"
    - "Auto-polling only activates for sports bracket type"
    - "Auto-polling skips if a sync is already in progress"
    - "Teacher sees an indicator that auto-sync is active"
    - "Polling cleans up on component unmount"
  artifacts:
    - path: "src/components/teacher/live-dashboard.tsx"
      provides: "Auto-polling useEffect and UI indicator"
      contains: "setInterval.*handleManualSync"
  key_links:
    - from: "auto-poll useEffect"
      to: "handleManualSync"
      via: "setInterval callback"
      pattern: "setInterval.*handleManualSync"
---

<objective>
Add client-side auto-polling to the sports bracket live dashboard so scores refresh every 60 seconds automatically.

Purpose: Teachers running sports brackets (e.g., NCAA March Madness) need live score updates without manually clicking "Sync Now" repeatedly. Avoids expensive Vercel cron upgrades.
Output: Modified live-dashboard.tsx with auto-polling useEffect and small UI indicator.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/teacher/live-dashboard.tsx

Key existing code:
- Line 134: `const isSports = bracket.bracketType === 'sports'`
- Line 211: `const [isSyncing, setIsSyncing] = useState(false)`
- Lines 897-912: `handleManualSync` wrapped in `useCallback(() => {...}, [])` -- stable reference, safe for interval
- Lines 956-960: Existing 30s tick interval for relative time display (pattern to follow)
- Lines 1684-1696: Sync button UI area where indicator should appear
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add auto-polling useEffect and UI indicator for sports brackets</name>
  <files>src/components/teacher/live-dashboard.tsx</files>
  <action>
1. Add a new useEffect immediately after the existing 30s tick interval (after line 960). Follow the same pattern:

```typescript
// Auto-poll sports scores every 60 seconds
useEffect(() => {
  if (!isSports) return
  const interval = setInterval(() => {
    if (!isSyncing) {
      handleManualSync()
    }
  }, 60000)
  return () => clearInterval(interval)
}, [isSports, handleManualSync])
```

NOTE: `isSyncing` is read inside the interval callback (closure captures current ref each tick). Since `handleManualSync` already sets `isSyncing = true` at the start and `false` in finally, overlapping calls are prevented. The `isSyncing` check in the interval is a guard so we skip the call entirely if one is in-flight. Do NOT add `isSyncing` to the dependency array -- that would restart the interval on every sync.

2. Add a small "Auto-syncing every 60s" indicator in the sync button area. Insert it between the "Last synced" span (line 1687) and the "Sync Now" button (line 1690):

```tsx
{/* Auto-sync indicator */}
<span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
  Auto-sync 60s
</span>
```

This is already inside the `{isSports && (` block so it only shows for sports brackets. Keep it compact -- the pulsing dot provides visual confirmation that auto-sync is active.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>
- Sports bracket live dashboard auto-polls handleManualSync every 60 seconds
- Polling only runs when isSports is true
- Polling skips if isSyncing is true
- Interval cleans up on unmount
- Small green pulsing indicator shows "Auto-sync 60s" next to the sync button
- TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes
2. Visual check: Open a sports bracket live dashboard, confirm the green "Auto-sync 60s" indicator appears next to the Sync Now button
3. Functional check: Wait 60 seconds, observe that the "Last synced" time resets (confirming auto-poll fired)
</verification>

<success_criteria>
Sports bracket live dashboard automatically syncs scores every 60 seconds with a visible indicator. Non-sports brackets are unaffected.
</success_criteria>

<output>
After completion, create `.planning/quick/38-add-client-side-polling-and-manual-sync-/38-SUMMARY.md`
</output>
