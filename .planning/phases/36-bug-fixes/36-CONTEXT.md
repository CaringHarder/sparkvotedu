# Phase 36: Bug Fixes - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix nine known bugs across poll creation, student voting views, teacher dashboard, and activity lifecycle. No new features — only fixing broken or inconsistent behavior to match existing patterns and user expectations.

</domain>

<decisions>
## Implementation Decisions

### Duplicate poll option retention (FIX-01)
- Duplicate creates an exact copy immediately (existing behavior is fine)
- Duplicated polls always start with zero votes — clean slate
- Bug: when teacher removes options from a duplicated poll and clicks "Create Poll" (save), ghost options from the original persist
- Fix: ensure the save/create action correctly deletes removed options from the database
- Removed options should just disappear from the form instantly — no animation or fade-out

### 2-option poll centering (FIX-02)
- Polls with exactly 2 options: side-by-side larger cards, centered horizontally
- Cards should be larger than normal 3+ option cards — take advantage of the extra space for a more impactful feel
- No "VS" badge or divider between cards — just a clean gap
- On mobile (narrow screens): stack vertically, consistent with how grids reflow for 3+ options

### Duplicate name prompt (FIX-03)
- When name is taken, show: "Name taken. Add your last initial to join."
- Suggestion format: last initial (e.g., "David R.") — not numbered suffix
- Input keeps the original name ("David") — student appends their initial
- Tone: short and direct, not playful
- If student submits the exact same name again: block and re-prompt with the same message. Must differentiate to join.

### Poll Quick Create session selector (FIX-04)
- Poll Quick Create must include an "Assign to session (optional)" dropdown
- Match the bracket Quick Create layout exactly: same dropdown component, same label, same "No session (assign later)" default
- See bracket Quick Create screenshot for reference

### Show Live Results on student dashboard (FIX-05)
- When "Show Live Results" toggle is ON, students must see the same results display the teacher dashboard shows
- Results should update in real time as votes come in (same realtime pattern)

### Fullscreen mode auto-close (FIX-06)
- Fullscreen mode on teacher live dashboard auto-closes after a few seconds — it should NOT
- Fix: fullscreen stays open until teacher presses Esc or F key
- Only these two exit methods — no click-outside-to-exit

### Poll teacher dashboard realtime (FIX-07)
- Poll teacher live dashboard does not auto-update when students vote — requires manual page refresh
- Fix: implement realtime updates matching the pattern brackets already use (Supabase realtime subscription)

### Bracket vote indicators (FIX-08)
- Poll vote indicators work correctly: blue dot for joined, green dot + sort to bottom when voted
- Bracket vote indicators are broken: blue dot appears but never turns green when student votes (in both advanced and simple mode)
- Affects at least SE brackets, possibly all types (needs investigation)
- Fix: match the working poll indicator behavior — green dot on vote, sort voted students to bottom

### Go Live / Start flow (FIX-09)
- Go Live button currently shows and is clickable on bracket/poll detail pages before the activity is started — it should be hidden
- Clicking Start should both activate the activity (draft → active) AND auto-navigate to the live dashboard page
- Applies to both brackets and polls
- After start, if teacher navigates back to detail page: Claude's discretion on whether Go Live button appears

### Claude's Discretion
- Post-start Go Live button visibility on detail page (if teacher navigates back)
- Technical approach for poll realtime updates (match existing bracket pattern)
- Which bracket types are affected by vote indicator bug (investigate all types)
- Any internal refactoring needed to support these fixes

</decisions>

<specifics>
## Specific Ideas

- Poll Quick Create session dropdown should be identical to bracket's — same component, label, default value
- Student live results display should mirror teacher dashboard (not a simplified version)
- Duplicate name blocking should be strict — no "allow on second try" bypass
- Fullscreen exit is keyboard-only (Esc or F) — no mouse/click exit

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 36-bug-fixes*
*Context gathered: 2026-03-02*
