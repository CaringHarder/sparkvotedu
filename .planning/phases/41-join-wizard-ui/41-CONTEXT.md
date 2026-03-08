# Phase 41: Join Wizard UI - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the old single-input NameEntryForm with a two-path join experience: new students get a fun name splash + 3-step wizard (first name, last initial, emoji pick, welcome); returning students enter their name to reclaim their existing identity. Phase 42 handles localStorage auto-rejoin. Phase 44 handles teacher sidebar and student self-edit.

</domain>

<decisions>
## Implementation Decisions

### Entry Point: New vs Returning Split
- First screen asks "I'm new here!" vs "I've been here before" — two big tappable cards
- New path: fun name splash → wizard steps → welcome
- Returning path: name lookup → disambiguation/auto-reclaim → welcome back splash
- This prevents confusion of showing a returning student a new fun name they won't keep

### Wizard Step Transitions
- Slide left/right transitions between steps (carousel-style)
- Smooth timing: 300-400ms with easing
- Forward-only navigation — no back button, steps are locked once completed
- Step dots (small dots at top) show current position in wizard
- Input auto-focuses when each step slides in
- Enter key advances to next step (in addition to tapping Continue button)

### Step Content
- Each step has a friendly question header AND placeholder text in the input field
- Continue button appears on first keystroke (not visible until student types) — animated reveal
- Continue button uses the same green as the Vote button in simple polls

### Last Initial Step
- Claude's discretion whether last initial is a separate slide or animates in-place below first name

### Fun Name Reveal (New Students Only)
- Full-screen splash: "You are... [Fun Name]" with animation
- Auto-advances after 2-3 seconds (no button required)
- Fun name stays pinned at top throughout all wizard steps as a small header bar
- Claude's discretion on entrance animation (scale up, bounce, fade, etc.)

### Emoji Picker
- Fixed 4x4 grid of all 16 curated emojis visible at once — no scrolling
- All emojis available equally — no dimming of taken emojis, no session-uniqueness enforcement
- Tapping an emoji: bounce animation + small checkmark appears
- Auto-advances to welcome screen on tap (no separate confirm button needed)

### Returning Student Flow
- After tapping "I've been here before", student enters first name
- System checks for matches after first name entry (early detection)
- Single match: auto-reclaim silently (no confirmation needed)
- Multiple matches: disambiguation screen with tappable cards showing fun name + emoji per identity, plus "None of these" option
- No matches found: offer to join as new student (routes to new student path)
- "None of these" on disambiguation: Claude's discretion (create new identity or re-enter name)
- After successful reclaim: "Welcome back!" splash showing fun name + emoji, auto-enters session

### Claude's Discretion
- Last initial step: separate slide vs animate in-place
- Fun name splash entrance animation style
- First name validation/character limits
- "None of these" fallback behavior on disambiguation
- Welcome screen layout and auto-advance timing

</decisions>

<specifics>
## Specific Ideas

- Continue button green should match the existing Vote button green in simple polls — same exact shade
- The new/returning split was a user insight to avoid confusion: returning students should never see a new fun name assigned before discovering they already have one
- Fun name pinned at top during wizard gives constant identity reinforcement
- Auto-advance patterns (splash, emoji tap) keep the flow fast for impatient students

</specifics>

<deferred>
## Deferred Ideas

- localStorage auto-rejoin that skips the wizard entirely — Phase 42
- Student self-edit of name and emoji — Phase 44
- Teacher sidebar name view toggle — Phase 44

</deferred>

---

*Phase: 41-join-wizard-ui*
*Context gathered: 2026-03-08*
