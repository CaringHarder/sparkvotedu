---
status: diagnosed
trigger: "Diagnose why 64-entrant QuadrantBracketLayout works on student page but not teacher pages"
created: 2026-02-08T12:00:00Z
updated: 2026-02-08T12:00:00Z
---

## ROOT CAUSE FOUND

### Summary

The teacher live-dashboard uses `(bracket.maxEntrants ?? 0) >= 64` as its conditional, with a fallback of `0` instead of `bracket.size`. When `maxEntrants` is `null` (which can happen for older brackets or certain creation paths), the condition evaluates to `0 >= 64` which is `false`, so the standard horizontal `BracketDiagram` is rendered instead of the quadrant layout.

---

## Evidence

### File Analysis

| File | Condition | Fallback | Works? |
|------|-----------|----------|--------|
| `src/components/student/advanced-voting-view.tsx` | `(bracket.maxEntrants ?? bracket.size) >= 64` | `bracket.size` | YES |
| `src/components/bracket/bracket-detail.tsx` | `(bracket.maxEntrants ?? bracket.entrants.length) >= 64` | `bracket.entrants.length` | MAYBE |
| `src/components/teacher/live-dashboard.tsx` | `(bracket.maxEntrants ?? 0) >= 64` | `0` | NO |

### Line References

**Student page (WORKS) - Line 167:**
```tsx
{(bracket.maxEntrants ?? bracket.size) >= 64 ? (
  <QuadrantBracketLayout ... />
) : (
  <BracketDiagram ... />
)}
```

**Teacher bracket-detail (MAYBE WORKS) - Line 219:**
```tsx
{(bracket.maxEntrants ?? bracket.entrants.length) >= 64 ? (
  <QuadrantBracketLayout ... />
) : (
  <BracketDiagram ... />
)}
```

**Teacher live-dashboard (BROKEN) - Line 1026:**
```tsx
{(bracket.maxEntrants ?? 0) >= 64 ? (
  <QuadrantBracketLayout ... />
) : (
  <BracketDiagram ... />
)}
```

### Type Context

From `src/lib/bracket/types.ts`:
- `size: number` - Always present (required field)
- `maxEntrants: number | null` - Can be null

The `maxEntrants` field is nullable, so **all conditions must have a sensible fallback**.

---

## Root Cause

**Primary cause:** The live-dashboard conditional uses `0` as the fallback when `maxEntrants` is null, which means the quadrant layout is NEVER used for brackets where `maxEntrants` was not set.

**Secondary concern:** The bracket-detail uses `bracket.entrants.length` as fallback, which could also fail if entrants haven't loaded yet or the bracket has fewer actual entrants than the size (e.g., 64-size bracket with only 50 entrants entered so far).

**Why student page works:** It uses `bracket.size` which is always the declared bracket size (e.g., 64), regardless of whether `maxEntrants` was explicitly set.

---

## Proposed Fix

### Consistency fix for all three files

Use `bracket.size` as the fallback in all locations since:
1. `bracket.size` is a required field (never null)
2. `bracket.size` represents the declared bracket capacity
3. This matches what the student page already does correctly

**live-dashboard.tsx (Line 1026):**
```tsx
// BEFORE
(bracket.maxEntrants ?? 0) >= 64

// AFTER
(bracket.maxEntrants ?? bracket.size) >= 64
```

**bracket-detail.tsx (Line 219):**
```tsx
// BEFORE
(bracket.maxEntrants ?? bracket.entrants.length) >= 64

// AFTER
(bracket.maxEntrants ?? bracket.size) >= 64
```

### Files to modify
1. `/src/components/teacher/live-dashboard.tsx` - Line 1026
2. `/src/components/bracket/bracket-detail.tsx` - Line 219

No changes needed for `advanced-voting-view.tsx` (already correct).

---

## Verification Plan

After fix:
1. Create a 64-entrant bracket (or use existing)
2. Navigate to teacher bracket-detail page -> Should show 2x2 quadrant grid
3. Go Live -> Teacher live-dashboard -> Should show 2x2 quadrant grid with TL/TR/BL/BR regions
4. Join as student -> Should show 2x2 quadrant grid (already works)

---

## Status

**Diagnosed.** Ready for fix implementation.
