---
status: resolved
trigger: "Bracket entrants have logoUrl DB field but no upload UI for non-sports brackets, and standard bracket diagram doesn't render logos"
created: 2026-02-16T00:00:00Z
updated: 2026-02-16T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED and FIXED - All layers wired: validation, upload API, upload component, form wiring (create + edit), DAL persistence, bracket diagram rendering
test: TypeScript compiles cleanly with zero errors
expecting: Full feature working end-to-end
next_action: Archive session

## Symptoms

expected: Teachers can upload logos/images for bracket entrants during creation or editing, and those images display in the bracket diagram
actual: No image upload UI exists for bracket entrants. Standard bracket diagram only shows names. Validation schema rejects logoUrl.
errors: None - feature doesn't exist
reproduction: Create a non-sports bracket - no way to add entrant images
started: Never existed for manual brackets. Sports brackets auto-populate logos from SportsDataIO API.

## Eliminated

## Evidence

- timestamp: 2026-02-16T00:00:30Z
  checked: validation.ts entrantSchema (line 70-76)
  found: entrantSchema only has {name, seedPosition} - no logoUrl field
  implication: Any form submission including logoUrl would be stripped/rejected by Zod

- timestamp: 2026-02-16T00:00:30Z
  checked: bracket-diagram.tsx MatchupBox (line 134-435)
  found: Only renders text names for entrants, no image/logo rendering. SportsMatchupOverlay has logo rendering but only used when isSports=true
  implication: Even if entrants had logoUrl, standard brackets wouldn't show them

- timestamp: 2026-02-16T00:00:30Z
  checked: entrant-list.tsx EntrantItem interface and rendering
  found: Interface has {id, name, seedPosition} only - no logoUrl. No image upload UI in the list
  implication: No way to attach images to entrants in the UI

- timestamp: 2026-02-16T00:00:30Z
  checked: bracket-form.tsx FormEntrant and handleSubmit
  found: FormEntrant has {id, name, seedPosition}. Submit maps to {name, seedPosition} only
  implication: Even if upload worked, logoUrl wouldn't be sent to server

- timestamp: 2026-02-16T00:00:30Z
  checked: bracket-edit-form.tsx Entrant interface and handleSave
  found: Same gap - no logoUrl in interface or save payload
  implication: Edit form also can't handle images

- timestamp: 2026-02-16T00:00:30Z
  checked: DAL bracket.ts createBracketDAL entrant creation (line 252-260)
  found: Only persists {name, seedPosition, bracketId} - no logoUrl in create data
  implication: Server doesn't save logoUrl even if received

- timestamp: 2026-02-16T00:00:30Z
  checked: Prisma schema BracketEntrant model
  found: logoUrl field EXISTS in DB schema (line 120: logoUrl String? @map("logo_url"))
  implication: DB is ready, just needs wiring through all layers

- timestamp: 2026-02-16T00:00:30Z
  checked: sports-matchup-box.tsx SportsEntrantRow (line 146-221)
  found: Has working logo rendering pattern using SVG <image> element with entrant.logoUrl
  implication: Can reuse this pattern for standard bracket diagram

- timestamp: 2026-02-16T00:00:30Z
  checked: option-image-upload.tsx and polls upload-url route
  found: Complete working pattern: compress -> get signed URL -> upload to Supabase -> return public URL
  implication: Can replicate for bracket-images bucket

## Resolution

root_cause: Feature was never built for manual brackets. The logoUrl field existed in the database (Prisma schema) but was never wired through the application stack - validation stripped it, no upload API existed, no UI component existed, DAL didn't persist it, and the standard bracket diagram didn't render it.

fix: Implemented full feature across 8 layers following the existing poll-images pattern:
1. Validation: Added logoUrl (optional, nullable URL) to entrantSchema in validation.ts
2. Upload API: Created /api/brackets/[bracketId]/upload-url route (mirrors poll upload-url pattern, uses bracket-images Supabase bucket)
3. Upload Component: Created EntrantImageUpload component (mirrors OptionImageUpload pattern - compress, signed URL, PUT upload)
4. Entrant List UI: Added EntrantImageUpload to each entrant row in entrant-list.tsx, with read-only preview in disabled mode
5. Create Form: Wired logoUrl through bracket-form.tsx (FormEntrant interface, handleImageChange, submit payload)
6. Edit Form: Wired logoUrl through bracket-edit-form.tsx (Entrant interface, props, handleImageChange, save payload, inline upload UI)
7. DAL: Added logoUrl persistence in createBracketDAL, createDoubleElimBracketDAL, updateBracketEntrantsDAL, and round-robin DAL
8. Bracket Diagram: Added SVG <image> elements for entrant logos in standard MatchupBox (both top and bottom entrants), shifting text to accommodate logo when present

verification: TypeScript compiles with zero errors (npx tsc --noEmit passes clean). All type interfaces updated consistently across the full stack.

files_changed:
  - src/lib/utils/validation.ts (added logoUrl to entrantSchema)
  - src/app/api/brackets/[bracketId]/upload-url/route.ts (NEW - upload API)
  - src/components/bracket/entrant-image-upload.tsx (NEW - upload component)
  - src/components/bracket/entrant-list.tsx (added image upload + preview)
  - src/components/bracket/bracket-form.tsx (wired logoUrl through create flow)
  - src/components/bracket/bracket-edit-form.tsx (wired logoUrl through edit flow)
  - src/lib/dal/bracket.ts (logoUrl in create/update DAL functions)
  - src/lib/dal/round-robin.ts (logoUrl in round-robin DAL)
  - src/components/bracket/bracket-diagram.tsx (SVG logo rendering in MatchupBox)
