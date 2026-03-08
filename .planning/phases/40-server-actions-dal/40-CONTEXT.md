# Phase 40: Server Actions + DAL - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Build backend server actions and data access logic for the new student join system: creating participants with emoji and lastInitial, looking up returning students by name+initial (within and across sessions), and handling ambiguous matches. The Join Wizard UI (Phase 41) will call these actions.

</domain>

<decisions>
## Implementation Decisions

### Emoji assignment logic
- Students choose their own emoji via the wizard picker (Phase 41) — server does NOT auto-assign
- New students: emoji stays null until they complete the emoji picker step in the wizard
- Migrated students (existing participants without emoji): show first letter of fun name as fallback in EmojiAvatar
- Duplicates allowed — multiple students can pick the same emoji within a session
- No server-side emoji validation — accept any valid shortcode from the pool

### Returning student lookup
- Match by firstName + lastInitial, case-insensitive and whitespace-trimmed
- **Teacher-wide lookup** across all active (non-archived) sessions — not just the current session
- Single match: auto-reclaim silently, no confirmation step
- No match: treat as new student, proceed through full wizard
- Fun name AND emoji carry across all of a teacher's sessions (latest emoji wins if changed)
- Cross-session returning student sees welcome-only screen: "Welcome back, Brave Fox!" — skips wizard

### Ambiguous match handling
- Multiple matches: return all matching participants with fun name + emoji
- Student picks "That's me" from the list to reclaim their identity
- Show all matches — no cap on result count
- Match card data: fun name + emoji only (no session name or date)

### Claude's Discretion
- Whether to include a "None of these — I'm new" option on the disambiguation screen
- Exact data shape of lookup responses
- Error handling patterns for server actions
- How to determine "latest emoji" across sessions (by updatedAt timestamp or similar)

</decisions>

<specifics>
## Specific Ideas

- Teacher-wide identity means a student is "Brave Fox" everywhere for that teacher — not per-session
- Auto-reclaim on single match keeps the rejoin experience instant (zero-click for returning students on new devices)
- The emoji picker step is mandatory for new students but skipped for returning students

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 40-server-actions-dal*
*Context gathered: 2026-03-08*
