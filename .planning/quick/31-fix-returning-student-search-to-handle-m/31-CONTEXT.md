# Quick Task 31: Fix returning student search to handle multiple name matches - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Task Boundary

Fix returning student search to handle multiple name matches instead of auto-selecting most recent. When a student chooses "I've been here before" and searches by first name, the system should properly handle cases where multiple students share that first name.

</domain>

<decisions>
## Implementation Decisions

### Multiple match UX
- Show all matching students with their fun name + emoji + lastInitial so the student picks themselves from the list
- The existing `ReturningDisambiguation` component already supports this flow

### Dedup behavior
- Keep dedup by funName+emoji — this correctly collapses the same student's records across multiple sessions into one pick
- Add lastInitial display on each candidate card so students with the same funName (rare collision case) can tell themselves apart
- FunNames are unique per session by design; the system reuses funNames across sessions with collision fallback

### Auto-reclaim (same-session conflict)
- Only auto-reclaim when there's exactly ONE current-session match with that firstName
- If multiple matches exist in the current session, skip auto-reclaim and show all candidates instead
- This prevents the wrong "David" from being auto-reclaimed when two Davids are in the same session

</decisions>

<specifics>
## Specific Ideas

- The bug is in `src/actions/student.ts` `lookupStudentByFirstName` — the `currentSessionMatch` uses `.find()` which grabs the first match and auto-reclaims without checking if there are multiple same-firstName participants
- The fix should check count of current-session matches before deciding to auto-reclaim
- The disambiguation screen already exists at `src/components/student/join-wizard/returning-disambiguation.tsx`

</specifics>
