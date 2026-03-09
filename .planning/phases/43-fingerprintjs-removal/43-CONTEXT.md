# Phase 43: FingerprintJS Removal - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove all FingerprintJS code, dependencies, and database columns from the codebase. This is a pure cleanup/tech debt phase — no new features, no behavior changes. The localStorage + name-based identity system (Phases 40-42) fully replaces fingerprint-based identity.

</domain>

<decisions>
## Implementation Decisions

### Privacy page updates
- Replace all 4 fingerprint mentions with current identity system description
- Use "browser storage" (not "localStorage") for parent-friendly language
- Keep identity description abstract ("anonymous session identity") rather than explaining fun name + emoji mechanism
- Replace the duplicate voting prevention bullet with session-based explanation (one participation per student per session)

### DAL/action parameter cleanup
- Remove joinSession fingerprint fallback path entirely (Step 3 in student.ts) — dead code, no consumers
- Delete findByFingerprint() DAL function entirely — no callers after joinSession cleanup
- Remove fingerprint parameter from createParticipant() function signature and all callers
- Remove fingerprint field from Zod validation schema in student.ts
- No stubs, no comments, no historical references — clean removal

### DeviceIdentity type and hook
- Delete DeviceIdentity type from src/types/student.ts entirely
- Delete useDeviceIdentity hook from src/hooks/use-device-identity.ts entirely
- Delete fingerprint.ts from src/lib/student/fingerprint.ts entirely
- Check session-identity.ts (getOrCreateDeviceId) for orphaned exports after hook deletion — remove if no other consumers exist
- Full dead-code sweep: trace all imports and remove anything left without consumers

### Migration approach
- Use `prisma db push` (consistent with Phase 39 — Supabase shadow DB RLS conflicts block migrate dev)
- Drop fingerprint column and @@index([sessionId, fingerprint]) from StudentParticipant
- No data backup needed — fingerprint data was unreliable from the start (identical Chromebooks = collisions) and has zero value
- Create manual migration SQL file in prisma/migrations/ for audit trail (e.g., prisma/migrations/TIMESTAMP_remove_fingerprint/)

### Claude's Discretion
- Order of operations (code removal vs schema change vs package uninstall)
- Bundle size measurement approach for ~150KB verification
- Any additional dead code discovered during import tracing

</decisions>

<specifics>
## Specific Ideas

No specific requirements — straightforward removal guided by grep verification and import tracing.

</specifics>

<code_context>
## Existing Code Insights

### Files to Delete
- `src/lib/student/fingerprint.ts`: FingerprintJS wrapper (getBrowserFingerprint)
- `src/hooks/use-device-identity.ts`: Composite identity hook (zero consumers)
- `src/types/student.ts`: DeviceIdentity type (only used by deleted hook)

### Files to Edit
- `src/actions/student.ts`: Remove fingerprint from Zod schema, joinSession fingerprint fallback path
- `src/lib/dal/student-session.ts`: Remove findByFingerprint(), fingerprint param from createParticipant()
- `src/app/privacy/page.tsx`: Replace 4 fingerprint mentions with current system
- `prisma/schema.prisma`: Remove fingerprint column and index from StudentParticipant

### Package to Remove
- `@fingerprintjs/fingerprintjs` v5.0.1 from package.json

### Files to Check
- `src/lib/student/session-identity.ts`: May have orphaned exports after hook deletion

### Established Patterns
- Phase 39 used `prisma db push` for schema changes — same approach here
- Phase 37 migration created manual SQL file for audit trail

### Integration Points
- StudentParticipant table schema change affects Prisma client generation
- Privacy page is public-facing — changes visible to parents/admins

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 43-fingerprintjs-removal*
*Context gathered: 2026-03-09*
