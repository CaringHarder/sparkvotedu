---
phase: quick-9
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(dashboard)/activities/activities-list.tsx
autonomous: true
requirements: [QUICK-9]

must_haves:
  truths:
    - "Each activity card on the Activities page displays a triple-dot (MoreVertical) context menu in the top-right corner"
    - "The context menu provides Rename, Edit, Copy Link, Duplicate, Archive, and Delete actions -- identical to bracket and poll page cards"
    - "Rename inline editing works on activity cards (input replaces title, Enter saves, Escape cancels)"
    - "Duplicate, Archive, and Delete actions call the correct server action based on item type (bracket vs poll) and refresh the page"
  artifacts:
    - path: "src/app/(dashboard)/activities/activities-list.tsx"
      provides: "ActivityItemCard with CardContextMenu integration"
      contains: "CardContextMenu"
  key_links:
    - from: "src/app/(dashboard)/activities/activities-list.tsx"
      to: "src/components/shared/card-context-menu.tsx"
      via: "import and render CardContextMenu"
      pattern: "CardContextMenu"
    - from: "src/app/(dashboard)/activities/activities-list.tsx"
      to: "src/actions/bracket"
      via: "renameBracket server action for inline rename"
      pattern: "renameBracket"
    - from: "src/app/(dashboard)/activities/activities-list.tsx"
      to: "src/actions/poll"
      via: "renamePoll server action for inline rename"
      pattern: "renamePoll"
---

<objective>
Add the triple-dot context menu (CardContextMenu) to activity cards on the Activities page, matching the existing pattern used by BracketCard and PollCard on their respective pages.

Purpose: Teachers currently cannot rename, duplicate, archive, or delete activities from the unified Activities page -- they must navigate to the individual Brackets or Polls page to access these actions. This creates UX inconsistency.

Output: Updated activities-list.tsx with CardContextMenu on every activity card.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/(dashboard)/activities/activities-list.tsx
@src/components/shared/card-context-menu.tsx
@src/components/bracket/bracket-card.tsx
@src/components/poll/poll-card.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add CardContextMenu and inline rename to ActivityItemCard</name>
  <files>src/app/(dashboard)/activities/activities-list.tsx</files>
  <action>
Refactor the `ActivityItemCard` component in activities-list.tsx to add the triple-dot context menu, following the exact same pattern used by `BracketCard` and `PollCard`:

1. Add imports:
   - `useRouter` from `next/navigation`
   - `useRef, useEffect, useTransition` from `react` (useState already imported)
   - `CardContextMenu` from `@/components/shared/card-context-menu`
   - `renameBracket` from `@/actions/bracket`
   - `renamePoll` from `@/actions/poll`

2. Convert `ActivityItemCard` from a simple function to a stateful component with:
   - `const router = useRouter()`
   - `const [isRenaming, setIsRenaming] = useState(false)`
   - `const [renameValue, setRenameValue] = useState(item.name)`
   - `const [isPending, startTransition] = useTransition()`
   - `const inputRef = useRef<HTMLInputElement>(null)`
   - A `useEffect` that auto-focuses and selects the rename input when `isRenaming` becomes true

3. Add rename handlers (same pattern as BracketCard/PollCard):
   - `handleRenameSave`: trims input, skips if unchanged/empty, calls `renameBracket({ bracketId: item.id, name: trimmed })` or `renamePoll({ pollId: item.id, question: trimmed })` based on `item.type`, then `router.refresh()`
   - `handleRenameKeyDown`: Enter saves, Escape cancels

4. Change the card's outer element from `<Link>` to `<div>` with the same classes (`group rounded-lg border bg-card transition-shadow hover:shadow-md`). Place the `<CardContextMenu>` in an absolute-positioned div (`absolute right-2 top-2 z-10`) -- same as BracketCard and PollCard. Then wrap the card body content in a `<Link>` with `className="block p-4"`.

5. Render `CardContextMenu` with these props:
   - `itemId={item.id}`
   - `itemName={item.name}`
   - `itemType={item.type}`
   - `status={item.status}`
   - `editHref={item.type === 'bracket' ? `/brackets/${item.id}` : `/polls/${item.id}`}`
   - `sessionCode={item.type === 'bracket' ? item.meta.sessionCode : undefined}`
   - `onStartRename={() => setIsRenaming(true)}`
   - `onDuplicated={() => router.refresh()}`
   - `onArchived={() => router.refresh()}`
   - `onDeleted={() => router.refresh()}`

6. Replace the static `{item.name}` title with the conditional rename pattern: when `isRenaming` is true, show an `<input>` with the rename handlers; otherwise show the `<h3>` with `{renameValue}` (not `{item.name}` so the optimistic rename displays). Add `pr-8` to the title's parent div (`min-w-0 flex-1 pr-8`) to prevent text from overlapping the context menu button.

7. Keep all existing visual styling, badges, meta info, date formatting, and filtering logic exactly as-is. The only structural change is the Link-to-div conversion and the addition of the menu + rename.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Run `npx next lint` to confirm no lint errors. Visually verify at http://localhost:3000/activities that each card shows the triple-dot menu in the top-right corner, the dropdown opens with Rename/Edit/Copy Link/Duplicate/Archive/Delete options, and clicking the card body still navigates to the bracket or poll detail page.
  </verify>
  <done>
Every activity card on the Activities page displays a MoreVertical triple-dot context menu in the top-right corner with Rename, Edit, Copy Link, Duplicate, Archive, and Delete actions. Inline rename works (Enter saves, Escape cancels). Card body remains clickable as a navigation link. The menu behavior matches the bracket and poll pages exactly.
  </done>
</task>

</tasks>

<verification>
- Open /activities page, confirm triple-dot menu appears on every card
- Click the triple-dot menu on a bracket card, verify all 6 menu items appear
- Click the triple-dot menu on a poll card, verify all 6 menu items appear
- Click "Rename" and verify inline input appears, type a new name, press Enter -- name updates
- Click "Delete" and verify the delete confirmation dialog appears
- Click the card body (not the menu) and verify it navigates to the correct detail page
- `npx tsc --noEmit` passes with no errors
</verification>

<success_criteria>
Activity cards on the Activities page have the same triple-dot context menu as the Brackets and Polls pages, with full Rename/Edit/Copy Link/Duplicate/Archive/Delete functionality.
</success_criteria>

<output>
After completion, create `.planning/quick/9-cards-on-activities-page-don-t-have-trip/9-SUMMARY.md`
</output>
