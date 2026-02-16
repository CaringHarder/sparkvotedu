# Phase 10: Landing Page & Polish - Research

**Researched:** 2026-02-15
**Domain:** UI/UX polish, landing page design, dark mode, responsive design, brand identity
**Confidence:** HIGH

## Summary

Phase 10 transforms the current minimal SparkVotEDU interface into a polished, branded product. The project currently has a functional but bare-bones landing page (class code input + teacher sign-in links), a utilitarian teacher dashboard with basic sidebar navigation, and a clean but unbranded student experience. The tech stack is already well-suited for this work: Tailwind CSS v4 with CSS-first configuration, shadcn/ui components, motion/react for animations, and a working dark mode CSS variant (`@custom-variant dark`) that just needs `next-themes` to activate.

The primary technical challenges are: (1) establishing a cohesive brand color system derived from the logo's sky blue and amber/gold colors, integrating it into the existing Tailwind CSS variable architecture; (2) adding dark mode support with `next-themes` while ensuring all 36+ files that already use `dark:` classes work correctly; (3) building a full marketing landing page that reuses the existing PricingCards component; (4) replacing loading spinners/pulse placeholders with proper skeleton screens across the application; and (5) auditing responsive behavior across mobile/tablet/desktop breakpoints for both teacher and student experiences.

**Primary recommendation:** Start with the brand color system and dark mode infrastructure (these affect every subsequent plan), then build the landing page, then systematically polish teacher dashboard and student experience, and finish with responsive audit.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full-width centered hero with "Ignite Student Voice Through Voting" motto as headline
- Minimal navigation: logo + Sign In button only (no multi-link nav bar)
- Focus messaging on how bracketing and polling spark student engagement in the classroom
- Icon-driven feature showcase sections (icons + short descriptions, not screenshots)
- Reuse existing PricingCards component from /billing for pricing section
- Include a student class code input on the landing page so students can jump right in
- Visual tone driven by logo: sky blue (#4BB8E8-range) spark rays, amber/gold (#F5A623-range) checkmark accents, clean white backgrounds
- Logo assets at `/logoassets/` with variants: Logo 1.png (icon only), Logo Icon.png (icon with rounded border), SparkVotEDU Horizontal with tagline and logo.png (full horizontal lockup), SparkVotEDU text.png (text only), SparkVotEDU text Vertical.png (vertical text)
- Brand colors from logo: sky blue (spark rays), amber/gold (checkmark), black (VotEDU text)
- Use horizontal lockup with tagline on landing page, icon-only in dashboard/favicon contexts
- Visual refresh (not subtle refinements) for teacher dashboard -- rethink card styles, add visual hierarchy, upgrade typography, modernize feel while keeping same structure
- Priority teacher pages: main dashboard/home, bracket/poll creation wizards, live dashboard
- Dark mode toggle with system preference detection
- Skeleton screens for loading states (not spinners)
- Clean & focused student voting interface -- minimal distractions, clear choices, smooth transitions, prioritize clarity over excitement
- Design for both mobile and desktop equally -- responsive from the start for student pages
- Enhanced celebration/winner screens -- more impactful animations, more dramatic reveals
- Existing presentation mode (F key) is sufficient for projector use
- Teachers primarily on laptop/desktop -- optimize teacher dashboard for larger screens
- Students on both phones and laptops equally -- truly responsive student pages
- Use the `frontend-design` skill for component/page implementation to ensure high design quality
- All plans should leverage the frontend-design skill for distinctive, production-grade interfaces

### Claude's Discretion
- Landing page section order and specific copy beyond the motto
- Sidebar navigation redesign scope
- Dashboard card information density
- Color palette construction from logo brand colors
- Mobile bracket diagram approach (simplified vs full)
- Mobile navigation pattern (hamburger vs bottom nav)
- Join flow improvements (keep flow and polish, or simplify)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Image optimization, metadata API | Already in use |
| Tailwind CSS | v4 | Utility-first CSS with OKLCH colors, CSS-first config | Already in use with `@theme` block |
| shadcn/ui | latest | Component library (Button, Card, Input, Badge, Dialog, etc.) | Already in use, 8 components installed |
| motion/react | 12.29.2 | Animation library for celebrations, transitions | Already in use for celebrations |
| canvas-confetti | 1.9.4 | Confetti effects for celebration screens | Already in use |
| lucide-react | 0.563.0 | Icon library | Already in use across all pages |
| clsx + tailwind-merge | latest | Utility for conditional class merging | Already in use via `cn()` |

### New Dependencies Required
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-themes | ^1.0 | Dark/light/system theme switching, no-flash SSR | Theme toggle + system preference detection |

### Components to Add from shadcn/ui
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| Skeleton | Loading placeholder with pulse animation | Replace all `animate-pulse` loading states |

**Installation:**
```bash
npm install next-themes
npx shadcn@latest add skeleton
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-themes | Manual CSS + localStorage | next-themes handles SSR, system preference, no-flash automatically |
| shadcn Skeleton | Custom `animate-pulse` divs | Already partially in use, but Skeleton component provides consistent API |

## Architecture Patterns

### Current Project Structure (Relevant to Phase 10)
```
src/
├── app/
│   ├── page.tsx                          # Landing page (REWRITE)
│   ├── layout.tsx                        # Root layout (ADD ThemeProvider)
│   ├── globals.css                       # Theme variables (EXTEND with brand colors)
│   ├── (auth)/layout.tsx                 # Auth layout (POLISH)
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Dashboard layout (REDESIGN sidebar/header)
│   │   ├── dashboard/page.tsx            # Home dashboard (POLISH)
│   │   ├── brackets/new/page.tsx         # Bracket wizard (POLISH)
│   │   └── brackets/[id]/live/page.tsx   # Live dashboard (POLISH)
│   └── (student)/
│       ├── layout.tsx                    # Student layout (POLISH)
│       ├── join/page.tsx                 # Join flow (POLISH)
│       └── session/[id]/layout.tsx       # Session layout (POLISH)
├── components/
│   ├── ui/                               # shadcn primitives (ADD Skeleton)
│   ├── dashboard/                        # 2 components: shell.tsx, sidebar-nav.tsx
│   ├── student/                          # 13 components
│   ├── teacher/                          # 9 components
│   ├── bracket/                          # 26 components
│   ├── poll/                             # 13 components
│   ├── billing/                          # 4 components (PricingCards reused)
│   └── analytics/                        # 4 components
├── public/                               # favicon.ico, SVGs (ADD optimized logo assets)
└── logoassets/                           # Source logo PNGs (5 variants)
```

### Pattern 1: Brand Color System via Tailwind CSS Variables
**What:** Extend the existing CSS custom property system in `globals.css` to include brand colors derived from the logo
**When to use:** Every component that needs branded colors (sky blue, amber/gold)

The project already uses the Tailwind CSS v4 `@theme` block + `:root` CSS variables pattern. Brand colors should be added alongside existing semantic colors, not replacing them.

```css
/* globals.css - additions to existing :root block */
:root {
  /* Existing semantic colors remain unchanged */
  /* Brand colors derived from logo */
  --brand-blue: oklch(0.68 0.15 230);        /* Sky blue ~#4BB8E8 */
  --brand-blue-light: oklch(0.92 0.05 230);  /* Light sky blue for backgrounds */
  --brand-blue-dark: oklch(0.55 0.15 230);   /* Darker blue for hover states */
  --brand-amber: oklch(0.75 0.17 75);        /* Amber/gold ~#F5A623 */
  --brand-amber-light: oklch(0.92 0.06 75);  /* Light amber for backgrounds */
  --brand-amber-dark: oklch(0.65 0.17 75);   /* Darker amber for hover states */
}

/* @theme block additions */
@theme inline {
  --color-brand-blue: var(--brand-blue);
  --color-brand-blue-light: var(--brand-blue-light);
  --color-brand-blue-dark: var(--brand-blue-dark);
  --color-brand-amber: var(--brand-amber);
  --color-brand-amber-light: var(--brand-amber-light);
  --color-brand-amber-dark: var(--brand-amber-dark);
}
```

This enables `bg-brand-blue`, `text-brand-amber`, etc. throughout the application.

### Pattern 2: Dark Mode Infrastructure with next-themes
**What:** ThemeProvider wrapper + theme toggle component + updated CSS variables
**When to use:** Global setup, affects entire application

```typescript
// components/theme-provider.tsx
"use client"
import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

```typescript
// app/layout.tsx (modified)
import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Critical:** The existing `globals.css` already has `@custom-variant dark (&:is(.dark *));` and a complete `.dark` block with dark-mode CSS variables. This means the dark mode CSS is already authored -- it just needs activation via `next-themes`.

**Fix needed:** The current dark variant `(&:is(.dark *))` should be updated to `(&:where(.dark, .dark *))` so it also targets the `.dark` element itself (not just children), and uses `:where()` for zero-specificity which is the recommended Tailwind v4 pattern.

### Pattern 3: Logo Asset Optimization for Next.js
**What:** Copy optimized logo variants to `/public/` for use with `<Image>` and metadata API
**When to use:** Landing page hero, dashboard header, favicon, og:image

```
public/
├── logo-icon.png         # From Logo 1.png (for favicon, dashboard header)
├── logo-horizontal.png   # From SparkVotEDU Horizontal...png (for landing hero)
├── logo-text.png          # From SparkVotEDU text.png (for nav)
├── favicon.ico            # Generated from Logo 1.png
├── icon.png               # 192x192 from Logo 1.png (app icon)
└── apple-icon.png         # 180x180 from Logo 1.png (Apple touch icon)
```

Next.js App Router auto-detects `icon.png`, `apple-icon.png`, and `favicon.ico` in the `/app` directory and generates appropriate metadata tags.

### Pattern 4: Skeleton Loading States
**What:** Replace existing `animate-pulse` loading placeholders with proper shadcn Skeleton components
**When to use:** All loading/suspense states across the application

```typescript
// Before (current pattern)
<div className="h-24 animate-pulse rounded-xl border bg-muted" />

// After (skeleton pattern)
import { Skeleton } from "@/components/ui/skeleton"
<Skeleton className="h-24 w-full rounded-xl" />
```

Currently 23 files use `animate-pulse` for loading states. These should be systematically replaced.

### Pattern 5: Landing Page Section Architecture
**What:** Full-width sections with alternating backgrounds, responsive containers
**When to use:** Marketing landing page only

Recommended section order for edu-tech SaaS (Claude's discretion area):
1. **Hero** -- Logo + motto + class code input + Sign In CTA
2. **How It Works** -- 3-step process (Create > Launch > Engage)
3. **Feature Showcase** -- Icon-driven feature cards (brackets, polls, analytics, etc.)
4. **Social Proof / Trust** -- "Built for classrooms" messaging (no testimonials yet, so trust signals)
5. **Pricing** -- Reused PricingCards component
6. **Final CTA** -- Class code input repeat + teacher sign-up

Each section uses full-width backgrounds with centered `max-w-6xl` content containers.

### Anti-Patterns to Avoid
- **Overriding shadcn CSS variables without dark mode pairs:** Every `:root` color addition needs a `.dark` counterpart
- **Using hardcoded colors instead of CSS variables:** All brand colors must flow through the variable system for dark mode compatibility
- **Loading images from `/logoassets/` directly:** PNGs in project root are not served by Next.js -- must be copied to `/public/` and referenced from there
- **Adding `dark:` classes to components without testing both modes:** All new dark: classes need visual verification in both themes
- **Building mobile navigation without testing touch targets:** Touch targets must be minimum 44x44px per WCAG guidelines

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme switching | Custom localStorage + useEffect | `next-themes` ThemeProvider | Handles SSR hydration, system pref, no-flash, localStorage automatically |
| Skeleton loading | More `animate-pulse` divs | shadcn `Skeleton` component | Consistent API, proper pulse animation, semantic markup |
| Image optimization | Manual resize/compress PNGs | Next.js `<Image>` component | Auto WebP/AVIF conversion, responsive sizing, lazy loading |
| Favicon generation | Manual ICO creation | Next.js metadata file convention | Auto-detected `icon.png` in `/app` directory generates all sizes |
| Dark mode CSS variables | Manual class toggling | Tailwind `dark:` variant + CSS custom properties | Already set up in globals.css, just needs activation |
| Color palette generation | Manual hex-to-oklch conversion | Online OKLCH tools or Tailwind CSS v4 palette generators | Perceptually uniform lightness scale in OKLCH |

**Key insight:** The existing codebase already has 90% of the dark mode infrastructure built (`.dark` CSS block, `dark:` classes on 36 files). The only missing piece is the runtime toggle mechanism (`next-themes`).

## Common Pitfalls

### Pitfall 1: Dark Mode Flash of Unstyled Content (FOUC)
**What goes wrong:** Page briefly flashes in light mode before dark mode loads from localStorage
**Why it happens:** Server renders light theme HTML, client applies dark theme after hydration
**How to avoid:** Use `next-themes` with `suppressHydrationWarning` on `<html>` tag and `disableTransitionOnChange` prop. next-themes injects a blocking `<script>` that applies the theme before paint.
**Warning signs:** Brief white flash when loading pages in dark mode

### Pitfall 2: Logo Assets Not Optimized for Dark Mode
**What goes wrong:** Sky blue logo disappears or looks washed out on dark backgrounds
**Why it happens:** Logo designed for white backgrounds; dark mode inverts the context
**How to avoid:** Test logo on both white and dark backgrounds. May need a light-text version or a container with guaranteed light background for the logo. The "Logo Icon.png" (with rounded border) provides its own background context and works on any color.
**Warning signs:** Logo becomes invisible or low-contrast in dark mode

### Pitfall 3: Responsive Bracket Diagram on Mobile
**What goes wrong:** Tournament bracket diagram is too wide/complex for phone screens
**Why it happens:** Bracket diagrams are inherently wide (power-of-2 tree structure). The existing `BracketZoomWrapper` uses pan-zoom but may not be discoverable on mobile.
**How to avoid:** Research options: (a) simplified list view that shows matchups without tree visualization, (b) pinch-zoom with mini-map (existing `bracket-mini-map.tsx`), (c) horizontal scroll with visual indicator. Claude's discretion area.
**Warning signs:** Bracket diagram requires excessive scrolling or becomes unreadable on <375px screens

### Pitfall 4: PricingCards Component Context Mismatch
**What goes wrong:** PricingCards component references server actions (`createCheckoutSession`) and price IDs that require specific props
**Why it happens:** The landing page is public (no auth), but PricingCards has both public and authenticated modes
**How to avoid:** PricingCards already handles this -- when `currentTier` is undefined, it shows "Get Started" links to `/signup`. Just render `<PricingCards />` with no props for public mode.
**Warning signs:** Build errors about missing priceIds

### Pitfall 5: CSS Variable Scope in Tailwind v4
**What goes wrong:** Custom brand colors work in `:root` but not in `.dark`
**Why it happens:** Brand color variables need explicit dark-mode overrides in the `.dark` block
**How to avoid:** For every `--brand-*` variable in `:root`, add a dark-mode equivalent in `.dark`. Brand blue may stay the same; brand amber may need slight lightness adjustment for dark backgrounds.
**Warning signs:** Brand-colored elements look wrong or have poor contrast in dark mode

### Pitfall 6: Skeleton Screen Layout Shift
**What goes wrong:** Content jumps when skeleton is replaced by real content
**Why it happens:** Skeleton dimensions don't match the loaded content dimensions
**How to avoid:** Use the same layout structure (grid columns, heights) for skeletons as for the loaded content. The shadcn Skeleton component preserves its space -- just match widths/heights.
**Warning signs:** Content shifts visually when data loads

### Pitfall 7: Landing Page SEO and Metadata
**What goes wrong:** Landing page lacks proper Open Graph meta, title, description for sharing
**Why it happens:** Current root `layout.tsx` has minimal metadata; `page.tsx` has none
**How to avoid:** Use Next.js metadata API to set proper `title`, `description`, `openGraph`, `twitter` cards with the logo image as og:image
**Warning signs:** Social media shares show generic/missing preview cards

## Code Examples

### Example 1: Theme Toggle Component
```typescript
// components/theme-toggle.tsx
"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```
Source: shadcn/ui dark mode documentation

### Example 2: Landing Page Section Component Pattern
```typescript
// components/landing/feature-section.tsx
interface Feature {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureSection({ features }: { features: Feature[] }) {
  return (
    <section className="bg-brand-blue-light py-20 dark:bg-brand-blue/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          How It Works
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue text-white">
                {feature.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

### Example 3: Skeleton Dashboard Card
```typescript
// components/dashboard/dashboard-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>

      {/* Sessions skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
```

## Codebase Audit Summary

### Current State Assessment

**Landing Page (`src/app/page.tsx`):**
- 42 lines, minimal: just "SparkVotEDU" text, motto, class code input, teacher sign-in buttons
- No logo image, no feature sections, no pricing, no visual design
- Already has `HomeJoinInput` component that works well (routes to `/join/{code}`)

**Dashboard Layout (`src/app/(dashboard)/layout.tsx`):**
- 25 lines, basic: text-only header, 56px sidebar, no logo, no theme toggle
- Sidebar hidden on mobile (`hidden md:block`) with no mobile navigation alternative
- SidebarNav has 4 top-level items + Activities section with sub-items

**Dashboard Shell (`src/components/dashboard/shell.tsx`):**
- Functional but plain: simple text greeting, basic card grid
- Uses semantic colors (bg-card, text-muted-foreground) which will work with dark mode
- Cards use `border bg-card` pattern -- room for visual elevation

**Student Layout (`src/app/(student)/layout.tsx`):**
- 18 lines, minimal: just "SparkVotEDU" text at top
- No logo, minimal branding

**Student Session Layout (`src/app/(student)/session/[sessionId]/layout.tsx`):**
- 71 lines, handles localStorage identity + SessionHeader
- Loading state is plain text "Loading..." -- needs skeleton
- Redirect state is plain text "Redirecting..." -- needs skeleton

**Celebration Screens:**
- `CelebrationScreen`: Working confetti + spring animations, uses yellow-400 accent
- `WinnerReveal`: Dramatic countdown 3-2-1, spring physics
- `PodiumCelebration`: Top-3 podium for predictive brackets
- All use `motion/react` + `canvas-confetti`, respect `prefers-reduced-motion`
- Enhancement opportunity: brand colors, more dramatic timing, screen shake

**Auth Pages:**
- Clean Card-based layout, minimal branding
- Currently show "SparkVotEDU" as plain text -- should use logo

**Existing dark mode support:**
- `globals.css` has complete `.dark` block with all semantic color overrides
- 36 files already use `dark:` classes (146 total occurrences)
- No runtime toggle mechanism -- just CSS that activates when `.dark` class is on `<html>`

**Responsive Status:**
- Dashboard sidebar: `hidden md:block` -- no mobile nav
- Student pages: `max-w-5xl` container, responsive grids
- Activity grid: `sm:grid-cols-2 lg:grid-cols-3`
- Bracket diagram: uses `BracketZoomWrapper` with pan-zoom, has mini-map
- No bottom navigation or hamburger menu exists

### Component Inventory for Polish

**Teacher Dashboard (priority pages):**
| Component | File | Lines | Polish Scope |
|-----------|------|-------|--------------|
| DashboardShell | components/dashboard/shell.tsx | 134 | Visual refresh: card redesign, hierarchy, typography |
| SidebarNav | components/dashboard/sidebar-nav.tsx | 118 | Redesign scope (Claude discretion) |
| BracketForm | components/bracket/bracket-form.tsx | 400+ | Wizard UI polish |
| LiveDashboard | components/teacher/live-dashboard.tsx | 600+ | Visual refresh of controls, layout |
| PollWizard | components/poll/poll-wizard.tsx | ~300 | Wizard UI polish |
| BracketCard | components/bracket/bracket-card.tsx | 344 | Card redesign |
| PollCard | components/poll/poll-card.tsx | ~200 | Card redesign |

**Student Experience (all pages):**
| Component | File | Lines | Polish Scope |
|-----------|------|-------|--------------|
| JoinForm | components/student/join-form.tsx | ~80 | Flow polish |
| HomeJoinInput | components/student/home-join-input.tsx | 46 | Reuse on landing page |
| WelcomeScreen | components/student/welcome-screen.tsx | 94 | Animation polish |
| SessionHeader | components/student/session-header.tsx | 84 | Branding polish |
| ActivityCard | components/student/activity-card.tsx | 97 | Visual refresh |
| SimpleVotingView | components/student/simple-voting-view.tsx | 275 | Transition polish |
| AdvancedVotingView | components/student/advanced-voting-view.tsx | ~300 | Transition polish |
| CelebrationScreen | components/bracket/celebration-screen.tsx | 164 | Enhanced animations |
| WinnerReveal | components/bracket/winner-reveal.tsx | 123 | Enhanced reveal |
| PodiumCelebration | components/bracket/podium-celebration.tsx | 240 | Enhanced animations |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` darkMode: "class" | `@custom-variant dark` in CSS | Tailwind v4 (Jan 2025) | Dark mode config is CSS-only |
| RGB/HSL color system | OKLCH color system | Tailwind v4 (Jan 2025) | Perceptually uniform, wider gamut |
| Manual theme localStorage | `next-themes` library | Stable for 3+ years | Standard for Next.js theme management |
| Spinner loading states | Skeleton screens | Industry shift ~2022-2024 | Better perceived performance, less jarring |
| `@variant` directive | `@custom-variant` directive | Tailwind v4 (Jan 2025) | Changed name from beta to stable |

**Deprecated/outdated:**
- `tailwind.config.js` `darkMode` property: Replaced by `@custom-variant` in Tailwind v4
- `@variant` directive: Renamed to `@custom-variant` in Tailwind v4 stable

## Discretion Area Recommendations

### Landing Page Section Order (Claude's Discretion)
**Recommendation:** Hero > How It Works (3-step) > Features (icon grid) > Social Proof Strip > Pricing > Final CTA
**Rationale:** Standard edu-tech SaaS pattern. Hero captures attention and provides both entry points (student code input + teacher sign-in). "How It Works" reduces cognitive load before features. Pricing near bottom for visitors who've scrolled = higher intent. Final CTA repeats the class code input for students who scrolled past it.

### Sidebar Navigation (Claude's Discretion)
**Recommendation:** Moderate redesign -- upgrade visual treatment (add logo, brand colors, better active states, collapsible on desktop) but keep same information architecture (Dashboard, Sessions, Activities > Brackets/Polls, Analytics, Billing)
**Rationale:** The existing IA is sound and matches the app's actual feature set. The visual treatment is what needs work, not the structure.

### Dashboard Card Information Density (Claude's Discretion)
**Recommendation:** Medium density -- add subtle visual elements (status indicators, mini-charts, progress bars) while keeping the clean card structure. Add gradient accents using brand colors for visual interest.
**Rationale:** Teachers need quick scans. Current cards are too sparse; overloading them would slow scanning.

### Color Palette (Claude's Discretion)
**Recommendation:** Build a 5-shade scale for both brand-blue and brand-amber in OKLCH:
- brand-blue: 50 (near-white), 100 (light bg), 500 (primary), 600 (hover), 900 (dark text)
- brand-amber: 50, 100, 500, 600, 900
- Keep existing shadcn semantic colors (primary, secondary, accent, muted) for UI chrome
- Use brand colors for marketing/branding contexts (landing page, logo areas, accent highlights)
**Rationale:** Separating brand colors from semantic UI colors prevents conflicts and maintains shadcn compatibility.

### Mobile Bracket Diagram (Claude's Discretion)
**Recommendation:** Keep existing pinch-zoom with mini-map for students who want the full view, but add a simplified "matchup list" view as the default mobile view with a toggle to switch
**Rationale:** The bracket-mini-map.tsx already exists. A list view is more mobile-friendly for voting. Power users can toggle to the full diagram.

### Mobile Navigation Pattern (Claude's Discretion)
**Recommendation:** Bottom navigation bar for student mobile (4 tabs max), hamburger menu for teacher mobile dashboard
**Rationale:** Students interact briefly with clear intent (join, vote, see results) -- bottom nav is faster. Teachers do complex tasks that suit a full sidebar exposed via hamburger.

### Join Flow Improvements (Claude's Discretion)
**Recommendation:** Keep current flow structure but polish: add logo, improve welcome animation, add branded loading states, ensure the 6-digit code input is the dominant UI element
**Rationale:** Current flow is already simple (enter code > get name > enter session). Adding steps would increase friction for students. Polish the existing steps.

## Open Questions

1. **Logo format for dark mode**
   - What we know: Logo has white background in horizontal lockup, transparent in icon-only
   - What's unclear: Whether we need alternate logo versions for dark backgrounds or can use CSS inversion/container approach
   - Recommendation: Use icon-only (Logo 1.png) on dark backgrounds since it has transparent background. Use horizontal lockup only on guaranteed-light sections (landing hero with white bg).

2. **`frontend-design` skill**
   - What we know: User explicitly decided all plans should use this skill for implementation
   - What's unclear: This skill doesn't currently exist as a file in `.claude/skills/`
   - Recommendation: Planner should include `frontend-design` skill invocation instructions in each plan. If the skill needs to be created first, that should be plan 10-01.

3. **Mobile breakpoint for teacher sidebar**
   - What we know: Current sidebar uses `hidden md:block` (768px threshold)
   - What's unclear: Whether md is the right breakpoint or if tablet-landscape (1024px) should trigger the sidebar
   - Recommendation: Keep md (768px) as the sidebar breakpoint since teachers are primarily desktop/laptop. Add hamburger menu for <768px.

## Sources

### Primary (HIGH confidence)
- Codebase audit: Direct inspection of 40+ files in the project
- Tailwind CSS v4 documentation (tailwindcss.com/docs/dark-mode) - dark mode variant configuration
- shadcn/ui documentation (ui.shadcn.com/docs/dark-mode/next) - next-themes setup guide
- Next.js documentation (nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons) - favicon/icon conventions

### Secondary (MEDIUM confidence)
- [next-themes GitHub](https://github.com/pacocoursey/next-themes) - SSR behavior, attribute configuration
- [Tailwind v4 dark mode with next-themes](https://www.thingsaboutweb.dev/en/posts/dark-mode-with-tailwind-v4-nextjs) - @custom-variant configuration
- [SaaS landing page best practices](https://www.involve.me/blog/landing-page-structure) - section ordering
- [SaaS hero section design](https://www.alfdesigngroup.com/post/saas-hero-section-best-practices) - hero section patterns
- [Next.js favicon guide](https://www.braydoncoyer.dev/blog/the-only-nextjs-favicon-guide-youll-need) - favicon best practices
- [Tailwind v4 custom colors](https://tailkits.com/blog/tailwind-v4-custom-colors/) - @theme color configuration

### Tertiary (LOW confidence)
- Landing page copy specifics - Based on edu-tech patterns, needs user validation
- Celebration screen enhancement specifics - Based on motion/react capabilities, needs design iteration

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use except next-themes (well-documented, verified)
- Architecture: HIGH - Patterns derived directly from existing codebase inspection
- Pitfalls: HIGH - Dark mode pitfalls verified against codebase state, responsive issues observed directly
- Color palette: MEDIUM - OKLCH values are approximate, need fine-tuning against actual logo colors
- Landing page design: MEDIUM - Section order based on general SaaS best practices, not edu-tech-specific research

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable domain, 30 days)
