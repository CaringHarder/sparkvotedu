---
phase: quick-26
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/poll/poll-form.tsx
autonomous: true
---

<objective>
Replace the 18-button template grid in poll Quick Create with a grouped dropdown to reduce vertical space and keep the form visible after template selection.

Purpose: The current grid of 18 template buttons takes ~5 rows, pushing the question/options/submit below the fold. A grouped `<select>` collapses this into a single row.
Output: Updated poll-form.tsx with dropdown replacing grid.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/poll/poll-form.tsx
@src/lib/poll/templates.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace template grid with grouped select dropdown</name>
  <files>src/components/poll/poll-form.tsx</files>
  <action>
In `src/components/poll/poll-form.tsx`:

1. Remove the `CATEGORY_COLORS` constant (lines 18-24) — no longer needed.

2. Remove the `Badge` import from `@/components/ui/badge` (line 15) — no longer needed.

3. Import `POLL_TEMPLATE_CATEGORIES` from `@/lib/poll/templates` (add to existing import on line 14):
   ```ts
   import { POLL_TEMPLATES, POLL_TEMPLATE_CATEGORIES, type PollTemplate } from '@/lib/poll/templates'
   ```

4. Replace the template grid block (lines 216-241) with a grouped select dropdown:
   ```tsx
   {isQuickCreate && (
     <div className="space-y-2">
       <Label htmlFor="template-select">Start from a template</Label>
       <select
         id="template-select"
         value={selectedTemplate?.id ?? ''}
         onChange={(e) => {
           const tmpl = POLL_TEMPLATES.find((t) => t.id === e.target.value) ?? null
           handleTemplateSelect(tmpl)
         }}
         className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
       >
         <option value="">Choose a template...</option>
         {POLL_TEMPLATE_CATEGORIES.map((cat) => (
           <optgroup key={cat} label={cat}>
             {POLL_TEMPLATES.filter((t) => t.category === cat).map((t) => (
               <option key={t.id} value={t.id}>{t.question}</option>
             ))}
           </optgroup>
         ))}
       </select>
     </div>
   )}
   ```

   This uses the same styling pattern as the existing session dropdown (lines 277-289). The `Label` component is already imported. Selecting the placeholder ("Choose a template...") fires `handleTemplateSelect(null)` which clears the form — this matches existing behavior when deselecting a template button.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
    - Template grid replaced with a single-row grouped select dropdown
    - CATEGORY_COLORS constant and Badge import removed (dead code cleanup)
    - Selecting a template populates the form; selecting placeholder clears it
    - TypeScript compiles with no errors
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (no type errors)
- Visual check: Quick Create page shows a single dropdown row instead of 18-button grid
- Selecting a template from dropdown populates question and options
- Selecting "Choose a template..." clears form back to empty state
</verification>

<success_criteria>
Template selection collapsed from ~5 rows of buttons to 1 dropdown row. Form fields visible without scrolling after template section.
</success_criteria>

<output>
After completion, create `.planning/quick/26-poll-quick-create-dropdown-templates/26-SUMMARY.md`
</output>
