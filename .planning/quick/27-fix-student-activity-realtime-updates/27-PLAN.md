---
phase: quick-27
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/hooks/use-realtime-activities.ts
autonomous: true
must_haves:
  truths:
    - "Activity grid updates via HTTP polling when WebSocket is blocked"
    - "Activity grid updates via WebSocket when connection succeeds"
    - "Hook returns transport state ('websocket' | 'polling')"
  artifacts:
    - path: "src/hooks/use-realtime-activities.ts"
      provides: "Realtime activities hook with polling fallback"
      contains: "setTransport"
  key_links:
    - from: "src/hooks/use-realtime-activities.ts"
      to: "/api/sessions/{sessionId}/activities"
      via: "setInterval fetch every 3s when WS fails"
      pattern: "setInterval.*fetchActivities.*3000"
---

<objective>
Add HTTP polling fallback to useRealtimeActivities hook so the student activity grid updates on school networks that block WebSocket connections.

Purpose: Students on restrictive networks see a frozen activity grid because the hook relies solely on Supabase Realtime (WebSocket). The proven fallback pattern from useRealtimePoll/useRealtimeBracket must be applied here.
Output: Updated hook with 5-second WS timeout and 3-second polling fallback.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/hooks/use-realtime-activities.ts
@src/hooks/use-realtime-poll.ts (lines 140-190 for the proven fallback pattern)
@src/components/student/activity-grid.tsx
</context>

<interfaces>
<!-- From use-realtime-activities.ts (current return) -->
```typescript
export interface Activity {
  id: string
  name: string
  type: 'bracket' | 'poll'
  participantCount: number
  hasVoted: boolean
  status: string
}
// Currently returns: { activities: Activity[], loading: boolean }
// After fix returns: { activities: Activity[], loading: boolean, transport: 'websocket' | 'polling' }
```

<!-- From activity-grid.tsx (current consumer) -->
```typescript
// Line 29 — destructures hook return:
const { activities, loading } = useRealtimeActivities(sessionId, participantId)
// Adding `transport` to return is non-breaking (unused fields ignored by destructuring)
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Add WebSocket timeout and HTTP polling fallback to useRealtimeActivities</name>
  <files>src/hooks/use-realtime-activities.ts</files>
  <action>
Apply the proven transport fallback pattern from useRealtimePoll (lines 168-178) to useRealtimeActivities:

1. Add `transport` state: `const [transport, setTransport] = useState<'websocket' | 'polling'>('websocket')`

2. Inside the useEffect, add a `let wsConnected = false` flag before the channel subscription.

3. In the existing `.subscribe()` callback where `status === 'SUBSCRIBED'`, set `wsConnected = true` (keep existing fetchActivities call).

4. After the channel subscription block, add the 5-second timeout:
```typescript
let pollInterval: ReturnType<typeof setInterval> | null = null
const wsTimeout = setTimeout(() => {
  if (!wsConnected) {
    setTransport('polling')
    fetchActivities()
    pollInterval = setInterval(fetchActivities, 3000)
  }
}, 5000)
```

5. Update the cleanup return to also clear the timeout and polling interval:
```typescript
return () => {
  supabase.removeChannel(channel)
  document.removeEventListener('visibilitychange', handleVisibility)
  clearTimeout(wsTimeout)
  if (pollInterval) clearInterval(pollInterval)
}
```

6. Update the return statement to include transport:
```typescript
return { activities, loading, transport }
```

Do NOT modify the existing broadcast subscription or visibility change logic. The polling fallback is additive only.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit src/hooks/use-realtime-activities.ts 2>&1 | head -20</automated>
  </verify>
  <done>Hook compiles without errors, exports transport field, has 5s WS timeout with 3s polling fallback matching useRealtimePoll pattern</done>
</task>

<task type="auto">
  <name>Task 2: Verify no breaking changes in activity-grid consumer</name>
  <files>src/components/student/activity-grid.tsx</files>
  <action>
Run TypeScript compilation on the activity-grid component to confirm the hook's new return shape is backward-compatible (adding `transport` to return object does not break existing destructuring of `{ activities, loading }`).

No code changes needed in activity-grid.tsx -- the transport field is additive and optional to consume. This task is verification-only.

If tsc reports errors in activity-grid.tsx, fix them (unlikely since we only added a field to the return object).
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit src/components/student/activity-grid.tsx 2>&1 | head -20</automated>
  </verify>
  <done>activity-grid.tsx compiles cleanly with the updated hook, no runtime breakage</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes for both modified hook and its consumer
2. `grep -n 'setTransport\|pollInterval\|wsTimeout\|wsConnected' src/hooks/use-realtime-activities.ts` shows all four polling-fallback elements present
3. Hook return includes `transport` field
</verification>

<success_criteria>
- useRealtimeActivities has a 5-second WebSocket timeout that falls back to 3-second HTTP polling
- Pattern matches proven implementation in useRealtimePoll
- Existing WebSocket path unchanged when WS connects successfully
- No breaking changes to activity-grid.tsx consumer
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/27-fix-student-activity-realtime-updates/27-SUMMARY.md`
</output>
