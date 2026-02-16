# Phase 10: Landing Page & Polish - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Public-facing landing page with SparkVotEDU branding, plus a visual refresh of the teacher dashboard and student experience, plus responsive design audit across all device sizes. No new features or capabilities — this is design quality, consistency, and first-impression polish.

</domain>

<decisions>
## Implementation Decisions

### Landing Page Design
- Full-width centered hero with "Ignite Student Voice Through Voting" motto as headline
- Minimal navigation: logo + Sign In button only (no multi-link nav bar)
- Focus messaging on how bracketing and polling spark student engagement in the classroom
- Icon-driven feature showcase sections (icons + short descriptions, not screenshots)
- Reuse existing PricingCards component from /billing for pricing section
- Include a student class code input on the landing page so students can jump right in
- Section order: Claude's discretion (optimize for edu-tech landing page best practices)
- Visual tone driven by logo: sky blue (#4BB8E8-range) spark rays, amber/gold (#F5A623-range) checkmark accents, clean white backgrounds

### Logo Assets
- Located at `/logoassets/` in project root
- Available variants: Logo 1.png (icon only), Logo Icon.png (icon with rounded border), SparkVotEDU Horizontal with tagline and logo.png (full horizontal lockup), SparkVotEDU text.png (text only), SparkVotEDU text Vertical.png (vertical text)
- Brand colors from logo: sky blue (spark rays), amber/gold (checkmark), black (VotEDU text)
- Use horizontal lockup with tagline on landing page, icon-only in dashboard/favicon contexts

### Teacher Dashboard Polish
- Visual refresh, not subtle refinements — rethink card styles, add visual hierarchy, upgrade typography, modernize feel while keeping same structure
- Priority pages: main dashboard/home, bracket/poll creation wizards, live dashboard
- Dark mode toggle with system preference detection
- Skeleton screens for loading states (not spinners)
- Sidebar navigation: Claude's discretion on redesign vs cleanup
- Color scheme: Claude builds cohesive palette from logo colors
- Card information density: Claude's discretion (balance richness with cleanliness)

### Student Experience Polish
- Clean & focused voting interface — minimal distractions, clear choices, smooth transitions, prioritize clarity over excitement
- Join flow: Claude audits current flow and improves where needed
- Design for both mobile and desktop equally — responsive from the start
- Enhanced celebration/winner screens — more impactful animations, more dramatic reveals
- Existing presentation mode (F key) is sufficient for projector use

### Responsive Breakpoints
- Teachers primarily on laptop/desktop — optimize teacher dashboard for larger screens
- Students on both phones and laptops equally — truly responsive student pages
- Mobile bracket diagram approach: Claude's discretion (simplified list view vs pinch-zoom)
- Mobile navigation pattern: Claude's discretion (hamburger vs bottom nav)

### Implementation Approach
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

</decisions>

<specifics>
## Specific Ideas

- Logo should drive the entire visual language — sky blue and amber/gold are the primary brand colors
- The spark-burst checkmark icon conveys both "voting" (checkmark) and "energy/engagement" (radiating lines) — this duality should inform the design language
- Landing page hero focuses on how brackets and polls spark student engagement, not just "voting tool"
- Student class code input on landing page provides a second entry point alongside teacher sign-up
- Celebration screens should be enhanced — the classroom moment when a winner is revealed should feel exciting

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-landing-page-and-polish*
*Context gathered: 2026-02-15*
