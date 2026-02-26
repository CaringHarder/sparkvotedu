# Phase 26: Student Activity Removal - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

When a teacher deletes or archives a bracket or poll, it disappears from connected students' dashboards in real time — no page refresh needed. Students actively inside a deleted activity are redirected back to their dashboard. This phase covers the broadcast mechanism, student-side removal UX, and reconnection resilience. Creating new broadcast event types or modifying teacher-side delete/archive flows beyond adding broadcast calls is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Removal animation
- Card fades out with a clean opacity fade (100% → 0%) over ~200ms — no color tint or decoration changes
- After fade completes, remaining cards slide together smoothly over ~200ms to fill the gap
- When the last activity is removed, show a friendly empty state message (e.g., "No activities right now — your teacher will add some soon")
- Multiple rapid deletions: each card fades independently as its event arrives — Claude has discretion on batching/debouncing for performance

### Mid-activity behavior
- If a student is actively voting on a bracket or poll that gets deleted, show a brief friendly toast (e.g., "Your teacher ended this activity — heading back!") for ~2 seconds, then redirect to their session dashboard
- Same behavior for both brackets and polls — consistent experience regardless of activity type
- Tone is friendly/reassuring, not alarming

### Timing & feedback
- Student dashboard grid: silent removal only — card fades out with no toast or notification banner
- ~2 seconds latency for removal is acceptable (standard Supabase realtime)
- No teacher-side confirmation of broadcast delivery needed — teacher deletes and trusts it propagates
- Both delete AND archive trigger student-side removal — if the teacher doesn't want students seeing it, both paths remove it

### Edge cases
- Stale tabs: when tab regains focus or reconnects, fetch fresh activity data and remove any deleted/archived items
- Direct URL to deleted activity: redirect student to their session dashboard (no "not found" page)
- Network reconnection: when realtime connection restores after a drop, auto-refetch the full activity list to catch any missed deletions during the outage

### Claude's Discretion
- Subscription scope (session-scoped vs global) — pick based on existing realtime patterns
- Batching/debouncing strategy for rapid sequential deletions
- Exact empty state illustration/icon choice
- Toast duration fine-tuning
- Reconnection detection mechanism (Supabase channel status vs visibility API)

</decisions>

<specifics>
## Specific Ideas

- Fade-out should feel soft/subtle — students shouldn't be startled, just notice the card is gone
- The mid-activity redirect toast should feel like the teacher gently ending class, not an error
- "Your teacher ended this activity — heading back!" as the toast message reference

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-student-activity-removal*
*Context gathered: 2026-02-26*
