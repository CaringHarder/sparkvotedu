# Phase 42: localStorage Persistence + Auto-Rejoin - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Students returning on the same device skip the join wizard entirely. localStorage remembers their identity across all sessions they've joined, and re-entering a class code auto-rejoins silently. When localStorage is unavailable (ephemeral Chromebooks, private browsing), the wizard runs normally with server-side name reclaim as fallback.

</domain>

<decisions>
## Implementation Decisions

### Auto-rejoin experience
- Show an "Is this you?" confirmation screen — not instant, not a loading flash
- Confirmation shows both fun name + emoji AND real first name + last initial (e.g., "Is this you? :unicorn: CosmicTiger (David R.)")
- If student says "Not me" → clear that stored identity from localStorage and start the full wizard fresh (new fun name, name entry, emoji pick)
- After completing the fresh wizard, the new identity is written to localStorage for future auto-rejoin
- Any successful join (new student, reclaimed identity, or fresh after "not me") writes to localStorage

### Storage structure
- Any successful join writes identity to localStorage for future auto-rejoin on that device
- This applies to new joins, cross-device name reclaims, and wizard completions after "not me"

### Graceful degradation
- When localStorage is unavailable, the join wizard runs normally with no errors or warnings
- If localStorage data was previously wiped (cache cleared, Chromebook reset), student goes through normal wizard flow — server-side name reclaim catches them by name+initial
- No special treatment for the "had data but lost it" case

### Pruning & cleanup
- "Not me" on confirmation screen clears that session's stored identity from localStorage
- New identity written after fresh wizard completion replaces the cleared one

### Claude's Discretion
- Storage key structure (single key with object map vs per-session keys)
- What identity data to store per session (minimum for rejoin vs display-ready cache for instant "Is this you?" rendering)
- localStorage namespace/prefix strategy
- localStorage availability detection approach (upfront check vs lazy try/catch)
- Whether to show any indication when localStorage is unavailable
- Schema versioning in stored data
- TTL duration (roadmap says 30 days, but semester-length like 90 days may be more appropriate for schools)
- When pruning runs (on page load, on join, etc.)
- Whether to cap max stored identities in addition to TTL
- Multi-session matching logic (keyed by sessionId from class code)

</decisions>

<specifics>
## Specific Ideas

- Shared device scenario: siblings or classmates on the same Chromebook. "Is this you?" with both names helps disambiguate. "Not me" clears and lets the next student join fresh.
- School Chromebooks in ephemeral mode silently destroy localStorage — server-side name reclaim must be the authoritative fallback (already built in Phase 40/41).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 42-localstorage-persistence-auto-rejoin*
*Context gathered: 2026-03-09*
