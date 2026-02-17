# Phase 17: Admin Panel - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a protected admin dashboard for managing teachers, accounts, and subscriptions. Admin can view all teachers, inspect usage, deactivate/reactivate accounts, override subscription tiers, and create new teacher accounts. The admin panel is a separate interface from the teacher dashboard.

</domain>

<decisions>
## Implementation Decisions

### Dashboard landing
- Teacher list is the primary view — no separate dashboard widgets page
- Compact stat bar above the teacher list showing 3-4 summary numbers (total teachers, active today, etc.)
- Separate admin-specific layout, distinct from the teacher dashboard
- Two nav items in the admin sidebar: Overview (stat bar + teacher list) and Teachers (dedicated list page)

### Teacher list & search
- Columns per row: name, email, plan tier, signup date, bracket count, last active date
- Search box that filters by name or email
- Dropdown filters for plan tier and active/inactive status
- Clicking a teacher row opens a slide-out side panel with teacher details (list stays visible)
- Teacher detail panel shows usage as counts only: total brackets, total polls, total sessions, total students

### Account actions UX
- Deactivate requires type-to-confirm (type teacher's name or "DEACTIVATE") — extra safety for destructive action
- Reactivate uses a simple confirm dialog (less destructive, lower friction)
- No audit log for now — single admin, can add later
- Tier override is a dropdown of existing plan tiers (Free, Basic, Pro, etc.) — no custom limits
- Account creation requires: name, email, and initial plan tier. System generates temp password

### Admin access model
- Role flag in the database (is_admin or role column on users table) — requires migration
- First admin bootstrapped via seed script / CLI command that promotes a specific email
- Single admin for now — role flag supports expansion later but no multi-admin UI
- Non-admin users hitting /admin are silently redirected to teacher dashboard (no 403 page)

### Claude's Discretion
- Stat bar metrics and layout
- Exact slide-out panel width and animation
- Pagination size for teacher list
- Temp password generation and delivery mechanism
- Seed script implementation details

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-admin-panel*
*Context gathered: 2026-02-16*
