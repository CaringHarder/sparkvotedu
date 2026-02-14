---
status: diagnosed
trigger: "Creating brackets with 32 or 64 entrants fails with 'failed to create bracket' error"
created: 2026-02-01T00:00:00Z
updated: 2026-02-01T00:01:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Prisma interactive transaction timeout (5s default) exceeded by sequential DB ops
test: Counted DB operations in createBracketDAL transaction for sizes 32 and 64
expecting: 94+ sequential awaits for size 32, 190+ for size 64 exceed 5s default
next_action: Report root cause

## Symptoms

expected: Bracket creation with 32 or 64 entrants should succeed
actual: Server action fails with "failed to create bracket" error
errors: "failed to create bracket"
reproduction: Try creating a bracket with 32 or 64 entrants in the form
started: Unknown

## Eliminated

- hypothesis: Tier limit on maxEntrantsPerBracket blocks 32/64
  evidence: pro tier allows 64, pro_plus allows 128. And the error text would be "Entrant limit is N" not "Failed to create bracket". The "Failed to create bracket" comes from the catch block (line 103-104 of bracket.ts action), meaning an exception was thrown inside createBracketDAL.
  timestamp: 2026-02-01T00:00:30Z

- hypothesis: Validation schema rejects large sizes
  evidence: bracketSizeSchema allows min(3) to max(128). createBracketSchema uses bracketSizeSchema for size. No issue with 32 or 64.
  timestamp: 2026-02-01T00:00:30Z

- hypothesis: Unique constraint violation on matchups (@@unique([bracketId, round, position]))
  evidence: Tested generateMatchups(32) and generateMatchups(64) - no duplicate round-position pairs generated. 31 and 63 matchups respectively, all unique.
  timestamp: 2026-02-01T00:00:45Z

## Evidence

- timestamp: 2026-02-01T00:00:20Z
  checked: src/actions/bracket.ts error handling
  found: The catch block at line 103-104 returns { error: 'Failed to create bracket' } -- this is a generic catch for ANY exception thrown during createBracketDAL execution. The error swallows the actual exception.
  implication: The error is NOT from validation or tier gates (those return structured error objects). Something inside the Prisma transaction is throwing.

- timestamp: 2026-02-01T00:00:30Z
  checked: src/lib/gates/tiers.ts TIER_LIMITS
  found: free=16, pro=64, pro_plus=128 for maxEntrantsPerBracket. Tier gates would produce descriptive error messages, not "Failed to create bracket".
  implication: Tier limits are not the cause.

- timestamp: 2026-02-01T00:00:35Z
  checked: src/lib/utils/validation.ts bracketSizeSchema
  found: z.number().int().min(3).max(128) -- accepts 32 and 64.
  implication: Validation is not the cause.

- timestamp: 2026-02-01T00:00:40Z
  checked: src/lib/dal/bracket.ts createMatchupsInTransaction
  found: Three sequential loops each doing individual await calls: (1) matchup creates one-by-one (lines 61-83), (2) matchup updates for nextMatchupId one-by-one (lines 93-107), (3) bye processing with findUnique+update+update per bye (lines 111-147). No batching (no createMany, no Promise.all).
  implication: Total sequential DB operations scales linearly with bracket size.

- timestamp: 2026-02-01T00:00:45Z
  checked: Operation count for size 32 and 64
  found: Size 32 = ~94 sequential awaits (1 bracket + 32 entrants + 31 creates + 30 updates). Size 64 = ~190 sequential awaits (1 + 64 + 63 + 62).
  implication: At ~25-50ms per query, size 32 takes 2.4-4.7s, size 64 takes 4.8-9.5s.

- timestamp: 2026-02-01T00:00:50Z
  checked: src/lib/prisma.ts transaction configuration
  found: No timeout or maxWait configured on PrismaClient or $transaction calls. Prisma default interactive transaction timeout is 5 seconds.
  implication: Size 32 is borderline (may fail on slow connections). Size 64 will almost certainly exceed 5 seconds.

- timestamp: 2026-02-01T00:00:55Z
  checked: Prisma documentation on interactive transaction timeout
  found: Default timeout is 5 seconds. Can be overridden per-transaction via { timeout: N } option or would need global configuration (not yet supported).
  implication: This is the root cause. The transaction times out before all sequential operations complete.

## Resolution

root_cause: The Prisma interactive transaction in createBracketDAL (src/lib/dal/bracket.ts line 223) times out for bracket sizes >= 32. The transaction performs ~94 sequential database operations for size 32 and ~190 for size 64, all as individual awaited queries in loops. Prisma's default interactive transaction timeout is 5 seconds, which is insufficient for this many sequential operations. The timeout causes the transaction to abort and throw an exception, which is caught by the generic catch block in src/actions/bracket.ts (line 103) and returned as "Failed to create bracket".
fix:
verification:
files_changed: []
