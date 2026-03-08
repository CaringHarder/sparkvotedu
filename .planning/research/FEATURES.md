# Feature Research: Student Join Flow Overhaul

**Domain:** Classroom voting app -- student identity, join flow, session persistence
**Researched:** 2026-03-08
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Instant join via class code | Every competitor (Kahoot, Mentimeter, Poll Everywhere) uses code-to-join. Students expect zero friction. | LOW | **Already built.** 6-digit code entry exists at `/join`. No changes needed to this step. |
| Auto-assigned fun name on join | Students expect immediate identity without choosing a username. Current flow already does this. | LOW | **Already built.** `generateFunName()` creates alliterative "Adjective Animal" names. Must fire immediately after code validation (before wizard), so student sees their fun name throughout the wizard steps. |
| First name entry | Teachers need to know who students are. Students expect to type their real name once. | LOW | **Already built.** `NameEntryForm` collects firstName. Becomes Step 1 of wizard instead of standalone page. |
| Last initial for disambiguation | When two "Emma"s join, the system needs a differentiator. Last initial (max 2 chars) is the natural K-12 pattern. | LOW | **New field.** Add `lastInitial` to `StudentParticipant` schema. Teachers see "Emma S." vs "Emma T." -- standard classroom convention. Max 2 characters handles "Mc", "De", compound initials. |
| Name disambiguation on duplicate | When "Emma S." already exists and another "Emma S." joins, system must handle gracefully. | MEDIUM | **Partially built.** Current `NameDisambiguation` component handles first-name collisions via fun name display. Needs update to match on firstName + lastInitial combo instead of firstName alone. |
| Same-device auto-rejoin | Student refreshes page or returns next class -- should silently land back in session without re-entering code or name. | MEDIUM | **Partially built.** Current `sessionStorage` approach loses identity on tab close (by design, to fix multi-tab bleeding). Must migrate to `localStorage` with multi-session map keyed by sessionId. The v2 sessionStorage approach was a reaction to a multi-tab bug; v3 requirement explicitly asks for persistence across browser restarts. |
| Student self-edit display name | Students who mistype should be able to fix their name without teacher intervention. | LOW | **Already built.** `EditNameDialog` in session header gear menu. Needs update to also allow editing lastInitial. |
| Emoji identity picker | Young students (K-5) need a visual identity element. A 4x4 grid of 16 preselected emojis is the right scope -- not a full emoji keyboard. | MEDIUM | **New.** 16 curated emojis in a grid (animals, faces, objects). Displayed next to fun name in sidebar. Stored as single Unicode codepoint string in DB. No external library needed -- inline a static grid of hardcoded emoji characters. |
| Fun name reroll (one-time) | Students who dislike their assigned name can change it once. Prevents endless rerolling. | LOW | **Already built.** `RerollButton` with `rerollUsed` boolean flag. No changes needed. |
| Welcome screen with identity reveal | After joining, students see their fun name with brief animation before entering session. Builds excitement. | LOW | **Already built.** `WelcomeScreen` component with motion animations and 3-second countdown. Needs update to also display chosen emoji. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 3-step join wizard | Guided experience reduces confusion for young students. Step 1: first name. Step 2: last initial (max 2 chars). Step 3: emoji picker (4x4 grid). Progress dots show position. Competitors dump everything on one screen or skip identity entirely. | MEDIUM | Replace current `NameEntryForm` single-input page with a stepped component. Each step has its own validation and large touch targets. Progress indicator (3 dots) at top. Back button on steps 2-3. Auto-advance on step 2 when 2 chars entered (natural completion). Step 3 is a tap-to-select grid with "Skip" option. |
| Cross-device identity reclaim | Student switches from Chromebook to iPad mid-class. Types name + initial, system matches existing participant, shows fun names + emojis for visual confirmation. No recovery codes needed for the common case. | MEDIUM | **Partially built.** Current disambiguation flow already does name-based matching and shows fun names. Needs refinement: match on firstName + lastInitial combo, show emoji alongside fun name for visual confirmation during claim. The `claimIdentity` server action already handles the server-side logic. Recovery codes remain as a fallback but are no longer the primary cross-device mechanism. |
| Teacher sidebar name view toggle | Teacher can switch between fun name view ("Daring Dragon") and real name view ("Emma S.") globally. Per-session override available. Competitors show one or the other, not both. | MEDIUM | Current `ParticipationSidebar` shows funName as primary with firstName as tiny subtitle. New: toggle button in sidebar header swaps primary/secondary display. Global preference stored in teacher settings (new field on Teacher model), per-session override stored in component state (not persisted -- resets on page load, which is fine). |
| Multi-session localStorage map | Remember ALL sessions a student has joined, not just the last one. When student visits `/join` and enters a code they have used before, skip the wizard entirely and auto-rejoin silently. | MEDIUM | Current implementation stores `sparkvotedu_last_session_code` in localStorage (just the code) and identity in sessionStorage (lost on tab close). New: localStorage map `sparkvotedu_sessions` = `{ [sessionId]: { participantId, firstName, lastInitial, funName, emoji } }`. On code entry, resolve sessionId from code, check if sessionId exists in map. If yes, call `claimIdentity` silently and skip wizard. |
| Existing participant emoji migration | Students who joined before v3 get fun names auto-assigned (already done) but need emoji prompt on next rejoin. Smooth upgrade path, not a forced migration. | LOW | On rejoin, if participant record has no emoji in DB, show emoji picker step only (skip name entry steps). One-time migration experience. If student skips, they have no emoji -- fine, it is nullable. |
| Teacher-initiated display name edit | Teacher can correct a student's displayed name from the sidebar without the student doing anything. Useful when student enters "asdfgh" as their name. | LOW | Add edit action to teacher sidebar tile context menu. Calls same `updateParticipantName` action but needs no auth check since teacher actions are already gated by session ownership. |
| Emoji display in voting UI | Student's chosen emoji appears next to their fun name in vote confirmations, bracket predictions, poll results. Visual identity carried through the entire experience. | LOW | Render emoji character before funName in all student-facing components. Small per-component change but touches many files: `SessionHeader`, `ParticipationSidebar`, `WelcomeScreen`, `PollResults`, bracket components. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full emoji keyboard picker | "Let students pick any emoji!" | Full picker libraries are 80KB+ (emoji-mart, emoji-picker-react). Overwhelming for K-5 students with thousands of options. Opens door to inappropriate emoji use (eggplant, middle finger on newer Unicode). Accessibility nightmare for screen readers. Overkill for a visual identifier. | Curated 4x4 grid of 16 pre-approved emojis. Inline Unicode characters, zero library dependency, impossible to misuse, accessible via aria-labels, renders in under 1ms. |
| Account-based student identity | "Students should log in so we always know who they are" | K-12 students under 13 require COPPA compliance, parent consent, password management. Adds massive friction to a flow that must complete in under 10 seconds. Kills the "code and go" UX that matches Kahoot/Mentimeter. | Name + initial + fun name + emoji provides sufficient identity. localStorage persistence handles same-device return. Cross-device reclaim via name matching handles the rest. No accounts, no passwords, no COPPA burden. |
| FingerprintJS or browser fingerprinting | "Silently identify returning students without any input" | Privacy concerns in K-12 context. COPPA gray area for unique identifiers. Unreliable on managed Chromebooks where all devices have identical fingerprints. Adds 30KB+ dependency. Already proven unreliable in v2 -- the fingerprint fallback path was rarely triggered successfully. | Remove FingerprintJS entirely (explicit v3 goal). Replace with name-based identity + localStorage persistence. Simpler, more reliable, more private, smaller bundle. |
| Persistent student profiles across sessions | "Remember students across all of a teacher's sessions forever" | Creates a de facto account system without the UX of one. Students are anonymous per-session by design. Cross-session tracking raises FERPA/privacy concerns in education context. Teachers who want persistent rosters should use an LMS. | Per-session identity via localStorage map. Each session entry is independent. Student provides name + initial once per session, auto-rejoins on same device thereafter. Teacher sees the same student with the same name across sessions because humans reuse their own name. |
| Real-time sync of localStorage across devices | "Auto-sync identity between Chromebook and iPad without student doing anything" | Requires a sync server or service worker with push capability. Adds latency, creates conflict resolution problems (which device is authoritative?), increases infrastructure cost. Solves a rare case (mid-class device switch) with heavyweight infrastructure. | Manual cross-device reclaim: type name + initial, pick your fun name from the list. Takes 5 seconds. Simple, reliable, zero infrastructure. |
| Customizable fun name (student picks free text) | "Let students choose their own fun name" | Inappropriate names, moderation burden on teacher, name collisions with other students' fun names, loses the charm and fairness of random assignment. | Auto-assigned alliterative fun names with one-time reroll. Students get randomness plus one chance to change. Already built and working well. |
| Multi-tab identity sharing via BroadcastChannel | "If I join in one tab, other tabs should know" | Adds complexity for a scenario that barely exists in K-12 (students do not open multiple tabs to the same voting session). BroadcastChannel API has inconsistent support on older browsers/WebViews. | V3 uses localStorage keyed by sessionId. If a student opens two tabs to the same session, both tabs read from the same localStorage entry and share identity naturally. No BroadcastChannel needed -- localStorage is already tab-shared. |

## Feature Dependencies

```
[Class Code Entry] (already built, no changes)
    |
    v
[Fun Name Auto-Assignment] (already built, move earlier in flow)
    |
    v
[3-Step Join Wizard] (NEW)
    |-- Step 1: First Name (existing validation, new UI)
    |-- Step 2: Last Initial (NEW -- max 2 chars)
    |-- Step 3: Emoji Picker (NEW -- 4x4 grid)
    |
    v
[Welcome Screen] (update to show emoji)
    |
    v
[Session View] (header shows emoji + fun name + gear icon)

[Schema Migration: lastInitial + emoji columns]
    |
    +-- required by --> [3-Step Join Wizard]
    +-- required by --> [Cross-Device Identity Reclaim]
    +-- required by --> [Teacher Sidebar Name Toggle]
    +-- required by --> [Multi-Session localStorage Map]

[localStorage Multi-Session Map] (NEW)
    |
    +-- enables --> [Same-Device Auto-Rejoin]
    +-- requires --> [Schema migration] (stores emoji + lastInitial locally)

[Cross-Device Identity Reclaim]
    |
    +-- requires --> [Name Disambiguation update] (match on firstName + lastInitial)
    +-- enhanced by --> [Emoji Display] (visual confirmation during claim)
    +-- uses --> [claimIdentity server action] (already built)

[Teacher Sidebar Name Toggle]
    |
    +-- requires --> [Schema migration] (lastInitial for "Emma S." display)
    +-- independent of --> [Student join flow changes]

[Existing Participant Emoji Migration]
    |
    +-- requires --> [Emoji Picker Component]
    +-- requires --> [Schema: emoji field]
    +-- triggered by --> [Same-Device Auto-Rejoin] (detect null emoji)

[FingerprintJS Removal]
    +-- independent of all above
    +-- removes --> [deviceId/fingerprint identity matching in joinSession action]
    +-- removes --> [fingerprint schema column usage]
    +-- removes --> [FingerprintJS dependency from package.json]

[Emoji Display Across UI]
    +-- requires --> [Schema: emoji field]
    +-- independent of join flow (can be done incrementally)
```

### Dependency Notes

- **Schema migration is the critical foundation.** `lastInitial` (varchar 2, nullable) and `emoji` (varchar 4, nullable) on `StudentParticipant` must be added before any feature work. Both nullable so existing participants are unaffected.
- **3-Step Wizard depends on schema migration** to store the new fields. Fun name assignment must move to happen immediately after code validation (before wizard starts) so the fun name appears in the wizard header.
- **Same-Device Auto-Rejoin depends on localStorage migration** from sessionStorage. This is a breaking change for v2 sessions -- students who had sessionStorage identity will need to go through the wizard once on their first v3 visit. This is acceptable.
- **Cross-Device Reclaim is enhanced by lastInitial** in the disambiguation query. Current `findParticipantsByFirstName` matches on firstName alone. Adding lastInitial to the match reduces false positives (two "Emma"s become "Emma S." and "Emma T." -- unique match, no disambiguation needed in most cases).
- **FingerprintJS Removal is fully independent.** The `joinSession` action (device-based flow) can be deleted once `joinSessionByName` is the sole entry point. Schema columns `deviceId` and `fingerprint` are already nullable and can be left in place (no migration needed to remove them -- just stop writing to them).
- **Teacher Sidebar Toggle is independent** of student flow. Can be built in parallel. Only changes how existing data is displayed.

## MVP Definition

### Launch With (v3.0 Core)

Minimum viable set for the join flow overhaul. These define the milestone.

- [ ] **Schema migration** -- Add `lastInitial` (varchar 2, nullable) and `emoji` (varchar 4, nullable) to `StudentParticipant`
- [ ] **3-step join wizard** -- Replace `NameEntryForm` with stepped component (first name -> last initial -> emoji grid)
- [ ] **localStorage multi-session map** -- Replace sessionStorage with localStorage keyed by sessionId
- [ ] **Same-device auto-rejoin** -- Check localStorage on code entry, skip wizard if identity exists for that session
- [ ] **Cross-device reclaim update** -- Update disambiguation to match on firstName + lastInitial combo
- [ ] **Emoji + fun name display in header** -- Show emoji next to fun name in `SessionHeader`
- [ ] **Welcome screen update** -- Show chosen emoji alongside fun name reveal
- [ ] **FingerprintJS removal** -- Delete fingerprint code, remove `joinSession` action, remove FingerprintJS dependency

### Add After Validation (v3.x)

Features to add once core flow is stable and deployed.

- [ ] **Teacher sidebar name view toggle** -- Requires teacher preference storage, orthogonal to student flow
- [ ] **Teacher-initiated name edit** -- Teachers can ask students to self-edit for now
- [ ] **Existing participant emoji migration** -- Only relevant after v3 has been live long enough for v2 students to return
- [ ] **Emoji display across all voting UI** -- Many components to update, do incrementally per activity type
- [ ] **Edit name dialog update** -- Allow editing lastInitial in addition to firstName

### Future Consideration (v3.x+)

Features to defer until join flow is proven in classrooms.

- [ ] **Custom emoji set per teacher** -- Per-teacher emoji palette configuration. Low demand, high complexity.
- [ ] **Student avatar (drawn)** -- Drawing canvas instead of emoji. Fun but significant scope increase.
- [ ] **QR code auto-fill** -- QR code encodes session code, scanned on phone pre-fills the code. Existing QR display exists but does not encode for mobile auto-fill.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Schema migration (lastInitial + emoji) | HIGH | LOW | P1 |
| 3-step join wizard | HIGH | MEDIUM | P1 |
| localStorage multi-session map | HIGH | MEDIUM | P1 |
| Same-device auto-rejoin | HIGH | LOW | P1 |
| Cross-device reclaim update | HIGH | LOW | P1 |
| FingerprintJS removal | MEDIUM | LOW | P1 |
| Emoji + fun name in header | MEDIUM | LOW | P1 |
| Welcome screen emoji update | MEDIUM | LOW | P1 |
| Teacher sidebar name toggle | MEDIUM | MEDIUM | P2 |
| Existing participant emoji migration | MEDIUM | LOW | P2 |
| Teacher-initiated name edit | LOW | LOW | P2 |
| Edit name dialog lastInitial support | LOW | LOW | P2 |
| Emoji display in all voting UI | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v3 launch -- defines the join flow overhaul
- P2: Should have, add in fast follow after core is stable
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Kahoot | Mentimeter | Poll Everywhere | SparkVotEDU v3 |
|---------|--------|------------|-----------------|----------------|
| Join method | Game PIN + nickname | Code, anonymous | Code or link | Code + 3-step wizard (name, initial, emoji) |
| Student identity | Nickname (free text) | Anonymous (no identity) | Optional name | First name + last initial + auto-assigned fun name + emoji |
| Session persistence | None (game is one-shot) | None (poll is one-shot) | Cookie-based (limited) | localStorage multi-session map (persists across restarts) |
| Cross-device return | Re-enter PIN + new nickname | Re-enter code (anonymous) | None | Name + initial matching with visual fun name confirmation |
| Visual identity | Random color avatar | None | None | Chosen emoji + alliterative fun name |
| Teacher name visibility | Nicknames only | Anonymous only | Optional toggle | Toggle between fun name view and real name view |
| Self-edit name | No | N/A (anonymous) | No | Yes, via gear menu in session header |
| Time to join | ~5 seconds (PIN + nickname) | ~3 seconds (code only, anonymous) | ~5 seconds (code + optional name) | ~15 seconds first time (code + 3-step wizard), ~2 seconds returning (auto-rejoin) |

## Edge Cases and Expected Behaviors

### Join Flow Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Student enters code for expired/ended session | Show results view directly if participant exists in localStorage, otherwise show "This session has ended" with join form. Already handled by `sessionEnded` flag in `joinSessionByName`. |
| Student enters code for archived session | Error: "This session is no longer available." Already handled in `/join/[code]/page.tsx`. |
| Two students with identical firstName + lastInitial | Show disambiguation with fun names + emojis. Student picks their identity ("That's me!") or joins as new participant. Existing `NameDisambiguation` component handles this pattern. |
| Student leaves lastInitial blank (skips step 2) | Allow it. lastInitial is nullable. Disambiguation triggers more often (matches on firstName alone) but still works via fun name display. Student can add initial later via edit dialog. |
| Student skips emoji picker (taps "Skip" on step 3) | Allow it. Emoji is nullable. Display shows fun name without emoji prefix. Student can add emoji later if migration prompt is built. |
| Student on managed Chromebook with localStorage disabled/restricted | Fall back gracefully. Join works normally via full wizard every time. No auto-rejoin. No crash -- all localStorage calls are wrapped in try/catch (existing pattern in codebase). |
| Student joins from incognito/private browsing | localStorage may be cleared on window close. Join works normally, persistence lasts only for the browsing session. Expected and acceptable. |
| Student has v2 sessionStorage identity, visits with v3 code | sessionStorage identity is not checked by v3 flow. Student goes through wizard once, new localStorage entry created. Old sessionStorage data is harmless (never read by v3 code). |
| Student's firstName contains emoji or special characters | Existing `validateFirstName` (via `firstNameSchema` in Zod) already handles this. Only letters, spaces, hyphens, apostrophes allowed. Max 50 chars. No changes needed. |
| Student enters lastInitial with numbers or special chars | Validate: letters only, max 2 characters. Simple regex: `/^[a-zA-Z]{0,2}$/`. |

### Auto-Rejoin Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Student returns to same session, same device | localStorage match found. Call `claimIdentity` silently to verify participant still exists. Skip wizard. Redirect to session view. Show brief "Welcome back, [emoji] [funName]!" toast or welcome-back screen. |
| Student returns to ended session, same device | localStorage match found. Session status is "ended." Show results view directly (existing behavior in `joinSessionByName`). |
| localStorage has stale participantId (teacher deleted/banned student) | `claimIdentity` returns error ("Participant not found" or "You have been removed"). Clear that session's entry from localStorage map. Show wizard as new student (for "not found") or show error (for "banned"). |
| localStorage map grows very large (student joins 100+ sessions over a year) | Implement TTL cleanup: on each join, prune entries older than 90 days. localStorage has ~5MB limit; each entry is ~200 bytes, so ~25,000 sessions before limit. Not a practical concern but good hygiene. |
| Multiple students share a device (siblings on family iPad) | Each sessionId has one entry in localStorage. If two siblings join the SAME session from the same device, the second student's wizard overwrites the first's entry for that sessionId. The first student would need to re-identify on their next visit. This is an acceptable edge case -- shared devices for the same class is rare, and re-identifying takes 15 seconds. |
| Student clears browser data between classes | Same as new student. Full wizard. No data loss on server side -- their participant record still exists. If they enter the same name + initial, disambiguation lets them reclaim. |

### Cross-Device Reclaim Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Unique firstName + lastInitial combo in session | Direct match (only one participant with that name + initial). Skip disambiguation. Reclaim silently -- same as auto-rejoin flow. |
| Ambiguous firstName + lastInitial (two "Emma S."s exist) | Show fun names + emojis for visual disambiguation. Student picks "That's me!" using existing `NameDisambiguation` component with emoji enhancement. |
| Student types wrong initial on different device | No match for that firstName + lastInitial combo. System creates new participant. Student ends up with two identities in the session. Teacher can manually remove the duplicate from student management. |
| Case sensitivity in lastInitial matching | Case-insensitive matching (uppercase "S" matches lowercase "s"). Extend existing case-insensitive pattern from `findParticipantsByFirstName` to include lastInitial. |
| Student switches device mid-vote (has active votes under old identity) | Votes are tied to participantId, not device. When student reclaims identity via disambiguation, they reclaim the same participantId and all their vote history comes with it. No vote duplication. |

### Emoji Picker Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Student taps emoji, then taps different emoji | Selected emoji changes. Only one can be selected. Visual highlight (border/scale) on selected emoji. No multi-select. |
| Student taps selected emoji again | Deselects it. Student can proceed without emoji (nullable). |
| Emoji renders differently across OS/browser | Expected. Apple emoji look different from Google/Windows emoji. This is cosmetic and acceptable. The emoji character is stored as Unicode -- rendering is browser-dependent. No custom emoji images needed. |
| Emoji column needs to support future multi-codepoint emoji | Schema uses varchar(4) to handle emoji with variation selectors (e.g., skin tone modifiers). However, the curated 4x4 grid should use only single-codepoint emoji (no ZWJ sequences) to avoid rendering issues on older devices. |

## Sources

- Existing codebase analysis: `src/actions/student.ts`, `src/components/student/`, `src/lib/student/`, `prisma/schema.prisma`
- [Emoji picker React guide -- Velt](https://velt.dev/blog/react-emoji-picker-guide)
- [Frimousse -- lightweight emoji picker for React](https://frimousse.liveblocks.io/)
- [emoji-mart on GitHub](https://github.com/missive/emoji-mart)
- [Multi-step form best practices -- Webstacks](https://www.webstacks.com/blog/multi-step-form)
- [Stepper UI examples -- Eleken](https://www.eleken.co/blog-posts/stepper-ui-examples)
- [localStorage complete guide -- LogRocket](https://blog.logrocket.com/localstorage-javascript-complete-guide/)
- [localStorage vs sessionStorage -- SuperTokens](https://supertokens.com/blog/localstorage-vs-session-storage)
- [Audience response systems for classrooms -- ClassPoint](https://www.classpoint.io/blog/audience-response-systems-for-classrooms)
- [Kahoot vs Mentimeter comparison -- Wooclap](https://www.wooclap.com/en/blog/kahoot-vs-mentimeter/)

---
*Feature research for: Student join flow overhaul -- SparkVotEDU v3.0*
*Researched: 2026-03-08*
