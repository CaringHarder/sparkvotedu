# Phase 23: Session Archiving - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can archive, recover, and permanently delete sessions. Includes archivedAt schema migration, archive/unarchive actions, archived sessions page, permanent delete with cascade, and session list filtering to hide archived by default. No new session features or activity types.

</domain>

<decisions>
## Implementation Decisions

### Archive interaction
- Archive action lives in a three-dot context menu on each session card (not inline button)
- Archiving requires a confirmation dialog ("Archive this session?")
- Single session archiving only — no bulk select
- Active sessions can be archived — auto-end all running activities first, then archive

### Archived sessions view
- Archived sessions live on a separate page (not tabs or inline toggle)
- Link to archived sessions page in the dashboard sidebar nav
- Search by session name supported on the archived page
- Sorted by archive date, newest first

### Permanent delete flow
- Sessions can only be permanently deleted from the archived page (must archive first — two-step safety net)
- Standard confirmation dialog: "Permanently delete this session? This cannot be undone." with Cancel/Delete
- Delete button styled subtly, not alarming red — appropriate for a classroom tool
- Full cascade delete: session + all participants, polls, brackets, votes — complete removal

### Recovery behavior
- Recovered sessions return to the main active session list with a toast notification confirming restoration
- Recovery is instant — one click, no confirmation dialog (safe, non-destructive action)
- Archived sessions block student access via join code — "This session is no longer available"

### Claude's Discretion
- Archived session card info density (name, stats, dates — pick what's useful)
- Whether recovered sessions retain active activities or auto-end them on archive
- Three-dot menu icon and positioning within existing card patterns
- Archived page layout and empty state design
- Confirmation dialog copy and styling details

</decisions>

<specifics>
## Specific Ideas

- Two-step delete safety: archive first, then delete from archived page — prevents accidental permanent deletion from the main dashboard
- Auto-end active activities on archive — teacher doesn't have to manually end everything before archiving
- Toast with link on recovery — teacher can immediately navigate to the restored session

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-session-archiving*
*Context gathered: 2026-02-23*
