---
phase: quick-11
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(dashboard)/brackets/[bracketId]/edit/page.tsx
  - src/components/bracket/bracket-edit-form.tsx
autonomous: true
requirements: [QUICK-11]
must_haves:
  truths:
    - "When a teacher uploads images for entrants and then clicks Edit, the images are still visible on the edit page"
    - "Saving from the edit page preserves the entrant images"
  artifacts:
    - path: "src/app/(dashboard)/brackets/[bracketId]/edit/page.tsx"
      provides: "Server-side serialization of bracket data including logoUrl"
      contains: "logoUrl"
    - path: "src/components/bracket/bracket-edit-form.tsx"
      provides: "Edit form that receives and displays entrant images"
      contains: "logoUrl"
  key_links:
    - from: "src/app/(dashboard)/brackets/[bracketId]/edit/page.tsx"
      to: "src/components/bracket/bracket-edit-form.tsx"
      via: "serialized bracket prop including logoUrl per entrant"
      pattern: "logoUrl.*e\\.logoUrl"
---

<objective>
Fix bracket entrant images disappearing when navigating to the edit page.

Purpose: When a teacher creates a bracket with images on entrants, then clicks Edit to modify the bracket, the images vanish because the edit page's server component strips `logoUrl` from the entrant data during serialization. This is a data-pass-through bug -- the DAL returns `logoUrl`, but the server page does not forward it to the client component.

Output: Bracket edit page that preserves and displays all entrant images.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/(dashboard)/brackets/[bracketId]/edit/page.tsx
@src/components/bracket/bracket-edit-form.tsx
@src/components/bracket/entrant-image-upload.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Pass logoUrl through edit page serialization and update edit form props</name>
  <files>
    src/app/(dashboard)/brackets/[bracketId]/edit/page.tsx
    src/components/bracket/bracket-edit-form.tsx
  </files>
  <action>
Two changes are needed:

1. In `src/app/(dashboard)/brackets/[bracketId]/edit/page.tsx`, line 32 area -- add `logoUrl` to the entrant serialization mapping. Currently the entrants are mapped with only `id`, `name`, `seedPosition`, `bracketId`. Add `logoUrl: e.logoUrl ?? null` to the mapping so the field is forwarded to the client component.

2. In `src/components/bracket/bracket-edit-form.tsx`, line 22-36 area -- add `logoUrl?: string | null` to the `entrants` array type inside the `BracketEditFormProps` interface. Currently the interface defines entrants with `id`, `name`, `seedPosition`, `bracketId` but omits `logoUrl`. The downstream code in the component already reads `logoUrl` from entrants at line 51 (`logoUrl: e.logoUrl ?? null`), so the interface just needs to declare it.

Do NOT change any other logic. The `BracketEditForm` component already handles `logoUrl` correctly in its state initialization (line 46-53) and in its `handleImageChange` and `handleSave` functions. The `EntrantImageUpload` component already receives `existingImageUrl={entrant.logoUrl}`. The only issue is the data not arriving from the server page.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Visually inspect both files to confirm `logoUrl` appears in the serialization and the props interface.
  </verify>
  <done>
The edit page serialization includes `logoUrl` per entrant, the `BracketEditFormProps` interface declares `logoUrl` as an optional field, and TypeScript compiles without errors. Entrant images now persist when navigating to the edit page.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- The edit page serialization at `page.tsx` line ~32 includes `logoUrl: e.logoUrl ?? null`
- The `BracketEditFormProps` interface includes `logoUrl?: string | null` in its entrant type
</verification>

<success_criteria>
- Bracket entrant images are preserved when clicking Edit on a draft bracket
- No TypeScript errors introduced
- Save from edit page still correctly passes `logoUrl` values to the server action
</success_criteria>

<output>
After completion, create `.planning/quick/11-when-uploading-images-and-creating-the-b/11-SUMMARY.md`
</output>
