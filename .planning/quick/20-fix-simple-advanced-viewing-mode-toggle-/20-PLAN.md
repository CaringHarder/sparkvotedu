---
phase: 20-quick
plan: 20
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/shared/viewing-mode-toggle.tsx
  - src/components/bracket/bracket-detail.tsx
  - src/components/teacher/live-dashboard.tsx
autonomous: true
requirements: [QUICK-20]
must_haves:
  truths:
    - "Viewing mode shows two labeled buttons (Simple | Advanced) instead of on/off switch"
    - "Active mode button is visually distinct from inactive mode button"
    - "Clicking the inactive button switches the mode and persists via updateBracketSettings"
    - "Show Seeds and Show Vote Counts toggles remain unchanged as on/off switches"
  artifacts:
    - path: "src/components/shared/viewing-mode-toggle.tsx"
      provides: "Segmented control component for Simple/Advanced mode"
    - path: "src/components/bracket/bracket-detail.tsx"
      provides: "Updated display settings using ViewingModeToggle"
    - path: "src/components/teacher/live-dashboard.tsx"
      provides: "Updated display settings using ViewingModeToggle"
  key_links:
    - from: "src/components/shared/viewing-mode-toggle.tsx"
      to: "src/components/bracket/bracket-detail.tsx"
      via: "import ViewingModeToggle"
    - from: "src/components/shared/viewing-mode-toggle.tsx"
      to: "src/components/teacher/live-dashboard.tsx"
      via: "import ViewingModeToggle"
---

<objective>
Replace the confusing on/off Switch for viewing mode with a clear two-option segmented control ("Simple" | "Advanced") in bracket display settings.

Purpose: The current Switch implies on/off, but viewing mode is a choice between two named modes. A segmented control with labeled buttons makes the options explicit.
Output: New ViewingModeToggle component used in both bracket-detail.tsx and live-dashboard.tsx.
</objective>

<context>
@src/components/shared/quick-settings-toggle.tsx
@src/components/shared/display-settings-section.tsx
@src/components/bracket/bracket-detail.tsx (lines 48-89, 251-286)
@src/components/teacher/live-dashboard.tsx (lines 154-170, 1590-1598)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ViewingModeToggle segmented control component</name>
  <files>src/components/shared/viewing-mode-toggle.tsx</files>
  <action>
Create a new component `ViewingModeToggle` that renders a segmented control with two buttons: "Simple" and "Advanced".

Props interface:
```typescript
interface ViewingModeToggleProps {
  value: 'simple' | 'advanced'
  onValueChange: (mode: 'simple' | 'advanced') => void
  disabled?: boolean
  icon?: React.ReactNode
}
```

Layout: Use the Eye icon (passed via `icon` prop) on the left, then two side-by-side buttons in a rounded container. Style using Tailwind only (no new dependencies):
- Outer wrapper: `flex items-center gap-2 whitespace-nowrap` (matches QuickSettingsToggle spacing)
- Button container: `inline-flex rounded-md border` to create the segmented pill shape
- Each button: `px-2.5 py-0.5 text-xs font-medium transition-colors` with rounded corners on the appropriate side (first button: `rounded-l-md`, second: `rounded-r-md`)
- Active button: `bg-primary text-primary-foreground` (matches the project's shadcn theme tokens)
- Inactive button: `text-muted-foreground hover:bg-accent`
- When disabled, add `opacity-50 pointer-events-none` to the container

The component calls `onValueChange('simple')` or `onValueChange('advanced')` on button click. Do NOT call onValueChange if the clicked button is already the active mode.

Mark as 'use client'. Export the component.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/vibecoding/sparkvotedu && npx tsc --noEmit src/components/shared/viewing-mode-toggle.tsx 2>&1 | head -20</automated>
  </verify>
  <done>ViewingModeToggle component exists, exports correctly, TypeScript compiles without errors.</done>
</task>

<task type="auto">
  <name>Task 2: Replace QuickSettingsToggle with ViewingModeToggle in bracket-detail.tsx and live-dashboard.tsx</name>
  <files>src/components/bracket/bracket-detail.tsx, src/components/teacher/live-dashboard.tsx</files>
  <action>
In BOTH files, make these changes:

1. Add import: `import { ViewingModeToggle } from '@/components/shared/viewing-mode-toggle'`

2. Update the `handleViewingModeChange` function signature. Currently it takes `(checked: boolean)` and converts to mode. Change it to accept the mode directly:
   ```typescript
   // bracket-detail.tsx:
   async function handleViewingModeChange(newMode: 'simple' | 'advanced') {
     setIsUpdatingSettings(true)
     setViewingMode(newMode)
     try {
       await updateBracketSettings({ bracketId: bracket.id, viewingMode: newMode })
     } catch {
       setViewingMode(viewingMode)
     } finally {
       setIsUpdatingSettings(false)
     }
   }
   ```
   For live-dashboard.tsx, same change but keep the `useCallback` wrapper and its dependency array `[bracket.id, viewingMode]`.

3. Replace the QuickSettingsToggle for viewing mode with:
   ```tsx
   <ViewingModeToggle
     value={viewingMode as 'simple' | 'advanced'}
     onValueChange={handleViewingModeChange}
     disabled={isUpdatingSettings}
     icon={<Eye className="h-4 w-4" />}
   />
   ```

4. Keep the QuickSettingsToggle import -- it is still used for Show Seeds and Show Vote Counts.

5. Do NOT change any other display settings, state management, or broadcast logic.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/vibecoding/sparkvotedu && npx tsc --noEmit 2>&1 | tail -5</automated>
  </verify>
  <done>Both bracket-detail.tsx and live-dashboard.tsx use ViewingModeToggle for viewing mode. Show Seeds and Show Vote Counts still use QuickSettingsToggle. Full TypeScript compilation passes.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- full project compiles
2. `npm run build` -- production build succeeds
3. Visual: On bracket detail page, the display settings bar shows a segmented "Simple | Advanced" control instead of a switch, with the Eye icon. Show Seeds and Show Vote Counts still show as on/off switches.
</verification>

<success_criteria>
- Viewing mode displayed as labeled segmented control with "Simple" and "Advanced" buttons
- Active mode visually highlighted, inactive mode clickable
- Clicking inactive mode switches and persists to DB via existing updateBracketSettings
- Change appears on both bracket detail page and live dashboard
- Show Seeds and Show Vote Counts remain as on/off Switch toggles
- No regressions in TypeScript compilation or build
</success_criteria>

<output>
After completion, create `.planning/quick/20-fix-simple-advanced-viewing-mode-toggle-/20-SUMMARY.md`
</output>
