---
phase: 02-polish-student-dashboard-ended-activity-ux
verified: 2026-03-17T00:00:00Z
status: human_needed
score: 5/6 must-haves verified
human_verification:
  - test: "Start a session with 2+ activities (mix of bracket and poll), join as student, then end one activity as teacher"
    expected: "Ended card dims to ~55% opacity, slides down to Closed section, 'Closed' grey pill badge appears, section divider appears, active cards retain full opacity and pulsing dot"
    why_human: "Animation timing, visual opacity rendering, and real-time Supabase event flow require a live browser session"
  - test: "Tap a closed activity card"
    expected: "Navigates to the read-only view (bracket results or poll closed page)"
    why_human: "Navigation target correctness and read-only page rendering cannot be verified statically"
  - test: "As teacher, end ALL activities; then reopen one"
    expected: "All-closed state shows friendly 'No active activities right now' message above closed cards, student does NOT auto-navigate. When one reopened, card animates back to Active section with full opacity restored"
    why_human: "Real-time status change round-trip and animation direction (upward to active) require live verification"
  - test: "Single-activity auto-nav: 1 active + 0 closed"
    expected: "Student auto-navigates to the single active activity"
    why_human: "Router.push firing and navigation outcome require a live browser"
  - test: "Single-activity auto-nav guard: 1 active + 1 closed"
    expected: "Student still auto-navigates to the single active activity (not blocked by closed card)"
    why_human: "Requires live session to confirm activeActivities.length === 1 triggers correctly despite closedActivities being non-empty"
---

# Phase 02: Polish Student Dashboard Ended Activity UX — Verification Report

**Phase Goal:** Polish the student dashboard so ended/completed activities are visually distinct from active ones, with section-based layout and animated transitions.
**Verified:** 2026-03-17
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | Closed activities appear dimmed (~55% opacity) with a grey 'Closed' badge instead of 'Voted' or 'Active' | ✓ VERIFIED | `activity-card.tsx:28` applies `opacity-55 cursor-default`; lines 98-101 render grey "Closed" pill when `isClosed=true`; conditional order is `isClosed ? closed : hasVoted ? voted : active` |
| 2   | Student dashboard splits into Active section (top) and Closed section (below divider) | ✓ VERIFIED | `activity-grid.tsx:94-161` — LayoutGroup wraps active grid (line 96), divider (line 133), closed grid (line 142); divider only renders when both sections have items (line 132) |
| 3   | Auto-navigation only triggers for a single active activity — closed-only state shows grid with friendly message | ✓ VERIFIED | `activity-grid.tsx:50` checks `activeActivities.length === 1`; lines 120-129 render inline "No active activities right now" message when `activeActivities.length === 0 && closedActivities.length > 0` |
| 4   | When activity ends in real-time, card animates from Active section down to Closed section | ? UNCERTAIN | `layoutId={activity.id}` on motion.div in both sections (lines 101, 146) + `LayoutGroup` wrapper (line 93) provide the cross-container animation hook. Cannot verify animation fires correctly without a live Supabase realtime event |
| 5   | Reopened activity animates back from Closed section to Active section with opacity restored | ? UNCERTAIN | Same LayoutGroup + layoutId mechanism would drive the reverse animation. Cannot verify without live testing |
| 6   | Tapping a closed card still navigates to the read-only view | ✓ VERIFIED | `activity-card.tsx:35` keeps `onClick={onClick}` on the Card regardless of `isClosed`; `activity-grid.tsx:155` passes `onClick={() => navigateToActivity(activity)}` for closed cards using the same `navigateToActivity` callback |

**Score:** 4 of 6 truths fully verified programmatically (truths 4 and 5 require live animation observation — code structure is correct)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/components/student/activity-card.tsx` | Closed card visual treatment (opacity, badge) | ✓ VERIFIED | 133 lines; exports `ActivityCard`; `isClosed` prop (optional, defaults false); `opacity-55 cursor-default` on closed path; grey "Closed" pill badge at lines 98-101 |
| `src/components/student/activity-grid.tsx` | Two-section grid with divider, auto-nav guard, LayoutGroup animations | ✓ VERIFIED | 165 lines; imports LayoutGroup from motion/react; `CLOSED_STATUSES` Set at line 15; partitions at lines 38-39; auto-nav guard at line 50; two-section render at lines 94-161 |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `activity-grid.tsx` | `activity-card.tsx` | `isClosed` prop derived from `CLOSED_STATUSES.has(a.status)` | ✓ WIRED | `CLOSED_STATUSES` Set defined at line 15; `closedActivities` filtered at line 39; `isClosed={true}` passed at line 154, `isClosed={false}` at line 110 |
| `activity-grid.tsx` | `motion/react` | `LayoutGroup` wrapping both `AnimatePresence` sections | ✓ WIRED | Import at line 5; `<LayoutGroup>` opens at line 93, closes at line 162; both motion.div cards carry `layoutId={activity.id}` |

### Requirements Coverage

No requirement IDs declared (`requirements: []` in plan frontmatter). The phase is standalone — no REQUIREMENTS.md entries to cross-reference.

### Anti-Patterns Found

None. No TODO/FIXME/placeholder comments, no empty implementations, no stub return values found in either modified file.

### Human Verification Required

#### 1. Real-time close animation

**Test:** Start a session with 2+ activities. Join as student. As teacher, end one activity.
**Expected:** Card dims to ~55% opacity and slides down to the Closed section via the LayoutGroup layoutId animation. Grey "Closed" pill badge appears. Section divider appears between sections. Active cards retain full opacity and pulsing dot.
**Why human:** Animation timing and visual rendering require a live browser with a real Supabase realtime event firing.

#### 2. Closed card navigation

**Test:** Tap a closed activity card.
**Expected:** Navigates to the read-only view (bracket results or poll closed page), not an error or empty screen.
**Why human:** The navigation target page's read-only correctness cannot be verified statically.

#### 3. All-closed state and reopen animation

**Test:** As teacher, end ALL activities. Then reopen one.
**Expected:** All-closed state shows "No active activities right now / Hang tight" message above closed cards. Student does NOT auto-navigate. When one activity is reopened, its card animates back up to the Active section with full opacity restored.
**Why human:** Real-time round-trip event and reverse animation direction require live verification.

#### 4. Single-activity auto-nav (baseline)

**Test:** Session with 1 active activity, 0 closed. Join as student.
**Expected:** Student auto-navigates to the single active activity.
**Why human:** router.push execution and navigation outcome require a live browser.

#### 5. Single-activity auto-nav guard with closed cards present

**Test:** Session with 1 active activity + 1 closed activity. Join as student.
**Expected:** Student still auto-navigates to the single active activity (closed card does not block the guard).
**Why human:** Requires confirming `activeActivities.length === 1` fires the effect correctly when `closedActivities.length > 0`, which depends on live data.

### Gaps Summary

No implementation gaps found. Both artifacts are substantive, fully wired, and type-check clean. The 5 human verification items are all behavioral/visual — the code structure correctly implements every required pattern. Verification status is `human_needed` rather than `passed` solely because real-time animation fidelity and navigation targets must be confirmed in a live browser session.

---

_Verified: 2026-03-17_
_Verifier: Claude (gsd-verifier)_
