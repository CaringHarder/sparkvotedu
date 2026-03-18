---
phase: 01-sports-bracket-import-reliability
verified: 2026-03-17T00:00:00Z
status: human_needed
score: 14/14 automated must-haves verified
human_verification:
  - test: "Import an NCAA tournament bracket and confirm amber warning box appears when ESPN data has seed gaps or position collisions"
    expected: "Import completes successfully; amber 'Import completed with notes:' box appears with bulleted warnings when data issues exist; no warnings box when data is clean"
    why_human: "Requires live ESPN API data with actual missing-seed or collision conditions to trigger warning paths"
  - test: "After import, confirm success message shows auto-detected Final Four pairing text or fallback note"
    expected: "Success box shows either 'Final Four pairing auto-detected: ...' with region names, or 'You can configure Final Four pairings in bracket settings.' depending on ESPN R4/R5 data availability"
    why_human: "Auto-detection depends on live ESPN R4/R5 game relationship data (previousHomeGameId links)"
  - test: "Open imported bracket settings; verify Final Four Pairings dropdown shows 3 options with actual region names"
    expected: "Dropdown visible only for sports brackets; 4 options total (Auto + 3 combos); option labels use the bracket's real region names (e.g., 'East vs West, South vs Midwest') not hardcoded strings"
    why_human: "Requires visual inspection of rendered dropdown with live bracket data"
  - test: "Change Final Four pairing in settings; verify brackets re-wires and predictionWarning appears when R5+ predictions exist"
    expected: "Selecting a different pairing saves immediately; if students have R5+ predictions, amber inline warning appears: 'Note: Students have predictions for Final Four and beyond. Changing pairings may affect their brackets.'"
    why_human: "Requires live data with R5+ predictions to trigger the warning branch; UX feel of instant re-wiring vs stale state needs human confirmation"
  - test: "Click Refresh from ESPN button in bracket settings; confirm loading state and sync feedback"
    expected: "Button shows 'Refreshing...' with spinning RefreshCw icon while syncing; returns to 'Refresh from ESPN' after sync completes; any sync results are reflected in bracket state"
    why_human: "Requires live ESPN API connectivity; loading state and success feedback are visual/temporal"
  - test: "After a play-in game completes in ESPN data, trigger sync and verify combined entrant is replaced with winner"
    expected: "Before sync: entrant shows combined name like 'TEX/NCSU'; after sync with closed R0 game: entrant shows winner's name, abbreviation, and logo"
    why_human: "Requires a real play-in game to be closed in ESPN data; idempotency and correct winner identification need live verification"
---

# Phase 01: Sports Bracket Import Reliability Verification Report

**Phase Goal:** Sports bracket import reliability — auto-fix play-in entrant placement in R1 slots by tournament seed, add Final Four pairing configuration, fix R0 entrant assignment

**Verified:** 2026-03-17
**Status:** human_needed — All 14 automated must-haves verified across 3 plans; 6 items require human verification with live data
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Bracket model has finalFourPairing column available for storage | VERIFIED | `prisma/schema.prisma` line 109: `finalFourPairing String? @map("final_four_pairing")` |
| 2 | Import DAL collects warnings without aborting on partial ESPN data | VERIFIED | `src/lib/dal/sports.ts` lines 251, 356, 428, 437, 444 — `warnings: string[]` accumulated; returned as `{ bracket, warnings }` at line 608 |
| 3 | Auto-fix silently corrects seed/position mismatches during import | VERIFIED | `src/lib/dal/sports.ts` lines 406-451 — per-region `Set<number>` tracks used positions; next-available-slot fallback on collision or missing seed |
| 4 | wireMatchupAdvancement uses finalFourPairing config for R4->R5 wiring when present | VERIFIED | `src/lib/dal/sports.ts` lines 68-71 (signature), 160-168 (branch); imports `parsePairing` from pairings.ts and uses region-based wiring when pairing provided |
| 5 | Pairings utility correctly generates 3 pairing options for any 4 regions | VERIFIED | `src/lib/sports/pairings.ts` lines 32-48 — returns 3 `[[a,b],[c,d]]` combinations with labels and values |
| 6 | Import action returns warnings alongside bracket data to the client | VERIFIED | `src/actions/sports.ts` line 113: `return { bracket: { id, name }, warnings: result.warnings }` |
| 7 | Play-in resolution replaces combined entrants with actual winner data on R0 game completion | VERIFIED | `src/lib/dal/sports.ts` lines 736-780 — R0 matchups resolved; `externalTeamId: null` filter ensures idempotency; winner abbreviation/logo/externalId set on update |
| 8 | Teacher can update Final Four pairing in bracket settings and R4->R5 links re-wire | VERIFIED | `src/actions/bracket.ts` lines 625-639 — `updateBracketSettings` clears R4 links, calls `wireMatchupAdvancement` with new pairing, re-propagates R4 winners to R5 |
| 9 | Teacher can manually refresh bracket data from ESPN | VERIFIED | `src/components/bracket/bracket-detail.tsx` lines 195, 350-354 — `triggerSportsSync()` called on button click with `syncing` state and spinner |
| 10 | Changing pairing warns if predictions exist past R4 | VERIFIED | `src/actions/bracket.ts` lines 622-646 — prediction count query for R5+ matchups; returns `{ predictionWarning: true }` when > 0; component surfaces inline amber warning |
| 11 | Import flow shows import warnings in amber info box | VERIFIED | `src/components/bracket/tournament-browser.tsx` lines 218-227 — amber `bg-amber-50 border-amber-200` box with bulleted warning list |
| 12 | Import success message shows auto-detected pairing or settings pointer | VERIFIED | `src/components/bracket/tournament-browser.tsx` lines 208-213 — conditional renders auto-detected pairing text or fallback settings pointer |
| 13 | Bracket settings shows Final Four pairing dropdown with actual region names | VERIFIED | `src/components/bracket/bracket-detail.tsx` lines 132-135 — regions extracted from R1 matchups via `bracketRegion`; `getFinalFourPairings(sportsRegions)` generates options; dropdown at lines 316-340 |
| 14 | Bracket detail page query provides region data to component | VERIFIED | `src/app/(dashboard)/brackets/[bracketId]/page.tsx` line 117 — `bracketRegion: m.bracketRegion` mapped into serialized matchup data |

**Score:** 14/14 automated truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | finalFourPairing nullable String column on Bracket model | VERIFIED | Line 109 — `finalFourPairing String? @map("final_four_pairing")` |
| `src/lib/sports/pairings.ts` | FinalFourPairing type, getFinalFourPairings(), parsePairing(), detectDefaultPairing() | VERIFIED | All 4 exports present and substantive (129 lines, full implementations) |
| `src/lib/utils/validation.ts` | updateBracketSettingsSchema includes finalFourPairing field | VERIFIED | Line 193 — `finalFourPairing: z.string().optional()` |
| `src/lib/dal/sports.ts` | Warning collection, auto-fix position collisions, pairing-aware wireMatchupAdvancement, { bracket, warnings } return | VERIFIED | All behaviors present; line 608 return, lines 406-451 auto-fix, lines 160-168 pairing wiring |
| `src/actions/sports.ts` | importTournament returns { bracket, warnings } | VERIFIED | Line 113 — returns both fields |
| `src/actions/bracket.ts` | updateBracketSettings handles finalFourPairing re-wiring + prediction warning; repairBracketLinkage passes pairing | VERIFIED | Lines 625-672 for settings; lines 703-711 for repair linkage |
| `src/lib/bracket/types.ts` | BracketDetail type includes finalFourPairing and MatchupData includes bracketRegion | VERIFIED | Line 116 (finalFourPairing), line 144 (bracketRegion) |
| `src/components/bracket/tournament-browser.tsx` | Import warnings amber box and auto-detected pairing note | VERIFIED | Lines 218-227 (amber box), lines 208-213 (pairing note) |
| `src/components/bracket/bracket-detail.tsx` | Final Four Pairings dropdown and Refresh from ESPN button | VERIFIED | Lines 315-340 (dropdown), lines 350-354 (refresh button) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/dal/sports.ts` | `src/lib/sports/pairings.ts` | `parsePairing` for R4->R5 wiring | WIRED | Line 15: `import { parsePairing, detectDefaultPairing }`; line 168: `parsePairing(finalFourPairing)` used in wiring branch |
| `src/lib/dal/sports.ts` | `prisma/schema.prisma` | reads/writes `bracket.finalFourPairing` | WIRED | Lines 544-555 — `detectDefaultPairing` result stored to `finalFourPairing` field; line 549 passes to `wireMatchupAdvancement` |
| `src/actions/bracket.ts` | `src/lib/dal/sports.ts` | `wireMatchupAdvancement` called with `finalFourPairing` | WIRED | Line 17: `import { wireMatchupAdvancement, getSlotByFeederOrder }`; line 639: `wireMatchupAdvancement(bracketId, undefined, finalFourPairing)` |
| `src/actions/bracket.ts` | `prisma.bracketEntrant` | `syncBracketResults` updates combined entrants on play-in resolution | WIRED | `src/lib/dal/sports.ts` lines 764-780 — `prisma.bracketEntrant.findFirst` + `prisma.bracketEntrant.update` |
| `src/components/bracket/tournament-browser.tsx` | `src/actions/sports.ts` | `importTournament` response includes `warnings` | WIRED | Line 81: `result.warnings as string[]`; line 113 in action returns `warnings` |
| `src/components/bracket/bracket-detail.tsx` | `src/actions/bracket.ts` | `updateBracketSettings` called with `finalFourPairing`; `triggerSportsSync` for refresh | WIRED | Line 100-102: `updateBracketSettings({ bracketId, finalFourPairing: value })`; line 195: `triggerSportsSync()` |

---

### Requirements Coverage

No requirement IDs were declared in any of the 3 plan frontmatter (`requirements: []` in all plans). No REQUIREMENTS.md phase mapping to check.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/dal/sports.ts` | 371 | `externalTeamId: null, // No single team — placeholder` | Info | Intentional business logic for combined play-in entrants; not a stub |
| `src/lib/dal/sports.ts` | 257 | Comment references "TBD placeholders with negative IDs" | Info | Explanatory comment about ESPN data pattern; not a code stub |

No blockers or warnings found.

---

### Artifact-Level Observation: updateFinalFourPairing vs updateBracketSettings

Plan 02 `must_haves.artifacts` listed `updateFinalFourPairing` as a distinct export from `src/actions/bracket.ts`. The implementation merged this functionality into `updateBracketSettings` instead of creating a separate action. The underlying behavioral truth ("Teacher can update Final Four pairing and R4->R5 links re-wire") is fully satisfied. The summary documented this as an implementation decision. This is not a gap.

---

### Human Verification Required

#### 1. Import warnings display with real ESPN data

**Test:** Import an NCAA tournament that has missing seed data or position collisions in the ESPN source (e.g., a bracket with play-in teams where seed data is incomplete)
**Expected:** Amber "Import completed with notes:" box appears below success message with bulleted warning list; clean imports show no amber box
**Why human:** Warning paths require live ESPN API data with actual missing-seed or collision conditions; cannot simulate with static file checks

#### 2. Auto-detected Final Four pairing note in import success

**Test:** Import an NCAA tournament that has R4/R5 game data with `previousHomeGameId`/`previousAwayGameId` links in the ESPN response
**Expected:** Success message shows "Final Four pairing auto-detected: [region names]. Change in bracket settings." rather than the generic fallback note
**Why human:** Detection depends on ESPN R4/R5 feeder game relationship data being present in the API response at import time

#### 3. Final Four Pairings dropdown shows actual region names

**Test:** Open bracket settings for an imported sports bracket; locate the "Final Four Pairings" section
**Expected:** Dropdown is visible (hidden for non-sports brackets); shows 4 options: one "Auto (position-based)" default plus 3 combos using the bracket's actual region names (e.g., "East vs West, South vs Midwest" not hardcoded strings); currently-stored pairing is pre-selected
**Why human:** Region name extraction from matchup data and correct rendering of the 3 combos requires visual confirmation with real bracket data

#### 4. Pairing change triggers re-wiring and prediction warning

**Test:** With a sports bracket where students have made predictions on R5+ matchups, change the Final Four pairing in bracket settings
**Expected:** Selection saves immediately (no separate save button needed); inline amber warning "Note: Students have predictions for Final Four and beyond. Changing pairings may affect their brackets." appears; bracket R4->R5 linkage reflects the new pairing
**Why human:** Requires live bracket with R5+ student predictions to trigger the warning branch; re-wiring correctness requires bracket navigation to verify R4 matchup `nextMatchupId` targets

#### 5. Refresh from ESPN button with loading state

**Test:** On an imported sports bracket's settings page, click "Refresh from ESPN"
**Expected:** Button text changes to "Refreshing..." with animated spinning icon while sync runs; button re-enables and returns to "Refresh from ESPN" after completion; recent game scores/statuses update in bracket if any games have progressed since import
**Why human:** Loading state is temporal; ESPN connectivity required; sync result feedback needs live API response

#### 6. Play-in combined entrant resolution after R0 game closes

**Test:** After an actual First Four (play-in) game closes in ESPN data, trigger a sync on the bracket
**Expected:** Before sync: entrant in the relevant R1 matchup shows combined name (e.g., "TEX/NCSU"); after sync: entrant shows the winning team's name, abbreviation, and logo
**Why human:** Requires a real play-in game to be completed in ESPN data; timing-dependent and requires visual confirmation of entrant data update

---

### Gaps Summary

No automated gaps. All 14 observable truths are verified by code inspection:

- Schema column exists and is the correct nullable String type
- Pairings utility is substantive with all 4 exported functions fully implemented
- DAL warning collection accumulates warnings across 4 distinct error conditions and returns them
- Auto-fix position collision logic uses per-region Set tracking with next-available-slot fallback
- `wireMatchupAdvancement` accepts and uses `finalFourPairing` for region-based R4->R5 wiring
- Server actions return warnings to clients and wire to the DAL correctly
- Play-in resolution loop in `syncBracketResults` is complete and idempotent
- UI components render the warnings box, pairing note, pairing dropdown, and refresh button
- All 6 implementation commits exist in git history
- TypeScript compiles cleanly (0 errors)

The 6 human verification items are behavioral/temporal checks that require live ESPN data and visual confirmation of the UX flows.

---

_Verified: 2026-03-17_
_Verifier: Claude (gsd-verifier)_
