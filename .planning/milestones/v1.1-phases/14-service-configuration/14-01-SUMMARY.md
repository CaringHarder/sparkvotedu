---
phase: 14-service-configuration
plan: 01
subsystem: infra
tags: [env-vars, cron, image-upload, health-check, vercel, supabase-storage, stripe]

# Dependency graph
requires:
  - phase: 05-poll-creation
    provides: image upload component and compression utility
  - phase: 08-stripe-billing
    provides: Stripe integration library
  - phase: 10-sports-data
    provides: SportsDataIO provider and cron sync route
provides:
  - Complete .env.example with all 13 production env vars documented
  - Production-ready cron schedule (15-minute interval)
  - Image upload constraints aligned with user decisions (1200px, no GIF, 5MB)
  - GET /api/health endpoint for service configuration verification
affects: [14-02-service-configuration, deployment, admin-panel]

# Tech tracking
tech-stack:
  added: []
  patterns: [service-health-check, env-documentation]

key-files:
  created:
    - src/app/api/health/route.ts
  modified:
    - .env.example
    - vercel.json
    - src/lib/utils/image-compress.ts
    - src/components/poll/option-image-upload.tsx
    - src/app/api/polls/[pollId]/upload-url/route.ts

key-decisions:
  - "Health endpoint unauthenticated for deployment verification simplicity"
  - "SportsDataIO health check is env-var-only to conserve API quota"
  - "Critical services (auth, stripe) determine unhealthy; optional services determine degraded"

patterns-established:
  - "Health check pattern: each service checked independently with error isolation, aggregate status derived from critical vs optional classification"

# Metrics
duration: 2min
completed: 2026-02-16
---

# Phase 14 Plan 01: Service Configuration Prep Summary

**Production env documentation (13 vars), 15-min cron schedule, 1200px/no-GIF image constraints, and GET /api/health service status endpoint**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-16T15:51:03Z
- **Completed:** 2026-02-16T15:53:38Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Documented all 13 required production environment variables in .env.example with source comments for each
- Updated cron schedule from every 2 minutes to every 15 minutes per user decision
- Aligned image upload constraints: 1200px max dimension, JPG/PNG/WebP only (no GIF), 5MB at bucket level
- Created GET /api/health endpoint that checks Supabase Auth, Storage, Stripe, SportsDataIO, CRON_SECRET, and Site URL

## Task Commits

Each task was committed atomically:

1. **Task 1: Update environment documentation and cron schedule** - `957fef5` (feat)
2. **Task 2: Align image upload constraints with production decisions** - `d019ff3` (feat)
3. **Task 3: Create service health check endpoint** - `e12bb61` (feat)

## Files Created/Modified
- `.env.example` - Complete documentation of all 13 required production env vars with source comments
- `vercel.json` - Cron schedule updated from */2 to */15 minutes
- `src/lib/utils/image-compress.ts` - Default maxDimension changed from 800 to 1200
- `src/components/poll/option-image-upload.tsx` - Removed image/gif from accept attribute
- `src/app/api/polls/[pollId]/upload-url/route.ts` - Removed gif from content type regex validation
- `src/app/api/health/route.ts` - New service health check endpoint with 6 service areas

## Decisions Made
- Health endpoint is unauthenticated for simplicity during deployment verification -- exposes status only, never secrets
- SportsDataIO check is env-var presence only (no API call) to conserve quota
- Critical services (Supabase Auth, Stripe) failing = "unhealthy"; optional services missing = "degraded"
- Updated JSDoc in option-image-upload.tsx to match new 1200px max (Rule 1 consistency fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated stale JSDoc in option-image-upload.tsx**
- **Found during:** Task 2 (Image upload constraints)
- **Issue:** Component JSDoc referenced "max 800px" but we changed default to 1200px
- **Fix:** Updated comment to say "max 1200px"
- **Files modified:** src/components/poll/option-image-upload.tsx
- **Verification:** Visual inspection of JSDoc
- **Committed in:** d019ff3 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial documentation consistency fix. No scope creep.

## Issues Encountered
- Pre-existing TypeScript error in src/components/billing/pricing-cards.tsx (TS2322) -- unrelated to this plan's changes, not introduced by any task

## User Setup Required

External services require manual configuration. The plan's `user_setup` frontmatter documents:
- **Supabase Storage:** Create 'poll-images' bucket (public, 5MB limit, image MIME types)
- **Google OAuth:** Create OAuth 2.0 Client ID, enable in Supabase Auth
- **Microsoft OAuth:** Register Azure AD application, enable in Supabase Auth
- **Apple OAuth:** Apple Developer enrollment, create App/Services IDs, enable in Supabase Auth

These are covered in plan 14-02.

## Next Phase Readiness
- All env vars documented -- user can configure production environment
- Health endpoint ready for deployment verification at /api/health
- Image upload constraints locked to production specifications
- Ready for plan 14-02 (external service configuration walkthrough)

## Self-Check: PASSED

All 7 files verified present. All 3 task commits verified in git log.

---
*Phase: 14-service-configuration*
*Completed: 2026-02-16*
