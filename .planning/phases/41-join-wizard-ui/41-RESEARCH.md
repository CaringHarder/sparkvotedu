# Phase 41: Join Wizard UI - Research

**Researched:** 2026-03-08
**Domain:** React multi-step wizard UI, CSS transitions, student join flow
**Confidence:** HIGH

## Summary

Phase 41 replaces the existing single-input `NameEntryForm` with a two-path join wizard: new students get a fun name splash followed by a 3-step wizard (first name, last initial, emoji), while returning students enter their name and reclaim an existing identity. The backend (Phase 40) is already complete -- all server actions (`lookupStudent`, `claimReturningIdentity`, `createParticipant`) exist and are tested. This phase is purely UI/client-side.

The existing codebase already uses `motion` (v12.29.2, the renamed Framer Motion) for animations, Tailwind CSS for styling, and has established patterns for student components. The emoji pool (`EMOJI_POOL` in `src/lib/student/emoji-pool.ts`) has 24 entries, but the decision specifies a 4x4 grid of 16 -- the wizard should display only the first 16 entries from the pool (or a curated subset).

**Primary recommendation:** Build the wizard as a single `JoinWizard` client component with internal state machine, using `motion` for slide transitions and `AnimatePresence` for step changes. Replace the `NameEntryForm` import in `/join/[code]/page.tsx` with the new wizard component.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- First screen: "I'm new here!" vs "I've been here before" -- two big tappable cards
- New path: fun name splash -> wizard steps -> welcome
- Returning path: name lookup -> disambiguation/auto-reclaim -> welcome back splash
- Slide left/right transitions between steps (carousel-style), 300-400ms with easing
- Forward-only navigation -- no back button, steps locked once completed
- Step dots (small dots at top) show current position
- Input auto-focuses when each step slides in
- Enter key advances to next step (in addition to Continue button)
- Continue button appears on first keystroke (animated reveal), uses same green as Vote button (`bg-green-500`)
- Fun name reveal: full-screen splash "You are... [Fun Name]", auto-advances after 2-3 seconds
- Fun name stays pinned at top throughout wizard steps as small header bar
- Emoji picker: fixed 4x4 grid of 16 curated emojis, no scrolling, all available equally
- Tapping emoji: bounce animation + small checkmark, auto-advances to welcome screen
- Returning flow: enter first name, system checks for matches
- Single match: auto-reclaim silently
- Multiple matches: disambiguation with tappable cards showing fun name + emoji, plus "None of these"
- No matches: offer to join as new student
- After reclaim: "Welcome back!" splash with fun name + emoji, auto-enters session

### Claude's Discretion
- Last initial step: separate slide vs animate in-place below first name
- Fun name splash entrance animation style
- First name validation/character limits
- "None of these" fallback behavior on disambiguation
- Welcome screen layout and auto-advance timing

### Deferred Ideas (OUT OF SCOPE)
- localStorage auto-rejoin that skips the wizard entirely -- Phase 42
- Student self-edit of name and emoji -- Phase 44
- Teacher sidebar name view toggle -- Phase 44
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| JOIN-01 | Student joins session and instantly receives a unique fun name | `createParticipant` in DAL already generates fun name via `generateFunName()`. UI shows fun name splash immediately after participant creation. |
| JOIN-02 | Student completes 3-step wizard: first name -> last initial -> emoji picker | Existing validations (`firstNameSchema`, `lastInitialSchema`) handle input validation. `EMOJI_POOL` provides curated emojis. Server actions accept firstName, lastInitial, emoji params. |
| JOIN-03 | Student sees welcome screen with fun name + chosen emoji before entering session | Existing `WelcomeScreen` component can be enhanced or a new wizard-specific welcome step can display fun name + emoji before routing to session. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion | 12.29.2 | Slide transitions, splash animations, bounce effects | Already in project, used by WelcomeScreen |
| React (useState/useReducer) | 19.x | Wizard state machine | No external state lib needed for local component state |
| Tailwind CSS | 4.x | Styling, responsive layout, color tokens | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | existing | Input validation | Already used via firstNameSchema, lastInitialSchema |
| @2toad/profanity | existing | Name profanity check | Already wired into firstNameSchema |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| motion AnimatePresence | CSS transitions only | motion already in bundle, provides easier exit animations and gesture support |
| External wizard lib | react-hook-form multistep | Overkill -- only 3 steps with simple inputs, no form validation complexity |

## Architecture Patterns

### Recommended Component Structure
```
src/components/student/
  join-wizard/
    join-wizard.tsx           # Main orchestrator with state machine
    path-selector.tsx         # "I'm new!" vs "I've been here before" cards
    fun-name-splash.tsx       # Full-screen fun name reveal (new students)
    wizard-step-first-name.tsx # First name input step
    wizard-step-last-initial.tsx # Last initial input (or inline animation)
    wizard-step-emoji.tsx     # 4x4 emoji grid picker
    wizard-welcome.tsx        # Final welcome screen before entering session
    returning-name-entry.tsx  # Returning student name input
    returning-disambiguation.tsx # Pick identity from candidates
    returning-welcome.tsx     # "Welcome back!" splash
    step-dots.tsx             # Progress indicator dots
    wizard-header.tsx         # Pinned fun name header bar during wizard
```

### Pattern 1: State Machine for Wizard Flow
**What:** Use a discriminated union type for wizard state, with a reducer to manage transitions
**When to use:** Multi-step flows with branching paths (new vs returning)
**Example:**
```typescript
type WizardStep =
  | { type: 'path-select' }
  | { type: 'fun-name-splash'; funName: string; participantId: string }
  | { type: 'first-name'; funName: string; participantId: string }
  | { type: 'last-initial'; funName: string; participantId: string; firstName: string }
  | { type: 'emoji-pick'; funName: string; participantId: string; firstName: string; lastInitial: string }
  | { type: 'welcome'; funName: string; emoji: string; participantId: string }
  | { type: 'returning-name' }
  | { type: 'returning-disambiguate'; candidates: DuplicateCandidate[]; firstName: string; lastInitial: string }
  | { type: 'returning-welcome'; funName: string; emoji: string; participantId: string }

// Direction tracking for slide animation
type SlideDirection = 'left' | 'right'
```

### Pattern 2: AnimatePresence for Step Transitions
**What:** Use motion's `AnimatePresence` with `mode="wait"` for smooth step transitions
**When to use:** Carousel-style slide transitions between wizard steps
**Example:**
```typescript
import { AnimatePresence, motion } from 'motion/react'

// Slide variants (300-400ms, ease-out)
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

<AnimatePresence mode="wait" custom={direction}>
  <motion.div
    key={step.type}
    custom={direction}
    variants={slideVariants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ duration: 0.35, ease: 'easeOut' }}
  >
    {/* step content */}
  </motion.div>
</AnimatePresence>
```

### Pattern 3: Continue Button Animated Reveal
**What:** Button hidden until first keystroke, revealed with motion animation
**Example:**
```typescript
<AnimatePresence>
  {inputValue.length > 0 && (
    <motion.button
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-green-500 hover:bg-green-600 ..."
    >
      Continue
    </motion.button>
  )}
</AnimatePresence>
```

### Anti-Patterns to Avoid
- **Router-based wizard steps:** Don't use Next.js routes for each step -- keep it all client-side in one component tree. URL changes cause full re-renders and break animation state.
- **Calling server actions during each step:** Create the participant once on the new-student path (after path selection), then update firstName/lastInitial/emoji at the end. Don't make a server call per step.
- **Uncontrolled inputs in animated steps:** Always use controlled inputs. When a step slides in, call `inputRef.current?.focus()` in a `useEffect` after the animation completes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide animations | CSS keyframes for multi-step | motion AnimatePresence + variants | Exit animations need JS awareness of unmounting, CSS can't do this |
| Profanity filtering | Custom word list | Existing @2toad/profanity via firstNameSchema | Already configured with whitelist for legitimate names |
| Fun name generation | Custom random logic | Existing `createParticipant` server action | Already handles uniqueness within session |
| Emoji data | Inline emoji arrays | Existing `EMOJI_POOL` from emoji-pool.ts | Single source of truth, includes shortcodes + accessible labels |
| Input validation | Manual checks | Existing `validateFirstName` + `lastInitialSchema` | Already handles edge cases, profanity, emoji rejection |

## Common Pitfalls

### Pitfall 1: EMOJI_POOL has 24 entries, decision says 16
**What goes wrong:** Showing all 24 emojis breaks the 4x4 grid layout
**Why it happens:** Pool was designed with extra emojis for variety
**How to avoid:** Slice `EMOJI_POOL.slice(0, 16)` in the emoji picker component, or create a `WIZARD_EMOJI_POOL` constant with 16 selected entries
**Warning signs:** Grid wrapping to 5th row or requiring scroll

### Pitfall 2: Auto-focus not working after slide animation
**What goes wrong:** `autoFocus` prop fires before the motion animation completes, focus lost
**Why it happens:** React renders the element before motion has finished the enter animation
**How to avoid:** Use `onAnimationComplete` callback from motion to trigger `inputRef.current?.focus()`, or use a short `setTimeout` (50ms) after mount
**Warning signs:** User has to tap/click the input manually after step transitions

### Pitfall 3: Creating participant too early or too late
**What goes wrong:** If participant is created at wizard start, but user abandons, orphan records accumulate. If created at the end, the fun name shown in splash may not match.
**Why it happens:** The fun name is generated server-side during `createParticipant`
**How to avoid:** For new students, call `createParticipant` right after the path selection ("I'm new here!") to get the fun name. Then show the splash. The firstName, lastInitial, and emoji can be updated via separate server action or by passing them all at creation time. Actually -- looking at `createParticipant`, it accepts optional firstName, lastInitial, emoji params. So call it once with empty firstName to get the fun name, then update after wizard completion.
**Better approach:** Call `createParticipant` with empty firstName initially (this is the current default behavior), show fun name splash, then call `updateParticipantName` and a new action to set lastInitial + emoji after wizard completes.

### Pitfall 4: Session store not updated with emoji/lastInitial
**What goes wrong:** `SessionParticipantStore` doesn't include `emoji` or `lastInitial` fields
**Why it happens:** The store type was designed before the wizard
**How to avoid:** Extend `SessionParticipantStore` interface to include `emoji: string | null` and `lastInitial: string | null`. Update `setSessionParticipant` calls in the wizard.

### Pitfall 5: Vote button green color mismatch
**What goes wrong:** Continue button uses wrong green shade
**Why it happens:** Assuming `brand-green` exists when project only has `brand-blue` and `brand-amber`
**How to avoid:** Vote button uses Tailwind's default `bg-green-500 hover:bg-green-600`. Use exactly these classes for the Continue button. Do NOT create a custom brand-green variable.

### Pitfall 6: Returning student flow needs both first name AND last initial
**What goes wrong:** The `lookupStudent` action requires both firstName and lastInitial, but the CONTEXT.md says returning student only enters first name for early detection
**Why it happens:** Tension between the CONTEXT decision (check after first name) and the server action API (requires both)
**How to avoid:** Two approaches: (a) Use `joinSessionByName` (which only requires firstName) for the returning path's initial lookup, then collect lastInitial if needed; OR (b) Collect both first name and last initial from returning students before calling `lookupStudent`. Recommend approach (b) since `lookupStudent` searches across ALL teacher sessions (not just current), giving better match quality. The returning student form should collect first name + last initial together, then call `lookupStudent`.

## Code Examples

### Existing Server Actions Available (from Phase 40)
```typescript
// For new students -- creates participant with fun name
import { createParticipant } from '@/lib/dal/student-session'
// Via server action:
import { joinSessionByName } from '@/actions/student'

// For returning students -- cross-session lookup
import { lookupStudent, claimReturningIdentity } from '@/actions/student'

// For updating name after wizard
import { updateParticipantName } from '@/actions/student'
```

### Current Entry Point to Replace
```typescript
// src/app/(student)/join/[code]/page.tsx currently renders:
<NameEntryForm code={code} sessionInfo={sessionInfo} />

// Replace with:
<JoinWizard code={code} sessionInfo={sessionInfo} />
```

### Emoji Grid Layout
```typescript
import { EMOJI_POOL, type EmojiEntry } from '@/lib/student/emoji-pool'

// Display 16 emojis in 4x4 grid
const WIZARD_EMOJIS = EMOJI_POOL.slice(0, 16)

<div className="grid grid-cols-4 gap-3">
  {WIZARD_EMOJIS.map((entry) => (
    <button
      key={entry.shortcode}
      onClick={() => handleEmojiSelect(entry)}
      className="flex h-14 w-14 items-center justify-center rounded-xl text-3xl transition-transform active:scale-90"
      aria-label={entry.label}
    >
      {entry.emoji}
    </button>
  ))}
</div>
```

### Session Store Update Pattern
```typescript
// After wizard completes, store identity
setSessionParticipant(sessionId, {
  participantId: participant.id,
  firstName: participant.firstName,
  funName: participant.funName,
  sessionId: sessionId,
  rerollUsed: participant.rerollUsed,
  // TODO: extend store type to include emoji + lastInitial
})
```

### Wizard Integration with Server Actions
```typescript
// New student flow:
// 1. User taps "I'm new here!"
// 2. Call joinSessionByName({ code, firstName: '' }) or createParticipant
//    -> Gets back participant with funName
// 3. Show fun name splash (2-3 sec auto-advance)
// 4. Wizard: first name -> last initial -> emoji
// 5. Call updateParticipantName({ participantId, firstName })
// 6. Need new action or extend existing to set lastInitial + emoji
// 7. Show welcome screen -> auto-enter session

// Returning student flow:
// 1. User taps "I've been here before"
// 2. Collect first name + last initial
// 3. Call lookupStudent({ code, firstName, lastInitial })
// 4. Handle: isNew (redirect to new flow), single match (auto-reclaim),
//    multiple matches (disambiguation), sessionEnded
// 5. Show "Welcome back!" splash -> auto-enter session
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single NameEntryForm input | Two-path wizard with splash screens | Phase 41 (this phase) | Complete UX overhaul for student join |
| Name-only identity | Name + last initial + emoji identity | Phase 39-40 schema/actions | Richer student profiles |
| Device fingerprinting (FingerprintJS) | Name-based identity matching | Phase 40 | Simpler, more reliable, privacy-friendly |

## Open Questions

1. **Missing server action for lastInitial + emoji update**
   - What we know: `updateParticipantName` updates firstName only. No action exists to update lastInitial or emoji on an existing participant.
   - What's unclear: Whether to extend `updateParticipantName` or create a new action like `completeWizard({ participantId, firstName, lastInitial, emoji })`
   - Recommendation: Create a new `completeWizardProfile` server action that sets firstName, lastInitial, and emoji in one call. This avoids multiple round trips.

2. **New student participant creation timing**
   - What we know: `joinSessionByName` requires a firstName (min 2 chars). But we want to create the participant BEFORE the first name step to show the fun name splash.
   - What's unclear: Whether to modify `createParticipant`'s firstName default or create a new action
   - Recommendation: Create a `createNewParticipant` server action that creates a participant with empty/placeholder firstName and returns the fun name. Then `completeWizardProfile` fills in the details. Alternatively, modify `joinSessionByName` to accept an empty firstName for the initial creation.

3. **Returning student: first name only vs first name + last initial**
   - What we know: CONTEXT says "system checks for matches after first name entry (early detection)". But `lookupStudent` requires both firstName and lastInitial.
   - What's unclear: Whether to use `joinSessionByName` (firstName only, current session only) or `lookupStudent` (firstName + lastInitial, cross-session) for the returning path
   - Recommendation: Collect both first name and last initial from returning students (two quick inputs), then use `lookupStudent` for cross-session matching. This gives better results than single-session firstName-only matching. The "early detection" can mean checking after both fields are filled.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JOIN-01 | New student gets fun name on join | unit | `npx vitest run src/components/student/join-wizard/__tests__/join-wizard.test.tsx -x` | No - Wave 0 |
| JOIN-02 | 3-step wizard (first name, last initial, emoji) | unit | `npx vitest run src/components/student/join-wizard/__tests__/wizard-steps.test.tsx -x` | No - Wave 0 |
| JOIN-03 | Welcome screen shows fun name + emoji | unit | `npx vitest run src/components/student/join-wizard/__tests__/wizard-welcome.test.tsx -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/student/join-wizard/__tests__/join-wizard.test.tsx` -- covers JOIN-01
- [ ] `src/components/student/join-wizard/__tests__/wizard-steps.test.tsx` -- covers JOIN-02
- [ ] `src/components/student/join-wizard/__tests__/wizard-welcome.test.tsx` -- covers JOIN-03
- [ ] Note: Component tests will need `@testing-library/react` and likely jsdom environment. Current vitest config uses `environment: 'node'` -- tests may need per-file `// @vitest-environment jsdom` pragma or a separate config.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/actions/student.ts` -- all server actions for join/lookup/claim
- Codebase inspection: `src/components/student/name-entry-form.tsx` -- current UI to replace
- Codebase inspection: `src/lib/student/emoji-pool.ts` -- 24-entry emoji pool
- Codebase inspection: `src/lib/student/fun-names.ts` -- fun name generation
- Codebase inspection: `src/lib/validations/first-name.ts` -- validation with profanity check
- Codebase inspection: `src/lib/validations/last-initial.ts` -- 1-2 char uppercase letter
- Codebase inspection: `src/components/student/welcome-screen.tsx` -- existing welcome with motion animations
- Codebase inspection: `src/lib/student/session-store.ts` -- sessionStorage per-tab identity
- Codebase inspection: `src/types/student.ts` -- JoinResult, LookupResult, DuplicateCandidate types
- Codebase inspection: `src/app/globals.css` -- brand-blue, brand-amber color tokens (no brand-green)
- Codebase inspection: `src/components/student/simple-poll-vote.tsx` -- Vote button uses `bg-green-500`

### Secondary (MEDIUM confidence)
- motion v12 docs -- AnimatePresence, variants, custom prop for directional animations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, versions verified from package.json
- Architecture: HIGH - pattern follows existing component conventions in codebase
- Pitfalls: HIGH - identified from direct codebase analysis (emoji count mismatch, missing actions, store gaps)

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- internal project patterns)
