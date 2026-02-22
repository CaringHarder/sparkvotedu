# Phase 21: Poll Realtime Bug Fix - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix two bugs: (1) Teacher poll dashboard doesn't update in real-time when students vote, and (2) poll activation only broadcasts to the activity channel instead of the poll-specific channel. No new poll features — just make the existing realtime pipeline work correctly.

</domain>

<decisions>
## Implementation Decisions

### Vote update visuals
- Poll bars should smoothly animate to new percentages as votes arrive (animated bar growth)
- Show a running participation indicator ("X of Y students voted") that updates in real-time so the teacher knows when everyone has responded
- Count/percentage display and leading-option styling: Claude's discretion based on existing poll UI

### Activation experience
- When a teacher activates a poll, students already in the session should see it via the poll channel (not just activity channel) — Claude decides whether to auto-navigate or show a notification, based on existing bracket activation patterns for consistency
- Late joiners should land directly on the active poll with minimal friction
- When a teacher closes a poll, students should immediately see the final results (not be sent back to session home)
- Broadcast acknowledgment (e.g., "Poll sent to X students"): Claude's discretion based on feasibility

### Connection resilience
- Votes are persisted server-side the moment they're submitted — a student disconnect after voting does not lose their vote
- Teacher dashboard auto-recovers when navigating away and back — re-subscribes and fetches latest state automatically
- Reconnection strategy and stale-data warning: Claude's discretion on the most reliable approach

### Claude's Discretion
- Count vs percentage display on poll bars
- Leading option visual treatment (bold, color, or neutral)
- Student notification style on poll activation (auto-navigate vs toast/banner)
- Broadcast reach confirmation for teachers
- Reconnection strategy (full refresh vs event replay)
- Connection-lost indicator visibility (banner vs silent reconnect)

</decisions>

<specifics>
## Specific Ideas

- Animated bar growth should feel dynamic and alive — not just number changes
- Participation indicator is important for classroom context (teacher needs to know "has everyone voted yet?")
- Late joiners going straight to the active poll mirrors the ideal classroom experience — no extra clicks

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-poll-realtime-bug-fix*
*Context gathered: 2026-02-21*
