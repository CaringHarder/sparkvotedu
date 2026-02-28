---
phase: quick-16
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/bracket/bracket-card.tsx
  - src/components/shared/activity-metadata-bar.tsx
  - src/app/(dashboard)/activities/activities-list.tsx
autonomous: true
requirements: [QUICK-16]

must_haves:
  truths:
    - "ViewingMode badge only appears on single_elimination brackets"
    - "Non-single_elimination brackets (double_elimination, round_robin, predictive, sports) never show a viewingMode badge"
    - "Single elimination brackets with viewingMode='simple' show 'Simple' badge"
    - "Single elimination brackets with viewingMode='advanced' show 'Advanced' badge"
  artifacts:
    - path: "src/components/bracket/bracket-card.tsx"
      provides: "Bracket card with conditional viewingMode badge"
      contains: "single_elimination"
    - path: "src/components/shared/activity-metadata-bar.tsx"
      provides: "Metadata bar with conditional viewingMode badge"
      contains: "single_elimination"
    - path: "src/app/(dashboard)/activities/activities-list.tsx"
      provides: "Activities list with conditional viewingMode badge"
      contains: "single_elimination"
  key_links:
    - from: "src/components/bracket/bracket-card.tsx"
      to: "viewingMode badge rendering"
      via: "bracketType === 'single_elimination' guard"
      pattern: "bracketType.*single_elimination.*viewingMode"
    - from: "src/components/shared/activity-metadata-bar.tsx"
      to: "viewingMode badge rendering"
      via: "bracketType === 'single_elimination' guard"
      pattern: "bracketType.*single_elimination.*viewingMode"
---

<objective>
Fix viewingMode badge to only display on single_elimination brackets across all UI surfaces.

Purpose: The viewingMode setting (Simple vs Advanced) only applies to single_elimination brackets. Currently, ALL bracket types display a viewingMode badge (defaulting to "Advanced" from the database default), which is misleading for double_elimination, round_robin, predictive, and sports brackets.

Output: Three files updated with bracketType guards so the viewingMode badge only renders when bracketType === 'single_elimination'.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/bracket/bracket-card.tsx
@src/components/shared/activity-metadata-bar.tsx
@src/app/(dashboard)/activities/activities-list.tsx

<interfaces>
<!-- BracketCard props (bracket-card.tsx line 11-29) -->
```typescript
interface BracketCardProps {
  bracket: {
    id: string
    name: string
    bracketType: string    // 'single_elimination' | 'double_elimination' | 'round_robin' | 'predictive' | 'sports'
    viewingMode?: string   // 'simple' | 'advanced' -- only relevant for single_elimination
    // ... other fields
  }
}
```

<!-- BracketMetadataBar props (activity-metadata-bar.tsx line 21-31) -->
```typescript
interface BracketMetadataBarProps {
  bracketType: string
  viewingMode: string      // always passed from parent, but should only render for single_elimination
  // ... other fields
}
```

<!-- ActivityItem meta (activities-list.tsx line 19-33) -->
```typescript
interface ActivityItem {
  meta: {
    bracketType?: string
    viewingMode?: string   // only relevant when bracketType === 'single_elimination'
    // ... other fields
  }
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Guard viewingMode badge with single_elimination check in all three display components</name>
  <files>
    src/components/bracket/bracket-card.tsx
    src/components/shared/activity-metadata-bar.tsx
    src/app/(dashboard)/activities/activities-list.tsx
  </files>
  <action>
In each file, add a `bracketType === 'single_elimination'` condition to the viewingMode badge rendering:

1. **bracket-card.tsx line 182**: Change `{bracket.viewingMode && (` to `{bracket.bracketType === 'single_elimination' && bracket.viewingMode && (`. This ensures the Eye icon badge with Simple/Advanced text only renders for single_elimination brackets.

2. **activity-metadata-bar.tsx line 66**: Change `{viewingMode && (` to `{bracketType === 'single_elimination' && viewingMode && (`. The component already receives `bracketType` as a prop, so no new prop is needed.

3. **activities-list.tsx line 327**: Change `{isBracket && item.meta.viewingMode && (` to `{isBracket && item.meta.bracketType === 'single_elimination' && item.meta.viewingMode && (`. The `bracketType` field is already available on `item.meta`.

Do NOT change any other logic, styling, or component structure. The only change in each file is adding the `bracketType === 'single_elimination'` check to the existing viewingMode conditional.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/vibecoding/sparkvotedu && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>
- viewingMode badge only renders when bracketType === 'single_elimination' in all three components
- TypeScript compiles without errors
- No other behavior changed (pacing badge, prediction badge, status badge all unaffected)
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes -- no type errors introduced
2. Grep confirms the guard is present in all three files: `grep -n "single_elimination.*viewingMode\|viewingMode.*single_elimination" src/components/bracket/bracket-card.tsx src/components/shared/activity-metadata-bar.tsx src/app/\(dashboard\)/activities/activities-list.tsx`
3. No other references to viewingMode badge rendering exist outside these three files (the detail page and live page use BracketMetadataBar which is fixed in activity-metadata-bar.tsx)
</verification>

<success_criteria>
- ViewingMode badge (Eye icon + Simple/Advanced text) never appears on double_elimination, round_robin, predictive, or sports brackets
- ViewingMode badge correctly appears on single_elimination brackets showing either "Simple" or "Advanced"
- All TypeScript compilation passes
- No regressions to other badge rendering (pacing, prediction mode, sport gender, status)
</success_criteria>

<output>
After completion, create `.planning/quick/16-show-correct-bracket-poll-settings-on-ca/16-01-SUMMARY.md`
</output>
