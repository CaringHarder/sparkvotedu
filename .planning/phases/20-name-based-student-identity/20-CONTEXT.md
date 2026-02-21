# Phase 20: Name-Based Student Identity - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Students join and rejoin any session using their first name instead of device fingerprinting. Handles duplicate names with disambiguation, assigns Kahoot-style fun names for anonymity, and allows name editing. Schema changes (first_name column, nullable device_id) already landed in Phase 19.

</domain>

<decisions>
## Implementation Decisions

### Join flow experience
- Two-step flow: enter session code first, then name on second screen
- Name entry screen content is Claude's discretion (show session info if available)
- Minimum name length: 2 characters
- Brief welcome screen after joining showing fun name assignment (e.g., "Welcome, Speedy Penguin!") before entering the session
- Name validation already built in Phase 19 (profanity filter, emoji rejection, Unicode support)

### Duplicate name handling
- When a name is already taken, ask "Is this you?" before assuming it's a new person
- If student says "yes, that's me" — treat as rejoin (Claude decides confirmation approach)
- If student says "no, different person" — prompt to differentiate (Claude decides method: last initial, free-form edit, etc.)
- Same flow applies for 3+ duplicates: third "Jake" sees all existing Jakes listed, can claim one or differentiate as new

### Rejoin & device freedom
- All previous votes, bracket picks, and poll responses are fully preserved on rejoin
- Rejoin landing destination is Claude's discretion (active activity vs session lobby)
- Same-device rejoin: auto-fill session code from localStorage; different device: full two-step flow
- If session has ended: show final results/standings rather than just "session ended" message

### Fun name & name display
- Fun names used everywhere students see names (brackets, polls, leaderboards) — real name is never shown to other students
- Teacher dashboard shows mapping: "Speedy Penguin (Jake M)" in participant list so teacher knows who's who
- Students see only their fun name once assigned — no display of their real name in the student UI
- Name edit placement is Claude's discretion

### Claude's Discretion
- Name entry screen design (whether to show session info/teacher name)
- Differentiation method for duplicate names (last initial prompt vs free-form edit)
- Rejoin confirmation approach (instant vs show context)
- Rejoin landing destination (current activity vs session lobby)
- Edit name UI placement (header vs settings)
- Fun name generation algorithm/word lists
- Welcome screen duration/animation

</decisions>

<specifics>
## Specific Ideas

- Welcome moment after joining: brief screen showing the assigned fun name before entering session (like Kahoot's name reveal)
- "Is this you?" flow for duplicate names: prioritize helping returning students get back in quickly over blocking new students
- localStorage auto-fill for session code: fail-silent if unavailable (consistent with Phase 19 banner approach)
- Ended sessions should still show results — students may want to see what happened

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-name-based-student-identity*
*Context gathered: 2026-02-21*
