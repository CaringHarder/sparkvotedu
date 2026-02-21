---
phase: 19-security-schema-foundation
plan: 02
subsystem: validation, ui
tags: [zod, profanity-filter, first-name, validation, banner, localStorage, tailwind, dark-mode]

# Dependency graph
requires:
  - phase: none
    provides: standalone utilities (no prior phase dependency)
provides:
  - firstNameSchema and validateFirstName utility for student identity validation
  - UpgradeBanner component for one-time migration notification
  - FIRST_NAME_MIN_LENGTH and FIRST_NAME_MAX_LENGTH constants for UI inputs
affects: [20-student-identity, join-flow, dashboard]

# Tech tracking
tech-stack:
  added: ["@2toad/profanity"]
  patterns: [zod-transform-pipe validation, localStorage-persisted dismissal, client-component in server layout]

key-files:
  created:
    - src/lib/validations/first-name.ts
    - src/components/dashboard/upgrade-banner.tsx
  modified:
    - src/app/(dashboard)/layout.tsx
    - package.json

key-decisions:
  - "Preserve name casing as entered -- no auto-capitalize; case-insensitive matching deferred to Phase 20 lookup"
  - "Reject emojis with clear error rather than silently stripping them"
  - "Profanity wholeWord mode with whitelist for legitimate names (Dick, Fanny, Willy, Randy, Gaylord)"
  - "Fail-silent banner when localStorage unavailable -- better to miss notification than show it forever"

patterns-established:
  - "Zod transform-then-pipe pattern: normalize input with .transform(), validate with .pipe() for clean chaining"
  - "localStorage-gated client component: useEffect mount check, fail-silent for private browsing"

requirements-completed: [SEC-01, SEC-02, SEC-03]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 19 Plan 02: Validation & Banner Summary

**First-name validation with profanity filtering (Zod + @2toad/profanity) and one-time upgrade banner for teacher dashboard**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T21:36:03Z
- **Completed:** 2026-02-21T21:38:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- First-name validation utility with full Unicode support, emoji rejection, profanity filtering, and whitespace normalization
- Dismissible upgrade banner ("We've upgraded! Previous sessions have been cleared.") integrated at top of all dashboard pages
- Build verified clean -- no TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install profanity library and create first-name validation utility** - `20a84b8` (feat)
2. **Task 2: Create upgrade banner and integrate into teacher dashboard layout** - `1c55818` (feat)

## Files Created/Modified
- `src/lib/validations/first-name.ts` - Zod schema + standalone validator for student first names (2-50 chars, no emoji, profanity filtered)
- `src/components/dashboard/upgrade-banner.tsx` - Client component: one-time blue info banner with X dismiss, dark mode, fade-out animation
- `src/app/(dashboard)/layout.tsx` - Added UpgradeBanner import and render before {children} in main content area
- `package.json` - Added @2toad/profanity dependency

## Decisions Made
- **Preserve casing as entered:** Do not auto-capitalize names. "jake" stored as "jake". Case-insensitive matching happens at lookup time in Phase 20.
- **Reject emojis (not strip):** Clear error message "Please use letters only -- no emojis" rather than silently removing characters.
- **Profanity wholeWord mode:** Avoids false positives on names containing profanity substrings. Whitelisted Dick, Fanny, Willy, Randy, Gaylord.
- **Fail-silent banner:** If localStorage is unavailable (private browsing), banner does not show at all rather than showing permanently.
- **Fade-out animation:** 300ms opacity transition on dismiss before DOM removal for polished UX.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `validateFirstName` and `firstNameSchema` ready for Phase 20 student identity join flow
- `FIRST_NAME_MIN_LENGTH` / `FIRST_NAME_MAX_LENGTH` constants available for UI input constraints
- Upgrade banner active on dashboard -- will show once per teacher on first visit

## Self-Check: PASSED

- [x] src/lib/validations/first-name.ts -- FOUND
- [x] src/components/dashboard/upgrade-banner.tsx -- FOUND
- [x] 19-02-SUMMARY.md -- FOUND
- [x] Commit 20a84b8 (Task 1) -- FOUND
- [x] Commit 1c55818 (Task 2) -- FOUND

---
*Phase: 19-security-schema-foundation*
*Completed: 2026-02-21*
