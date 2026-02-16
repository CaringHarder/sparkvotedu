# Phase 2: Student Join Flow - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Students can join a class session anonymously via code, receive a fun name, and be recognized on return. This phase delivers the join page, fun name assignment, device fingerprinting for return recognition, and the student session view showing active brackets/polls. Voting mechanics, bracket rendering, and poll participation are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Join Page Experience
- Homepage has a prominent "Join" button/field front and center — this is the primary entry point
- Teachers can also display a QR code or share a direct URL with code pre-filled (e.g., `/join?code=847291`)
- QR code visibility is a toggleable setting at both class level and individual bracket/poll level
- Class codes are 6-digit numeric (Kahoot-style) — easy to read aloud and type on any device
- Two levels of codes: class code (joins class session, sees all active items) and item code (goes directly to a specific bracket/poll)
- Join page is minimal + branded: logo at top, tagline, code field as the hero — nothing distracting
- On valid code entry: brief welcome screen ("Welcome, Daring Dragon! You're joining Mrs. Smith's class") that auto-redirects after a few seconds with "Loading page..." indicator
- Error handling for invalid/expired codes: Claude's discretion on best UX pattern

### Fun Name System
- Alliterative style names (e.g., "Daring Dragon", "Mighty Moose", "Speedy Squirrel")
- Names are unique within a class session — no two students share a name in the same class
- Students get one reroll — can tap "New name" once to get a different fun name
- Fun names only — no real name input, teacher sees fun names only, voting is truly anonymous
- No teacher-to-student identity mapping

### Device Recognition
- Returning students see a confirmation: "Welcome back, Daring Dragon! Rejoin this session?" with a confirm button
- Device fingerprinting uses browser storage (localStorage/cookies) combined with canvas/WebGL fingerprinting
- Students can recover their identity on a new device via a personal recovery code, accessible in settings within the session
- Sessions last until the teacher ends them — teacher controls the lifecycle
- Teachers can end or archive a session; students are disconnected, archived sessions preserve data, new session gets a fresh code

### Teacher Moderation
- Teacher sees "12 of 28 connected" — active count vs. total who've ever joined
- Teacher can remove a student and optionally ban the device from rejoining

### Student Session View
- If only one activity is active: student is taken directly to it (auto-focus)
- If multiple activities are active: card grid layout with activity name, type icon, and participant count
- Empty state: branded holding page with SparkVotEDU branding + "Hang tight! Your teacher is setting things up" with spark motif
- When teacher activates a new item: auto-navigate if it's the only active item; real-time grid update if multiple items active
- Minimal header showing fun name only — clean and unobtrusive
- Students only see active items — completed items disappear from their view
- When a bracket/poll is closed by teacher: student stays on the results page until they manually navigate back
- Cards show a checkmark/"Voted" badge for items the student has already participated in
- Responsive design — equal priority for mobile (phones/tablets) and desktop (laptops/Chromebooks)

### Claude's Discretion
- Error UX for invalid/expired codes
- Exact fingerprinting composite signal strategy (researcher will investigate school hardware scenarios)
- Loading skeleton and transition animations
- Exact card styling and grid responsiveness
- Recovery code format and presentation in settings

</decisions>

<specifics>
## Specific Ideas

- Kahoot-style 6-digit numeric codes — familiar to teachers and students
- Alliterative fun names for classroom appeal ("Daring Dragon", "Mighty Moose")
- Welcome screen with auto-redirect mirrors a "loading into game" feel
- QR codes toggleable per-class or per-item — teacher projects what they need
- Two code levels (class vs. item) gives teachers flexibility for different classroom scenarios

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-student-join-flow*
*Context gathered: 2026-01-29*
