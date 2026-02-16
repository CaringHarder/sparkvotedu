---
phase: 10-landing-page-and-polish
plan: 01
subsystem: design-system
tags: [brand-colors, dark-mode, theme-toggle, skeleton, logo-assets, css-variables]
dependency_graph:
  requires: []
  provides: [brand-color-system, theme-provider, theme-toggle, skeleton-component, logo-assets]
  affects: [globals.css, layout.tsx, all-phase-10-plans]
tech_stack:
  added: [next-themes]
  patterns: [oklch-css-variables, tailwind-v4-theme-registration, class-attribute-dark-mode]
key_files:
  created:
    - src/components/theme-provider.tsx
    - src/components/theme-toggle.tsx
    - src/components/ui/skeleton.tsx
    - public/logo-icon.png
    - public/logo-horizontal.png
    - public/logo-text.png
    - public/logo-text-vertical.png
    - public/logo-icon-bordered.png
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
    - package.json
    - package-lock.json
key_decisions:
  - "oklch color space for brand-blue (hue 230) and brand-amber (hue 75) -- perceptually uniform across light/dark modes"
  - "Dark variant uses :where(.dark, .dark *) for zero-specificity targeting of both .dark element and descendants"
  - "ThemeProvider with attribute=class and disableTransitionOnChange for no-FOUC dark mode"
  - "Logo assets deployed as-is to /public/ -- Next.js Image handles WebP/AVIF conversion at serve time"
metrics:
  duration: ~2m
  completed: 2026-02-15
  tasks: 2/2
---

# Phase 10 Plan 01: Brand Design System Foundation Summary

Brand color system with 6 oklch CSS variables (blue/amber, light/dark variants), dark mode via next-themes class strategy, ThemeToggle dropdown, Skeleton component, and 5 optimized logo assets in /public/.

## Performance

- **Duration:** ~2 minutes
- **Tasks:** 2/2 completed
- **Build:** Passes with zero errors
- **Deviations:** None

## Accomplishments

### Task 1: Brand color system, dark mode infrastructure, and skeleton component (87a70bd)

- Added 6 brand color CSS variables to `:root` and `.dark` blocks using oklch color space
- Registered all 6 as Tailwind theme colors (`--color-brand-blue`, `--color-brand-amber`, etc.) enabling utility classes like `bg-brand-blue`, `text-brand-amber`
- Fixed dark variant selector from `:is(.dark *)` to `:where(.dark, .dark *)` for proper Tailwind v4 compatibility (zero specificity, targets .dark element itself)
- Created `ThemeProvider` wrapper component using next-themes with class attribute strategy, system default, and transition suppression
- Created `ThemeToggle` dropdown component with Sun/Moon/Monitor icons, CSS rotation transitions, and light/dark/system options
- Wrapped root layout with ThemeProvider, added `suppressHydrationWarning` to `<html>` element
- Updated metadata with richer title ("Ignite Student Voice Through Voting"), description, and openGraph fields
- Installed next-themes dependency and shadcn Skeleton component

### Task 2: Logo asset optimization and deployment (4b90bd3)

- Copied 5 logo variants from `/logoassets/` to `/public/` with web-friendly filenames:
  - `logo-icon.png` (1500x1500) -- icon-only for dashboard/favicon
  - `logo-horizontal.png` (2880x1620) -- full lockup with tagline for landing page
  - `logo-text.png` (2880x1620) -- text-only for compact layouts
  - `logo-text-vertical.png` (2880x1620) -- vertical text for sidebar/mobile
  - `logo-icon-bordered.png` (1500x1500) -- bordered icon for favicon source
- All assets are RGBA PNGs ready for next/image automatic optimization

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Brand color system, dark mode, theme toggle, skeleton | 87a70bd | globals.css, layout.tsx, theme-provider.tsx, theme-toggle.tsx, skeleton.tsx |
| 2 | Logo asset optimization | 4b90bd3 | public/logo-*.png (5 files) |

## Files Created

- `src/components/theme-provider.tsx` -- ThemeProvider wrapper using next-themes
- `src/components/theme-toggle.tsx` -- Theme toggle dropdown (light/dark/system)
- `src/components/ui/skeleton.tsx` -- shadcn Skeleton component with pulse animation
- `public/logo-icon.png` -- Icon-only logo (1500x1500)
- `public/logo-horizontal.png` -- Horizontal lockup with tagline (2880x1620)
- `public/logo-text.png` -- Text-only logo (2880x1620)
- `public/logo-text-vertical.png` -- Vertical text logo (2880x1620)
- `public/logo-icon-bordered.png` -- Bordered icon for favicon (1500x1500)

## Files Modified

- `src/app/globals.css` -- Brand color variables in :root, .dark, @theme; dark variant selector fix
- `src/app/layout.tsx` -- ThemeProvider wrapping, suppressHydrationWarning, updated metadata
- `package.json` -- next-themes dependency added
- `package-lock.json` -- lockfile updated

## Decisions Made

1. **oklch color space for brand colors** -- Perceptually uniform, consistent chroma across light/dark modes. Brand blue at hue 230, brand amber at hue 75.
2. **:where() dark variant selector** -- Zero specificity ensures .dark class on html element is properly targeted alongside descendants, fixing Tailwind v4 dark mode specificity issues.
3. **class attribute strategy for ThemeProvider** -- Works with Tailwind's class-based dark mode. disableTransitionOnChange prevents flash during theme switch.
4. **Logo assets unmodified** -- Next.js Image component handles WebP/AVIF conversion and responsive sizing at serve time, no manual optimization needed.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Plan Readiness

Plan 10-02 (Landing Page Hero and Navigation) can now use:
- Brand color utilities: `bg-brand-blue`, `text-brand-amber`, `bg-brand-blue-light`, etc.
- ThemeToggle component for header navigation
- Logo assets via `<Image src="/logo-horizontal.png" ... />`
- Skeleton component for loading state placeholders
- Dark mode fully functional with system preference detection

## Self-Check: PASSED

All 8 created files verified on disk. Both commit hashes (87a70bd, 4b90bd3) verified in git log.
