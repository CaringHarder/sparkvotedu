---
phase: 17-admin-panel
plan: 01
subsystem: auth
tags: [prisma, role-based-access, admin, next-proxy, server-components]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Teacher model, Prisma schema, Supabase auth"
  - phase: 02-auth
    provides: "getAuthenticatedTeacher(), proxy.ts auth redirects"
provides:
  - "Teacher.role column with admin/teacher values"
  - "getAuthenticatedAdmin() DAL function for admin auth gating"
  - "isAdmin() DAL function for role checks"
  - "Admin route protection in proxy.ts"
  - "Admin layout with sidebar (Overview, Teachers)"
  - "Admin shell pages at /admin and /admin/teachers"
  - "scripts/promote-admin.ts CLI for bootstrapping admin access"
affects: [17-02, 17-03, 17-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin route group (admin) with separate layout from teacher dashboard"
    - "Amber accent theme to visually distinguish admin from teacher UI"
    - "Proxy-level role check with lightweight Prisma select query"
    - "Double auth gate: proxy redirect + layout-level getAuthenticatedAdmin()"

key-files:
  created:
    - src/lib/dal/admin.ts
    - src/app/(admin)/layout.tsx
    - src/app/(admin)/admin/page.tsx
    - src/app/(admin)/admin/teachers/page.tsx
    - src/components/admin/admin-sidebar-nav.tsx
    - scripts/promote-admin.ts
  modified:
    - prisma/schema.prisma
    - src/app/proxy.ts

key-decisions:
  - "String role column instead of enum for future extensibility"
  - "Amber accent for admin UI to visually distinguish from blue teacher dashboard"
  - "Separate AdminSidebarNav component for admin-specific navigation"
  - "Double auth gate: proxy redirects non-admins, layout also checks via getAuthenticatedAdmin()"

patterns-established:
  - "Admin auth pattern: getAuthenticatedAdmin() wraps getAuthenticatedTeacher() with role check"
  - "Admin route group: (admin) route group separate from (dashboard)"

# Metrics
duration: 4min
completed: 2026-02-17
---

# Phase 17 Plan 01: Admin Shell Summary

**Role-based admin access with proxy protection, admin layout with amber-accented sidebar, and CLI promote script**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-17T22:25:29Z
- **Completed:** 2026-02-17T22:29:36Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Teacher model extended with `role` column defaulting to "teacher"
- Admin DAL functions (`getAuthenticatedAdmin`, `isAdmin`) following existing auth patterns
- Proxy silently redirects non-admin users from /admin routes to /dashboard
- Admin layout with amber accent, "Admin" badge, and dedicated sidebar navigation
- Shell pages at /admin (Overview) and /admin/teachers ready for 17-02 content
- CLI script to promote any teacher email to admin role

## Task Commits

Each task was committed atomically:

1. **Task 1: Add role column to Teacher model and create admin DAL** - `3a50264` (feat)
2. **Task 2: Update proxy for admin route protection** - `9a21f6a` (feat)
3. **Task 3: Create admin layout and page shells** - `671cf51` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added `role` String column to Teacher model
- `src/lib/dal/admin.ts` - Admin auth functions: getAuthenticatedAdmin(), isAdmin()
- `scripts/promote-admin.ts` - CLI to promote teacher email to admin role
- `src/app/proxy.ts` - Admin route protection via Prisma role check
- `src/app/(admin)/layout.tsx` - Admin layout with amber accent, auth gate, sidebar
- `src/app/(admin)/admin/page.tsx` - Admin overview shell page
- `src/app/(admin)/admin/teachers/page.tsx` - Teachers management shell page
- `src/components/admin/admin-sidebar-nav.tsx` - Client component for admin sidebar with active-link highlighting

## Decisions Made
- **String role column** instead of Prisma enum for simplicity and future extensibility (just add new string values)
- **Amber accent theme** for admin layout to visually distinguish from the blue teacher dashboard
- **Separate AdminSidebarNav component** rather than inline in layout for cleaner separation
- **Double auth gate** pattern: proxy redirects non-admins at request level, layout also checks via getAuthenticatedAdmin() as defense-in-depth
- **dotenv + relative imports** for promote-admin script since it runs outside Next.js bundler (no path aliases)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Admin shell is ready for 17-02 to populate the overview page with stat bar and teacher list
- The `scripts/promote-admin.ts` script is ready to bootstrap the first admin user
- Admin sidebar nav already has the Teachers link wired to /admin/teachers

## Self-Check: PASSED

All 8 files verified present. All 3 task commits verified in git log.

---
*Phase: 17-admin-panel*
*Completed: 2026-02-17*
