# Phase 19: Security & Schema Foundation - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock down all 12 public Supabase tables with deny-all RLS policies, and prepare the database schema for name-based student identity (add `first_name` column, make `device_id` nullable). Full app data reset included — clean slate for the new identity system.

</domain>

<decisions>
## Implementation Decisions

### Existing student continuity
- No backward compatibility needed — forget all existing students
- Full app data reset: wipe all student-related data (student_participants, votes, poll responses, bracket entries)
- Also wipe teacher-created content (sessions, brackets, polls) — complete clean slate
- No maintenance window needed — deploy anytime, seamless cutover

### Name field design
- Full Unicode support — accents, apostrophes, hyphens, international characters (Jose, O'Brien, Mary-Jane, Le)
- No emojis allowed in names — strip or reject
- 2 character minimum length
- Whitespace trimming and normalization (leading/trailing spaces removed, internal multi-spaces collapsed)
- Profanity filtering: block with friendly message ("Please enter your real first name")

### Deploy approach
- Deploy anytime — no scheduling constraints, no maintenance page
- Seamless cutover — no downtime messaging
- In-app banner on first teacher login after migration: "We've upgraded! Previous sessions have been cleared."
- Banner is dismissible, shown once

### Claude's Discretion
- Maximum name length (reasonable limit)
- Name casing strategy (preserve vs auto-capitalize)
- Profanity filter implementation approach
- RLS policy SQL specifics
- Migration script ordering and safety checks
- Banner component implementation and dismissal mechanism

</decisions>

<specifics>
## Specific Ideas

- Banner copy: "We've upgraded! Previous sessions have been cleared." — transparent, not hiding the data reset
- Data wipe is intentional: the app is early enough that no one depends on the data

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-security-schema-foundation*
*Context gathered: 2026-02-21*
