---
phase: 25-ux-parity
plan: 02
subsystem: ui
tags: [radix, dropdown-menu, motion, animate-presence, card-context-menu, useTransition]

# Dependency graph
requires:
  - phase: 25-01
    provides: CardContextMenu, DeleteConfirmDialog, renameBracket/renamePoll/archiveBracket/archivePoll server actions
provides:
  - Bracket cards with unified CardContextMenu (6 actions)
  - Poll cards with unified CardContextMenu (6 actions)
  - Inline rename on both card types
  - AnimatePresence card list animations (delete fade, archive slide, entry scale)
  - Archived item filtering from main list pages
  - Sign-out button with useTransition pending state
affects: [26-student-activity-removal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AnimatePresence wrapper pattern: client-side CardList components manage local items state for exit animations"
    - "Inline rename pattern: isRenaming state toggles h3 to input with Enter/Escape/blur handlers"
    - "onRemoved callback prop: card components delegate removal animation type to parent list"

key-files:
  created:
    - src/components/bracket/bracket-card-list.tsx
    - src/components/poll/poll-card-list.tsx
  modified:
    - src/components/bracket/bracket-card.tsx
    - src/components/poll/poll-card.tsx
    - src/app/(dashboard)/brackets/page.tsx
    - src/app/(dashboard)/polls/page.tsx
    - src/components/auth/signout-button.tsx

key-decisions:
  - "Used motion/react (v12) AnimatePresence with popLayout mode for smooth card removal animations"
  - "Poll rename action uses 'question' field (matching renamePoll schema) not 'name'"
  - "Archived items filtered at server level in page component before passing to client list"

patterns-established:
  - "CardList wrapper: client component receives server data, manages local state for AnimatePresence exit animations"
  - "Inline rename: parent card owns isRenaming state, CardContextMenu triggers via onStartRename callback"

requirements-completed: [UXP-01, UXP-02]

# Metrics
duration: 4min
completed: 2026-02-25
---

# Phase 25 Plan 02: Card Context Menu Integration & Sign-Out Pending State Summary

**Unified CardContextMenu on bracket and poll cards with inline rename, AnimatePresence removal animations, and sign-out button useTransition feedback**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-25T03:50:54Z
- **Completed:** 2026-02-25T03:54:40Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Both bracket and poll cards now use the shared CardContextMenu with 6 identical actions (Rename, Edit, Copy Link, Duplicate, Archive, Delete)
- Inline rename support on both card types following the editable-session-name.tsx pattern (auto-focus, Enter to save, Escape to cancel, blur to save)
- AnimatePresence card list animations: delete fades out, archive slides left, new cards scale in
- Polls page refactored from inline server-rendered cards to PollCard component
- Archived items filtered from both brackets and polls list pages
- Sign-out button shows "Signing out..." with disabled/dimmed state during processing

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite bracket-card and poll-card to use CardContextMenu with inline rename and animations** - `75e3b1e` (feat)
2. **Task 2: Add sign-out button pending state with useTransition** - `40bb82e` (feat)

## Files Created/Modified
- `src/components/bracket/bracket-card.tsx` - Replaced hand-rolled dropdown with CardContextMenu, added inline rename support
- `src/components/bracket/bracket-card-list.tsx` - New client wrapper with AnimatePresence for bracket card animations
- `src/components/poll/poll-card.tsx` - Replaced inline icon buttons with CardContextMenu, added inline rename and Link navigation
- `src/components/poll/poll-card-list.tsx` - New client wrapper with AnimatePresence for poll card animations
- `src/app/(dashboard)/brackets/page.tsx` - Uses BracketCardList, filters archived brackets
- `src/app/(dashboard)/polls/page.tsx` - Uses PollCardList with PollCard instead of inline cards, filters archived polls
- `src/components/auth/signout-button.tsx` - useTransition with "Signing out..." text and disabled/dimmed state

## Decisions Made
- Used `motion/react` (v12) AnimatePresence with `mode="popLayout"` for smooth card removal without layout shifts
- Poll rename sends `question` field to match the `renamePollInputSchema` (polls use `question` not `name`)
- Archived items are filtered at the server page level (`.filter(b => b.status !== 'archived')`) before passing to client list components
- Kept bracket actions bar (View Live, QR, Copy Link) outside the context menu per user decision

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed poll rename field name**
- **Found during:** Task 1 (poll-card rewrite)
- **Issue:** Plan specified `name` field for poll rename, but `renamePollInputSchema` expects `question`
- **Fix:** Changed `renamePoll({ pollId: poll.id, name: trimmed })` to `renamePoll({ pollId: poll.id, question: trimmed })`
- **Files modified:** `src/components/poll/poll-card.tsx`
- **Verification:** TypeScript type check passes, build succeeds
- **Committed in:** `75e3b1e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential fix for correctness -- rename would fail validation without matching the schema field name.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All UX parity changes for card context menus and sign-out feedback are complete
- Phase 25 is fully finished -- ready to proceed to Phase 26 (student activity removal)
- CardContextMenu Delete action is wired up and ready for Phase 26 to add student broadcast removal

## Self-Check: PASSED

All 7 files verified present. Both task commits (75e3b1e, 40bb82e) verified in git history.

---
*Phase: 25-ux-parity*
*Completed: 2026-02-25*
