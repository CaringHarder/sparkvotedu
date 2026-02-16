---
phase: 03-bracket-creation-management
plan: 03
subsystem: bracket-entrant-population
tags: [papaparse, csv, curated-topics, bracket, entrants, typescript]
requires:
  - 03-01 (bracket types for entrant concepts)
provides:
  - CSV parser module for bulk entrant import from file upload
  - Curated topic lists module with 10 educational topic lists (16 entries each)
  - ParsedEntrant interface and parseEntrantCSV function
  - TopicList interface and CURATED_TOPICS constant
affects:
  - 03-06 (creation wizard UI consumes both modules for entrant population)
  - 03-07 (integration tests may validate entrant population flows)
tech-stack:
  added:
    - papaparse (CSV parsing library)
    - "@types/papaparse" (TypeScript types for papaparse)
  patterns:
    - Thin wrapper around third-party library for single-responsibility module
    - Hard-coded curated content exported as typed constant array
key-files:
  created:
    - src/lib/bracket/csv-parser.ts
    - src/lib/bracket/curated-topics.ts
  modified:
    - package.json (added papaparse dependency)
key-decisions:
  - PapaParse header auto-detection with lowercase normalization for flexible CSV column matching
  - Fallback to first column value when no recognized header (name, entrant, team) is found
  - Seed positions auto-assigned from row order (1-based indexing)
  - 10 curated lists with exactly 16 entries each covering 7 subjects
  - "This or That" as the fun/icebreaker category instead of literal "Cats vs Dogs" expansion
duration: ~1.3m
completed: 2026-01-30
---

# Phase 3 Plan 03: Curated Topics & CSV Parser Summary

**One-liner:** PapaParse-based CSV parser for bulk entrant import and 10 curated educational topic lists (16 entries each) covering Science, History, Literature, Arts, Geography, Pop Culture, and Fun.

## Accomplishments

- Installed papaparse and @types/papaparse as project dependencies
- Created CSV parser module with parseEntrantCSV function accepting File and returning Promise<ParsedEntrant[]>
- CSV parser handles header detection (name, entrant, team columns), first-column fallback, whitespace trimming, empty row filtering, and auto seed assignment
- Created curated topics module with TopicList interface and CURATED_TOPICS constant
- 10 topic lists: Planets & Celestial Bodies, U.S. Presidents, Shakespeare Plays, Greatest Inventions, Ancient Civilizations, Musical Genres, World Wonders, Superheroes, Mythological Creatures, This or That
- All 10 lists have exactly 16 entries supporting bracket sizes 4, 8, and 16
- Subjects covered: Science (2), History (2), Literature (2), Arts (1), Geography (1), Pop Culture (1), Fun (1)
- Zero TypeScript compilation errors in new files

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Install PapaParse and create CSV parser module | 8e3e546 | src/lib/bracket/csv-parser.ts, package.json |
| 2 | Create curated topic lists module | 35be7bf | src/lib/bracket/curated-topics.ts |

## Files Created

| File | Purpose |
|------|---------|
| src/lib/bracket/csv-parser.ts | PapaParse wrapper: parseEntrantCSV(File) -> Promise<ParsedEntrant[]> with header detection and seed assignment |
| src/lib/bracket/curated-topics.ts | 10 educational topic lists (TopicList interface + CURATED_TOPICS array) for instant bracket population |

## Files Modified

| File | Changes |
|------|---------|
| package.json | Added papaparse to dependencies, @types/papaparse to devDependencies |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| transformHeader normalizes to lowercase | Flexible matching regardless of CSV header casing (Name, NAME, name all work) |
| First-column fallback for unrecognized headers | Handles single-column CSVs or CSVs with non-standard headers gracefully |
| Seed positions from row order (1-based) | Simple, predictable seeding that teachers can control by reordering rows in their CSV |
| Exactly 16 entries per topic list | Supports maximum bracket size (16) while allowing teachers to select subsets for sizes 4 and 8 |
| "This or That" naming for debate/fun list | More descriptive and classroom-friendly than "Cats vs Dogs" for the icebreaker category |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- **03-06 (Creation Wizard UI):** Ready. Both entrant population modules are exported and typed for direct consumption by the creation form.
- **CSV parser** is a standalone client-side module (no server dependency) ready for file upload integration.
- **Curated topics** are a pure data module importable by any component that needs to display topic selection.
