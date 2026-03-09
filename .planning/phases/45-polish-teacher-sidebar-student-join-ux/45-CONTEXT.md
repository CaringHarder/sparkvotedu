# Phase 45: Polish Teacher Sidebar & Student Join UX - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix sidebar real-time refresh (new joins + name edits), improve returning student lookup to search by first name alone with visual disambiguation, add last initial field to teacher edit dialog, and persist Fun/Real toggle preference to teacher profile (TCHR-02 gap closure).

</domain>

<decisions>
## Implementation Decisions

### Returning student lookup
- Remove last initial requirement from returning student lookup — single first-name field only
- Flow: enter first name → search → show match cards (emoji + fun name + last initial if exists)
- Single match: show confirmation card ("Welcome back! 🚀 Cosmic Tiger — That's me!") — do NOT auto-reclaim silently
- Multiple matches: show all cards for disambiguation, student picks theirs
- "None of these" button redirects to new student 3-step wizard
- Zero matches: primary CTA "Join as new student" + subtle "Oops, I misspelled my name — try again" link to retry
- Search scope: all of this teacher's non-archived sessions (unchanged)
- Lightweight impersonation guard: if student already has an active participant in THIS session and tries to look up a different name, show a warning. Only check same-session — no cross-session blocking.

### Toggle persistence
- Explicit "Set as default" action — toggling per-session does NOT auto-save
- "Set as default" link appears next to the Fun/Real segmented control in sidebar header
- Only shows when current view differs from saved default
- Clicking it fires a server action to update teacher profile column
- Feedback: subtle toast ("Default set to Fun view") for 2-3 seconds
- Single global default on Teacher model — applies to both polls and brackets

### Teacher edit dialog
- Two separate fields: First Name input + Last Initial input (max 2 chars)
- Last initial required (at least 1 character) — teacher must enter one
- Dialog header shows student's emoji + fun name as read-only context
- Edit scope: this session's participant only — does NOT update other sessions
- Real-time sync to student via existing broadcastParticipantJoined pattern

### Sidebar live refresh
- Subscribe to `participant_joined` broadcast on BOTH poll and bracket live pages
- New student tile slides in with brief green/highlight pulse (1-2 seconds), then settles into sort order
- Name edits also reflect in real-time (broadcastParticipantJoined already reused by teacherUpdateStudentName)
- Disconnected students: fade out after 30-60 second timeout instead of staying with grey dot
- Audit and align both poll and bracket live sidebar behavior

### Claude's Discretion
- Exact slide-in animation implementation (framer-motion vs CSS transitions)
- Disconnect fade timeout duration (30s vs 60s — pick what feels right)
- Toast component choice (existing shadcn toast vs lightweight custom)
- Schema migration approach for nameViewDefault column on Teacher model
- How to detect "already has active participant in this session" for the impersonation guard (localStorage check vs server query)

</decisions>

<specifics>
## Specific Ideas

- Disambiguation cards show last initial when it exists (e.g., "Alice", "Alice B", "Alice R") — not all students will have one
- The impersonation guard is intentionally lightweight — students are anonymous by design, class code is the real access gate. Guard only warns, doesn't block.
- "Set as default" link should only appear when current differs from saved — keeps sidebar header clean when not needed
- Teacher edit dialog mirrors the student wizard layout (separate first name + last initial fields)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ParticipationSidebar` (src/components/teacher/participation-sidebar.tsx): Already has nameView state, NameViewToggle, TeacherEditNameDialog integration
- `NameViewToggle` (src/components/teacher/name-view-toggle.tsx): Segmented control — add "Set as default" link nearby
- `TeacherEditNameDialog` (src/components/teacher/teacher-edit-name-dialog.tsx): Currently firstName-only — extend with lastInitial field
- `ReturningNameEntry` (src/components/student/join-wizard/returning-name-entry.tsx): Two-field form to simplify to single field
- `ReturningDisambiguation` (src/components/student/join-wizard/returning-disambiguation.tsx): Already shows emoji + fun name cards
- `broadcastMessage` (src/lib/realtime/broadcast.ts): REST-based broadcast, used by broadcastParticipantJoined
- `findReturningStudent` (src/lib/dal/student-session.ts): Requires firstName + lastInitial — needs new findByFirstName variant
- `lookupStudent` (src/actions/student.ts): Server action orchestrating the lookup — needs schema update for optional lastInitial
- `shortcodeToEmoji` (src/lib/student/emoji-pool.ts): Converts stored shortcodes to visual emoji

### Established Patterns
- Supabase Realtime broadcast for live updates (presence + broadcast channels)
- Server actions pattern for data mutations (src/actions/student.ts)
- `class-variance-authority` for component variants
- `teacherUpdateStudentName` reuses `broadcastParticipantJoined` for real-time propagation
- Name view toggle is pure React state initialized from teacherNameViewDefault prop

### Integration Points
- Teacher model (prisma/schema.prisma): New `nameViewDefault` column (String, default "fun")
- Poll live page (src/app/(dashboard)/polls/[pollId]/live/page.tsx): Passes teacherNameViewDefault prop, needs realtime subscription for sidebar
- Bracket live page (src/app/(dashboard)/brackets/[bracketId]/live/page.tsx): Same — needs realtime subscription for sidebar
- localStorage identity store: Check for existing session participant in impersonation guard

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 45-polish-teacher-sidebar-student-join-ux*
*Context gathered: 2026-03-09*
