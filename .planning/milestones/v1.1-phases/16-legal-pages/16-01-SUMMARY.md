---
phase: 16-legal-pages
plan: 01
subsystem: ui
tags: [next.js, legal, privacy, terms, static-pages, edtech]

# Dependency graph
requires:
  - phase: 08-landing-page
    provides: "Landing footer with /privacy and /terms links"
provides:
  - "Privacy policy page at /privacy"
  - "Terms of service page at /terms"
  - "Both pages accessible without authentication"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Legal page layout pattern: max-w-4xl prose with section/h2/p/ul structure"
    - "Back to home link pattern for standalone pages"

key-files:
  created:
    - src/app/privacy/page.tsx
    - src/app/terms/page.tsx
  modified: []

key-decisions:
  - "Teacher-friendly tone throughout -- plain English, short paragraphs, no dense legalese"
  - "Static server components (no 'use client') since content is purely static"
  - "max-w-4xl layout for prose readability vs max-w-6xl used by pricing/dashboard pages"

patterns-established:
  - "Legal page pattern: server component, back-to-home link, h1 + last-updated date, sectioned content with h2/p/ul"

# Metrics
duration: 2min
completed: 2026-02-16
---

# Phase 16 Plan 01: Legal Pages Summary

**Privacy policy and terms of service pages with teacher-friendly tone, covering student anonymity, COPPA/FERPA, billing, and acceptable use**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-16T21:48:45Z
- **Completed:** 2026-02-16T21:51:11Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Privacy policy page at /privacy with 10 sections covering data collection, student anonymity, COPPA/FERPA, third-party services, data security, retention, rights, and contact
- Terms of service page at /terms with 13 sections covering accounts, student participation, billing, acceptable use, IP, warranties, liability, termination, and governing law
- Both pages use plain, teacher-friendly language as specified in CONTEXT.md -- no dense legalese
- Footer links (/privacy, /terms) that already existed in landing-footer.tsx now resolve to real pages

## Task Commits

Each task was committed atomically:

1. **Task 1: Create privacy policy page at /privacy** - `f7e8779` (feat)
2. **Task 2: Create terms of service page at /terms** - `6543c06` (feat)

## Files Created/Modified
- `src/app/privacy/page.tsx` - Privacy policy page with 10 content sections, back-to-home link, SEO metadata
- `src/app/terms/page.tsx` - Terms of service page with 13 content sections, back-to-home link, SEO metadata

## Decisions Made
- Teacher-friendly tone throughout -- wrote for educators, not corporate legal teams, per user context decision
- Static server components (no "use client") since both pages are purely static content
- Used max-w-4xl for prose readability (narrower than the max-w-6xl used by pricing page which has cards)
- Contact emails: privacy@sparkvotedu.com for privacy, support@sparkvotedu.com for terms

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Legal pages complete. Both /privacy and /terms routes live and statically generated.
- Footer links now resolve correctly (previously 404).
- Phase 16 has only one plan, so phase is complete.

## Self-Check: PASSED

- FOUND: src/app/privacy/page.tsx
- FOUND: src/app/terms/page.tsx
- FOUND: 16-01-SUMMARY.md
- FOUND: commit f7e8779
- FOUND: commit 6543c06

---
*Phase: 16-legal-pages*
*Completed: 2026-02-16*
