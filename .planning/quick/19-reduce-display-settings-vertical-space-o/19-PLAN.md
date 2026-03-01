---
phase: 19-reduce-display-settings-vertical-space
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/shared/display-settings-section.tsx
  - src/components/shared/quick-settings-toggle.tsx
  - src/components/shared/locked-setting-indicator.tsx
autonomous: true
requirements: [QUICK-19]

must_haves:
  truths:
    - "Display settings section uses a single-row horizontal flow instead of vertical stacking"
    - "Locked indicators and toggle controls sit inline side-by-side when viewport width allows"
    - "All 4 usage sites (bracket live, poll live, bracket detail, poll detail) render compactly without code changes"
    - "Toggle switches remain fully functional after layout change"
  artifacts:
    - path: "src/components/shared/display-settings-section.tsx"
      provides: "Compact horizontal container layout"
      contains: "flex flex-wrap"
    - path: "src/components/shared/quick-settings-toggle.tsx"
      provides: "Inline-friendly toggle with visual separator"
      contains: "flex items-center"
    - path: "src/components/shared/locked-setting-indicator.tsx"
      provides: "Inline-friendly locked indicator"
      contains: "flex items-center"
  key_links:
    - from: "src/components/shared/display-settings-section.tsx"
      to: "All 4 usage sites"
      via: "children prop layout (flex-wrap container)"
      pattern: "flex flex-wrap"
    - from: "src/components/shared/quick-settings-toggle.tsx"
      to: "src/components/shared/display-settings-section.tsx"
      via: "Rendered as flex-wrap child"
      pattern: "QuickSettingsToggle"
---

<objective>
Compact the display settings sections on teacher live and detail pages by switching from vertical stacking to a horizontal inline flow layout.

Purpose: Reduce vertical space consumed by the display settings panel so more of the actual content (bracket diagram, poll results) is visible without scrolling.
Output: Three shared component files updated with compact horizontal layout that automatically applies to all 4 usage sites.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/shared/display-settings-section.tsx
@src/components/shared/quick-settings-toggle.tsx
@src/components/shared/locked-setting-indicator.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Compact DisplaySettingsSection container to horizontal flex-wrap layout</name>
  <files>src/components/shared/display-settings-section.tsx</files>
  <action>
Modify the DisplaySettingsSection component to use a compact horizontal layout:

1. Outer container: Change `p-3 space-y-2` to `px-3 py-2 space-y-1.5` (reduce vertical padding and gap between heading and children).

2. Children wrapper: Change `<div className="space-y-2">` to `<div className="flex flex-wrap items-center gap-x-4 gap-y-1">`. This makes children flow horizontally and wrap to new lines only when needed. The `gap-x-4` provides horizontal spacing between items, and `gap-y-1` provides minimal vertical spacing when items wrap.

3. Heading: Change `text-xs` to `text-[11px]` and reduce gap from `gap-1.5` to `gap-1` to make the heading slightly more compact. Keep the Settings icon, uppercase tracking, and muted foreground color.

Do NOT change the component interface or props. The layout change propagates to all 4 usage sites automatically since they pass children into this container.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/vibecoding/sparkvotedu && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>DisplaySettingsSection renders children in a horizontal flex-wrap flow with reduced padding, compacting vertical space by approximately 40-50%.</done>
</task>

<task type="auto">
  <name>Task 2: Update QuickSettingsToggle and LockedSettingIndicator for inline flow</name>
  <files>src/components/shared/quick-settings-toggle.tsx, src/components/shared/locked-setting-indicator.tsx</files>
  <action>
**QuickSettingsToggle changes:**

1. Add `whitespace-nowrap` to the label className to prevent text wrapping mid-item. No border separators -- the parent's `gap-x-4` handles spacing.

2. Flatten the label text structure: remove the `<div className="flex flex-col">` wrapper. Render the label as a single inline `<span>`. Move the `description` prop to a `title` attribute on the label span instead of visible text.

Final structure:
```tsx
<label className="flex items-center gap-2 whitespace-nowrap">
  {icon && <span className="h-4 w-4 shrink-0 text-muted-foreground">{icon}</span>}
  <span className="text-sm font-medium text-muted-foreground" title={description}>{label}</span>
  <Switch ... />
</label>
```

**LockedSettingIndicator changes:**

1. Add `whitespace-nowrap` to the outer div className.
2. Reduce gap from `gap-2` to `gap-1.5` for tighter inline spacing.

Change className from `"flex items-center gap-2 text-sm"` to `"flex items-center gap-1.5 text-sm whitespace-nowrap"`.

Do NOT change either component's interface or props.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/vibecoding/sparkvotedu && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Both components render as compact inline-friendly items: QuickSettingsToggle has no multi-line label wrapper and uses whitespace-nowrap; LockedSettingIndicator uses tighter gap and whitespace-nowrap. All 4 usage sites display settings horizontally with reduced vertical footprint.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `npx tsc --noEmit`
2. Dev server renders without runtime errors: `npm run dev` and visit bracket/poll pages
3. Visual check: Display settings section should show locked indicators and toggles flowing horizontally in a single or two rows instead of 4-5 stacked rows
4. Functional check: All toggle switches still work (click to toggle, state updates correctly)
</verification>

<success_criteria>
- Display settings panels on all 4 pages (bracket live, poll live, bracket detail, poll detail) use roughly 40-50% less vertical space
- Items flow horizontally and wrap naturally at narrow viewports
- No changes needed at any of the 4 usage sites -- layout is controlled entirely by the 3 shared components
- All toggles remain functional
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/19-reduce-display-settings-vertical-space-o/19-SUMMARY.md`
</output>
