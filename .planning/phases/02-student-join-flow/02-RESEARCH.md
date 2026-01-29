# Phase 2: Student Join Flow - Research

**Researched:** 2026-01-29
**Domain:** Anonymous student sessions, device fingerprinting (identical school hardware), fun name generation, class code join flow, session persistence, real-time presence (Supabase Realtime), QR code generation
**Confidence:** MEDIUM (composite -- HIGH for stack/patterns, MEDIUM for fingerprinting on identical hardware, LOW for collision rates requiring real-world validation)

## Summary

This research covers everything needed to plan Phase 2: building the anonymous student join flow where students enter a 6-digit class code, receive an alliterative fun name, are fingerprinted for return recognition, and see a session view of active brackets/polls. The phase introduces a fundamentally different user model from Phase 1 -- students have NO accounts, NO authentication, and are identified purely by device fingerprint + browser storage.

The most critical finding is that **browser fingerprinting alone will NOT reliably distinguish students on identical school hardware** (same Chromebook model, same OS, same browser version, same managed configuration). Studies show canvas/WebGL fingerprinting produces 1-3% collision rates on identical hardware/software stacks. The recommended strategy is a **layered composite approach**: primary identification via localStorage/cookies (a generated UUID stored per browser profile), secondary identification via FingerprintJS open-source library (canvas, WebGL, audio context, fonts, etc.), and tertiary fallback via a personal recovery code. This composite approach works because even on identical Chromebooks, each student typically has their own Chrome profile or login session, giving each browser its own localStorage/cookie space.

For fun name generation, the CONTEXT.md locks the decision to alliterative adjective+animal names. Rather than depending on small npm packages with uncertain maintenance, the recommended approach is a **hand-rolled generator** using curated word lists -- this gives full control over name quality, alliteration filtering, classroom-appropriateness, and uniqueness enforcement within a session. Supabase Realtime (Presence + Postgres Changes) provides the real-time infrastructure for the student session view, leveraging the existing `@supabase/supabase-js` client already installed in the project.

**Primary recommendation:** Use a layered identity strategy (localStorage UUID as primary, FingerprintJS as secondary, recovery code as tertiary). Build fun names with custom word lists (not third-party libraries). Use Supabase Realtime Presence for student connection tracking and Postgres Changes for activity list updates. Store session/student data in new Prisma models: `ClassSession`, `StudentParticipant`, and `DeviceFingerprint`.

## Standard Stack

The established libraries/tools for this phase:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @fingerprintjs/fingerprintjs | 5.x | Browser fingerprinting (open-source) | MIT license, 22k+ GitHub stars, collects canvas/WebGL/audio/font signals. Client-side only, 40-60% accuracy alone but supplements localStorage. |
| qrcode.react | latest | QR code rendering | React component for SVG/Canvas QR codes. Most popular React QR library. Used for class code and item code QR display. |
| nanoid | 5.x | Recovery code generation | Cryptographically secure, tiny (118 bytes), customizable alphabet. Used for generating student recovery codes. Already proven in ecosystem. |
| @supabase/supabase-js | 2.93.x | Realtime Presence + Postgres Changes | Already installed. Provides Broadcast, Presence, and Postgres Changes channels for real-time student session updates. |
| Prisma | 7.3.x | Database models for sessions/students | Already installed. New models: ClassSession, StudentParticipant, DeviceFingerprint. |
| Zod | 4.x | Validation schemas | Already installed. Used for class code input validation and server action parameter validation. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto (Node.js built-in) | N/A | Secure random code generation | Generating 6-digit class codes server-side with `crypto.randomInt()`. No npm install needed. |
| React 19 `useActionState` | N/A | Form state management | Join form follows same pattern as auth forms from Phase 1. Already available. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @fingerprintjs/fingerprintjs (open-source) | Fingerprint Pro (commercial) | Pro offers 99.5% accuracy but costs money and requires API key. Open-source at 40-60% is sufficient when combined with localStorage. |
| @fingerprintjs/fingerprintjs | ThumbmarkJS | ThumbmarkJS is newer (80% accuracy claimed) but smaller community. FingerprintJS has larger ecosystem and battle-tested signals. |
| Custom word lists for fun names | `unique-names-generator` npm | UNG lacks built-in alliteration filter and uses generic words. Custom lists ensure classroom-appropriate, alliterative names with full control. |
| Custom word lists for fun names | `animal-namer` npm | Has built-in alliteration but small word lists, low download count, uncertain maintenance. Custom is safer for a production classroom product. |
| qrcode.react | next-qrcode | next-qrcode is purpose-built for Next.js but last published 2 years ago. qrcode.react is actively maintained with larger community. |

**Installation:**

```bash
# Fingerprinting (client-side only)
npm install @fingerprintjs/fingerprintjs

# QR code generation
npm install qrcode.react

# Recovery code generation
npm install nanoid
```

**Note:** `@supabase/supabase-js`, `prisma`, `@prisma/client`, and `zod` are already installed from Phase 1.

## Architecture Patterns

### Recommended Project Structure (Phase 2 Additions)

```
src/
├── app/
│   ├── (student)/                    # Route group: student-facing pages (NO auth required)
│   │   ├── join/page.tsx             # Join page with code input field
│   │   ├── join/[code]/page.tsx      # Direct join via URL with pre-filled code
│   │   ├── session/[sessionId]/
│   │   │   ├── page.tsx              # Student session view (active brackets/polls)
│   │   │   ├── layout.tsx            # Minimal header with fun name
│   │   │   └── welcome/page.tsx      # Welcome screen after join
│   │   └── layout.tsx                # Student layout (no auth header, minimal chrome)
│   ├── proxy.ts                      # UPDATED: Add /join and /session to public pages
│   └── ...existing routes
├── lib/
│   ├── student/
│   │   ├── fingerprint.ts            # FingerprintJS initialization + composite signal
│   │   ├── fun-names.ts              # Name generator with word lists
│   │   ├── fun-names-words.ts        # Curated adjective + animal word lists
│   │   ├── session-identity.ts       # localStorage UUID + cookie management
│   │   └── class-codes.ts            # Code generation + validation utilities
│   ├── dal/
│   │   ├── auth.ts                   # Existing teacher auth
│   │   ├── student-session.ts        # Student session data access (join, rejoin, lookup)
│   │   └── class-session.ts          # Class session data access (create, lookup, manage)
│   └── ...existing
├── actions/
│   ├── auth.ts                       # Existing
│   ├── student.ts                    # Server Actions: joinSession, rerollName, getRecoveryCode
│   └── class-session.ts              # Server Actions: createSession, endSession, removeStudent
├── components/
│   ├── student/
│   │   ├── join-form.tsx             # Code input with validation
│   │   ├── welcome-screen.tsx        # "Welcome, Daring Dragon!" with auto-redirect
│   │   ├── session-header.tsx        # Minimal header with fun name
│   │   ├── activity-grid.tsx         # Card grid of active brackets/polls
│   │   ├── activity-card.tsx         # Individual bracket/poll card
│   │   ├── empty-state.tsx           # "Hang tight!" waiting screen
│   │   ├── reroll-button.tsx         # One-time name reroll
│   │   └── recovery-code-dialog.tsx  # Recovery code display/input
│   ├── teacher/
│   │   ├── qr-code-display.tsx       # QR code with toggle
│   │   ├── student-roster.tsx        # "12 of 28 connected" display
│   │   └── student-management.tsx    # Remove/ban student controls
│   └── ...existing
├── hooks/
│   ├── use-device-identity.ts        # Client hook: composite fingerprint + localStorage
│   ├── use-student-session.ts        # Client hook: session state, presence, activities
│   └── use-realtime-activities.ts    # Client hook: subscribe to activity list changes
└── types/
    ├── database.ts                   # Existing
    └── student.ts                    # Student-specific types
```

### Pattern 1: Layered Device Identity (Composite Fingerprinting)

**What:** A three-layer identity strategy that maximizes recognition even on identical school hardware.
**When to use:** Every student join and return flow.

```typescript
// lib/student/session-identity.ts
// Layer 1: localStorage UUID (primary identifier)
// This is the most reliable signal on identical hardware because each
// Chrome profile has its own localStorage, even on the same physical device.

const IDENTITY_KEY = 'sparkvotedu_device_id'

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return ''

  let deviceId = localStorage.getItem(IDENTITY_KEY)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(IDENTITY_KEY, deviceId)
  }
  return deviceId
}
```

```typescript
// lib/student/fingerprint.ts
// Layer 2: FingerprintJS browser fingerprint (secondary signal)
// Adds entropy from canvas, WebGL, audio context, fonts, etc.
// On identical hardware this may collide, but combined with localStorage
// it provides additional confidence for identity matching.

import FingerprintJS from '@fingerprintjs/fingerprintjs'

let fpPromise: Promise<ReturnType<typeof FingerprintJS.load>> | null = null

export async function getBrowserFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return ''

  if (!fpPromise) {
    fpPromise = FingerprintJS.load()
  }

  const fp = await fpPromise
  const result = await fp.get()
  return result.visitorId
}
```

```typescript
// hooks/use-device-identity.ts
// Composite identity hook used by join flow
// Combines Layer 1 (localStorage) + Layer 2 (fingerprint) into a single payload

import { useEffect, useState } from 'react'
import { getOrCreateDeviceId } from '@/lib/student/session-identity'
import { getBrowserFingerprint } from '@/lib/student/fingerprint'

interface DeviceIdentity {
  deviceId: string        // localStorage UUID (primary)
  fingerprint: string     // FingerprintJS hash (secondary)
  ready: boolean
}

export function useDeviceIdentity(): DeviceIdentity {
  const [identity, setIdentity] = useState<DeviceIdentity>({
    deviceId: '',
    fingerprint: '',
    ready: false,
  })

  useEffect(() => {
    async function identify() {
      const deviceId = getOrCreateDeviceId()
      const fingerprint = await getBrowserFingerprint()
      setIdentity({ deviceId, fingerprint, ready: true })
    }
    identify()
  }, [])

  return identity
}
```

**Key decision:** The server-side matching logic should use a priority order:
1. Match by `deviceId` (localStorage UUID) -- most reliable
2. If no `deviceId` match, try `fingerprint` match -- catches cleared storage
3. If no match at all, create new participant
4. Recovery code provides manual identity restoration (Layer 3)

### Pattern 2: 6-Digit Class Code Generation

**What:** Generate unique, active-only 6-digit numeric codes for class sessions.
**When to use:** When a teacher creates or starts a new class session.

```typescript
// lib/student/class-codes.ts
import { prisma } from '@/lib/prisma'

/**
 * Generate a unique 6-digit class code.
 * Uses crypto.randomInt for secure random generation.
 * Checks against active sessions to avoid collisions.
 * With 900,000 possible codes and typically <1000 concurrent sessions,
 * collision probability per attempt is <0.1%, so retry is extremely rare.
 */
export async function generateClassCode(): Promise<string> {
  const MAX_ATTEMPTS = 10

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    // Generate random 6-digit number (100000-999999)
    const code = String(crypto.randomInt(100000, 1000000))

    // Check if code is already in use by an active session
    const existing = await prisma.classSession.findFirst({
      where: {
        code,
        status: { in: ['active', 'paused'] },
      },
    })

    if (!existing) return code
  }

  throw new Error('Failed to generate unique class code after max attempts')
}
```

### Pattern 3: Alliterative Fun Name Generator

**What:** Generate unique alliterative adjective+animal names within a session.
**When to use:** When a student joins a session for the first time.

```typescript
// lib/student/fun-names.ts

import { ADJECTIVES, ANIMALS } from './fun-names-words'

/**
 * Generate a unique alliterative fun name for a class session.
 * Names follow the pattern "Adjective Animal" where both start with the same letter.
 *
 * Strategy:
 * 1. Pick a random letter that has both adjectives and animals
 * 2. Pick a random adjective and animal starting with that letter
 * 3. Check uniqueness within the session
 * 4. Retry with different combinations if collision occurs
 */
export function generateFunName(existingNames: Set<string>): string {
  const MAX_ATTEMPTS = 100
  const letters = Object.keys(ADJECTIVES).filter(
    (letter) => ANIMALS[letter]?.length > 0
  )

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const letter = letters[Math.floor(Math.random() * letters.length)]
    const adj = ADJECTIVES[letter][Math.floor(Math.random() * ADJECTIVES[letter].length)]
    const animal = ANIMALS[letter][Math.floor(Math.random() * ANIMALS[letter].length)]
    const name = `${adj} ${animal}`

    if (!existingNames.has(name)) return name
  }

  // Fallback: append a number (extremely unlikely with large word lists)
  return `Student ${Math.floor(Math.random() * 9000) + 1000}`
}
```

```typescript
// lib/student/fun-names-words.ts (excerpt)
// Curated for classroom appropriateness and alliteration quality

export const ADJECTIVES: Record<string, string[]> = {
  A: ['Amazing', 'Awesome', 'Adventurous', 'Agile', 'Artistic'],
  B: ['Bold', 'Brave', 'Brilliant', 'Bouncy', 'Bright'],
  C: ['Clever', 'Cool', 'Cosmic', 'Creative', 'Cheerful'],
  D: ['Daring', 'Dazzling', 'Dynamic', 'Dashing', 'Dreamy'],
  // ... all 26 letters, 15-25 adjectives each
  // Total capacity: ~500 adjectives x ~300 animals = 150k combinations
  // With alliteration filter: ~8-15k unique combinations per letter
  // Far exceeds any classroom size
}

export const ANIMALS: Record<string, string[]> = {
  A: ['Armadillo', 'Antelope', 'Albatross', 'Axolotl', 'Alpaca'],
  B: ['Bear', 'Bunny', 'Butterfly', 'Buffalo', 'Badger'],
  C: ['Cheetah', 'Cobra', 'Chameleon', 'Capybara', 'Crane'],
  D: ['Dragon', 'Dolphin', 'Deer', 'Dove', 'Dragonfly'],
  // ... all 26 letters, 10-20 animals each
}
```

### Pattern 4: Supabase Realtime for Student Session View

**What:** Use Supabase Realtime Presence for connection tracking and Postgres Changes (or Broadcast) for activity list updates.
**When to use:** Student session view page and teacher dashboard.

```typescript
// hooks/use-student-session.ts
// Subscribe to Supabase Presence for the session channel

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useStudentSession(sessionId: string, funName: string) {
  const [connectedCount, setConnectedCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const channel: RealtimeChannel = supabase.channel(`session:${sessionId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setConnectedCount(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            funName,
            joinedAt: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [sessionId, funName, supabase])

  return { connectedCount }
}
```

```typescript
// hooks/use-realtime-activities.ts
// Subscribe to activity changes (brackets/polls becoming active/inactive)

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Activity {
  id: string
  name: string
  type: 'bracket' | 'poll'
  participantCount: number
  hasVoted: boolean
}

export function useRealtimeActivities(sessionId: string) {
  const [activities, setActivities] = useState<Activity[]>([])
  const supabase = createClient()

  const fetchActivities = useCallback(async () => {
    // Initial fetch via server action or API route
    const res = await fetch(`/api/sessions/${sessionId}/activities`)
    const data = await res.json()
    setActivities(data)
  }, [sessionId])

  useEffect(() => {
    fetchActivities()

    // Subscribe to Postgres changes or Broadcast for real-time updates
    const channel = supabase
      .channel(`activities:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          // Refetch on any change -- simpler than diffing payloads
          fetchActivities()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase, fetchActivities])

  return { activities }
}
```

### Pattern 5: Proxy Update for Public Student Routes

**What:** The existing proxy.ts must be updated to allow unauthenticated access to student-facing routes.
**When to use:** All `/join` and `/session` paths.

```typescript
// proxy.ts update -- add student routes to public pages
const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/update-password', '/auth']
const PUBLIC_PAGES = ['/', '/join']  // Add /join

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.includes(pathname) ||
         pathname.startsWith('/join/') ||
         pathname.startsWith('/session/')
}
```

### Pattern 6: Database Schema for Student Sessions

**What:** New Prisma models for class sessions, student participants, and device fingerprints.
**When to use:** All student join/session flows.

```prisma
// prisma/schema.prisma -- new models for Phase 2

model ClassSession {
  id          String   @id @default(uuid())
  code        String                          // 6-digit numeric code (unique among active)
  name        String?                         // Optional display name
  status      String   @default("active")     // active, paused, ended, archived
  teacherId   String   @map("teacher_id")
  teacher     Teacher  @relation(fields: [teacherId], references: [id])
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  endedAt     DateTime? @map("ended_at")

  participants StudentParticipant[]

  @@index([code, status])                     // Fast lookup by active code
  @@map("class_sessions")
}

model StudentParticipant {
  id              String   @id @default(uuid())
  funName         String   @map("fun_name")
  deviceId        String   @map("device_id")      // localStorage UUID (primary identifier)
  fingerprint     String?                          // FingerprintJS hash (secondary signal)
  recoveryCode    String?  @map("recovery_code")   // Personal recovery code (tertiary)
  rerollUsed      Boolean  @default(false) @map("reroll_used")
  banned          Boolean  @default(false)
  lastSeenAt      DateTime @default(now()) @map("last_seen_at")
  createdAt       DateTime @default(now()) @map("created_at")

  sessionId       String   @map("session_id")
  session         ClassSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@unique([sessionId, deviceId])              // One participant per device per session
  @@unique([sessionId, funName])               // Unique fun names within session
  @@index([sessionId, fingerprint])            // Fingerprint lookup for returning students
  @@index([recoveryCode])                      // Recovery code lookup
  @@map("student_participants")
}
```

**Key schema decisions:**
- `ClassSession` belongs to a `Teacher` (adds relation to existing Teacher model)
- `StudentParticipant` uses `deviceId` (localStorage UUID) as primary identifier with unique constraint per session
- `fingerprint` is secondary and nullable (may not be available if FingerprintJS fails)
- `recoveryCode` is generated on demand (not on initial join) to avoid unnecessary complexity
- `code` on ClassSession is NOT globally unique -- only unique among active sessions (index + application-level check)
- No separate `DeviceFingerprint` table -- device identity is embedded in `StudentParticipant` since the relationship is always 1:1 within a session context

### Anti-Patterns to Avoid

- **Relying solely on browser fingerprinting for identity:** On identical school Chromebooks, canvas/WebGL fingerprints will collide (1-3% rate). Always use localStorage UUID as the primary identifier.
- **Storing student identity in cookies only:** School IT policies may clear cookies. localStorage is more persistent. Use both for redundancy but treat localStorage as primary.
- **Using `Math.random()` for class codes:** Not cryptographically secure. Use `crypto.randomInt()` for code generation.
- **Fetching fingerprint on the server:** FingerprintJS is client-side only. The fingerprint must be computed in the browser and sent to the server via a form submission or API call.
- **Creating a globally unique code constraint:** Class codes only need to be unique among active sessions. A global unique constraint wastes the code space and makes ended sessions block future codes.
- **Subscribing to Postgres Changes for every student:** Supabase warns that Postgres Changes triggers a read per subscriber per change. For classrooms with 30+ students, use Broadcast for messages between clients and reserve Postgres Changes for activity list changes (low frequency).
- **Putting student identity logic in Server Components:** Device identity (localStorage, fingerprint) is client-side only. Use a Client Component hook (`useDeviceIdentity`) and pass the identity to Server Actions.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser fingerprinting | Custom canvas/WebGL signal collection | FingerprintJS (open-source) | Handles browser quirks, signal normalization, hash computation. 50+ signals combined. |
| QR code rendering | Custom QR code matrix + SVG | qrcode.react | QR spec compliance, error correction levels, customizable colors/sizes. |
| Cryptographic random IDs | Math.random() + string manipulation | nanoid / crypto.randomUUID() | Cryptographically secure, uniform distribution, collision-safe. |
| Real-time presence tracking | Custom WebSocket server + heartbeat | Supabase Realtime Presence | Automatic disconnect detection, CRDT-based state sync, no infrastructure to manage. |
| Real-time data updates | Custom polling or WebSocket | Supabase Realtime Postgres Changes | Built into existing Supabase stack, RLS-compatible, automatic channel management. |

**Key insight:** The student join flow is 80% application logic (code validation, name generation, identity matching, session management) and 20% infrastructure (fingerprinting, real-time, QR codes). Use libraries for the infrastructure; write custom code for the application logic where classroom-specific requirements (alliteration, uniqueness per session, identical hardware handling) demand it.

## Common Pitfalls

### Pitfall 1: Fingerprint Collisions on Identical School Hardware

**What goes wrong:** Two students on identical Chromebooks get the same browser fingerprint, causing identity confusion. One student's votes could be attributed to another.
**Why it happens:** Canvas/WebGL fingerprinting relies on hardware and software diversity. School-issued devices have identical hardware, OS, browser version, extensions, and configuration. Studies show 1-3% collision rate for identical stacks.
**How to avoid:** NEVER use fingerprint as the sole identifier. The composite strategy uses localStorage UUID as primary (unique per Chrome profile), fingerprint as secondary signal for correlation, and recovery code as manual fallback. The `@@unique([sessionId, deviceId])` constraint in Prisma ensures no two participants share a deviceId within a session.
**Warning signs:** Multiple students mapped to the same participant record. Teacher sees fewer participants than students present.

### Pitfall 2: localStorage Cleared by School IT Policies

**What goes wrong:** A school's MDM (Mobile Device Management) policy wipes browser data (localStorage, cookies) on logout or daily. Returning students are not recognized.
**Why it happens:** School IT admins commonly configure group policies that clear all browsing data on Chromebook sign-out to maintain clean user profiles.
**How to avoid:** This is exactly why the identity strategy has multiple layers. When localStorage is cleared, the server falls back to fingerprint matching. When both are gone, the recovery code provides manual restoration. Document this behavior and test with simulated storage wipe.
**Warning signs:** Students report getting new fun names every time they rejoin. High rate of "new" participants in sessions with returning students.

### Pitfall 3: FingerprintJS Running Server-Side

**What goes wrong:** Build error or empty fingerprint value because FingerprintJS tries to access browser APIs (canvas, WebGL) on the server.
**Why it happens:** Next.js renders components on the server by default. FingerprintJS requires DOM APIs only available in the browser.
**How to avoid:** Wrap FingerprintJS usage in a `typeof window !== 'undefined'` check. Use a `useEffect` hook for initialization (runs only client-side). Mark fingerprint-dependent components with `'use client'`. Never import FingerprintJS in Server Components or Server Actions.
**Warning signs:** `ReferenceError: document is not defined` or `ReferenceError: window is not defined` during SSR.

### Pitfall 4: Class Code Collision Under High Concurrency

**What goes wrong:** Two teachers create sessions simultaneously and get the same 6-digit code before the database constraint can prevent it.
**Why it happens:** The generate-and-check pattern has a TOCTOU (time-of-check-time-of-use) race condition if two requests check at the same moment.
**How to avoid:** Add a unique partial index on `(code) WHERE status IN ('active', 'paused')` in the database. If the insert fails due to the unique constraint, catch the error and retry with a new code. The application-level check reduces retries; the database constraint guarantees correctness.
**Warning signs:** Prisma throws a unique constraint violation error on ClassSession creation.

### Pitfall 5: Supabase Realtime Scaling with Postgres Changes

**What goes wrong:** Database slows down when 30+ students are subscribed to Postgres Changes in a session and the teacher makes frequent activity updates.
**Why it happens:** Supabase Realtime checks RLS policies for every subscriber on every change. 30 students = 30 reads per database change. This is documented in Supabase's scaling guidance.
**How to avoid:** Use **Broadcast** for high-frequency, client-to-client messages (like connection status). Use **Postgres Changes** only for low-frequency events (activity status changes). For activity list updates, consider having the server action send a Broadcast message after the database write, rather than relying on Postgres Changes.
**Warning signs:** Slow response times when teacher activates/deactivates brackets. Database CPU spikes during class sessions.

### Pitfall 6: Fun Name Pool Exhaustion

**What goes wrong:** In a very large session or after many rerolls, all alliterative combinations for a letter are exhausted, and the generator enters an infinite loop or returns duplicates.
**Why it happens:** If the word lists are too small or a letter has very few adjective/animal combinations, the pool is smaller than expected.
**How to avoid:** Ensure each letter has at least 15 adjectives and 10 animals (150 combinations per letter, 3900+ total across 26 letters). The generator should have a hard limit on attempts (100) and a numeric fallback. For sessions up to 200 students, this pool size is more than adequate.
**Warning signs:** Generator throws error or returns fallback name. Students report duplicate names in a session.

### Pitfall 7: Student Routes Blocked by Auth Proxy

**What goes wrong:** Students visiting `/join` or `/session/*` are redirected to `/login` because the proxy treats all non-auth pages as requiring authentication.
**Why it happens:** The Phase 1 proxy.ts treats everything except auth pages and `/` as requiring authentication.
**How to avoid:** Update the proxy.ts `PUBLIC_PAGES` array and `isPublicPage()` function to include `/join` and `/session/` paths. This is a simple config change, not a structural change.
**Warning signs:** Students see the login page instead of the join page. Browser shows redirect loop.

## Code Examples

### Server Action: Join a Session

```typescript
// actions/student.ts
'use server'

import { prisma } from '@/lib/prisma'
import { generateFunName } from '@/lib/student/fun-names'
import { nanoid } from 'nanoid'
import { z } from 'zod'

const joinSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
  deviceId: z.string().min(1, 'Device ID is required'),
  fingerprint: z.string().optional(),
})

export async function joinSession(input: z.infer<typeof joinSchema>) {
  const parsed = joinSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { code, deviceId, fingerprint } = parsed.data

  // 1. Find active session by code
  const session = await prisma.classSession.findFirst({
    where: { code, status: 'active' },
    include: { teacher: { select: { name: true } } },
  })

  if (!session) {
    return { error: 'Invalid or expired class code' }
  }

  // 2. Check if this device already has a participant in this session
  const existingByDevice = await prisma.studentParticipant.findUnique({
    where: { sessionId_deviceId: { sessionId: session.id, deviceId } },
  })

  if (existingByDevice) {
    if (existingByDevice.banned) {
      return { error: 'You have been removed from this session' }
    }
    // Return existing participant (returning student)
    return {
      participant: existingByDevice,
      session: { id: session.id, teacherName: session.teacher.name },
      returning: true,
    }
  }

  // 3. Check fingerprint match (fallback for cleared localStorage)
  if (fingerprint) {
    const existingByFingerprint = await prisma.studentParticipant.findFirst({
      where: { sessionId: session.id, fingerprint, banned: false },
    })

    if (existingByFingerprint) {
      // Update the deviceId to the new one (localStorage was cleared)
      const updated = await prisma.studentParticipant.update({
        where: { id: existingByFingerprint.id },
        data: { deviceId },
      })
      return {
        participant: updated,
        session: { id: session.id, teacherName: session.teacher.name },
        returning: true,
      }
    }
  }

  // 4. New student -- generate fun name
  const existingNames = await prisma.studentParticipant.findMany({
    where: { sessionId: session.id },
    select: { funName: true },
  })
  const nameSet = new Set(existingNames.map((p) => p.funName))
  const funName = generateFunName(nameSet)

  // 5. Create participant
  const participant = await prisma.studentParticipant.create({
    data: {
      sessionId: session.id,
      funName,
      deviceId,
      fingerprint: fingerprint || null,
    },
  })

  return {
    participant,
    session: { id: session.id, teacherName: session.teacher.name },
    returning: false,
  }
}
```

### Server Action: Reroll Fun Name

```typescript
// actions/student.ts (continued)

export async function rerollName(participantId: string) {
  const participant = await prisma.studentParticipant.findUnique({
    where: { id: participantId },
  })

  if (!participant) return { error: 'Participant not found' }
  if (participant.rerollUsed) return { error: 'You already used your reroll' }

  const existingNames = await prisma.studentParticipant.findMany({
    where: { sessionId: participant.sessionId },
    select: { funName: true },
  })
  const nameSet = new Set(existingNames.map((p) => p.funName))
  const newName = generateFunName(nameSet)

  const updated = await prisma.studentParticipant.update({
    where: { id: participantId },
    data: { funName: newName, rerollUsed: true },
  })

  return { participant: updated }
}
```

### Server Action: Generate Recovery Code

```typescript
// actions/student.ts (continued)

export async function getRecoveryCode(participantId: string) {
  const participant = await prisma.studentParticipant.findUnique({
    where: { id: participantId },
  })

  if (!participant) return { error: 'Participant not found' }

  // Generate recovery code on first request, return existing otherwise
  if (participant.recoveryCode) {
    return { recoveryCode: participant.recoveryCode }
  }

  // 8-character alphanumeric, uppercase for easy reading/typing
  const recoveryCode = nanoid(8).toUpperCase()

  await prisma.studentParticipant.update({
    where: { id: participantId },
    data: { recoveryCode },
  })

  return { recoveryCode }
}
```

### QR Code Display Component

```typescript
// components/teacher/qr-code-display.tsx
'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface QRCodeDisplayProps {
  code: string
  baseUrl: string
}

export function QRCodeDisplay({ code, baseUrl }: QRCodeDisplayProps) {
  const [visible, setVisible] = useState(false)
  const joinUrl = `${baseUrl}/join/${code}`

  return (
    <div>
      <Button
        variant="outline"
        onClick={() => setVisible(!visible)}
      >
        {visible ? 'Hide QR Code' : 'Show QR Code'}
      </Button>
      {visible && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <QRCodeSVG value={joinUrl} size={200} level="M" />
          <p className="text-sm text-muted-foreground">{joinUrl}</p>
        </div>
      )}
    </div>
  )
}
```

### Supabase Realtime Presence for Connection Tracking

```typescript
// hooks/use-student-session.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PresenceState {
  funName: string
  joinedAt: string
}

export function useSessionPresence(sessionId: string, funName: string) {
  const [connectedStudents, setConnectedStudents] = useState<PresenceState[]>([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel(`session:${sessionId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>()
        const students = Object.values(state).flat()
        setConnectedStudents(students)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ funName, joinedAt: new Date().toISOString() })
        }
      })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [sessionId, funName, supabase])

  return {
    connectedStudents,
    connectedCount: connectedStudents.length,
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cookie-only identity tracking | Composite: localStorage + fingerprint + recovery code | Ongoing evolution | Resilience against storage clearing, identical hardware, device switching |
| FingerprintJS v3-v4 | FingerprintJS v5 (Oct 2025) | v5.0.1, Oct 2025 | Updated signals, MIT license, improved browser coverage |
| Custom WebSocket servers for real-time | Supabase Realtime (Presence + Broadcast + Postgres Changes) | Supabase 2024-2025 | No infrastructure to manage, CRDT-based state, automatic disconnect handling |
| Canvas fingerprint only | Canvas + WebGL + audio + fonts composite (DrawnApart 2022) | 2022 | GPU-level manufacturing differences provide 67% longer tracking duration |
| `middleware.ts` auth gating | `proxy.ts` with public route exclusion | Next.js 16 (Dec 2025) | Must update proxy to exclude student routes |

**Deprecated/outdated:**
- **FingerprintJS v3/v4:** Use v5 (latest). Breaking API changes from v3.
- **`@supabase/auth-helpers-nextjs`:** Already replaced in Phase 1 with `@supabase/ssr`.
- **Custom WebSocket solutions:** Supabase Realtime eliminates the need for standalone WebSocket servers.

## Open Questions

1. **Chromebook Chrome Profile Isolation**
   - What we know: On Chromebooks, each student signs in with their Google account, which creates a separate Chrome profile with its own localStorage/cookies. This means localStorage UUID should work even on shared physical devices.
   - What's unclear: Whether some schools use a single shared Chrome profile (e.g., "student" account) for all students on a device, which would break localStorage isolation.
   - Recommendation: Proceed with localStorage as primary identifier. The fingerprint secondary layer + recovery code tertiary layer handle the edge case. Flag this for real-world validation during testing.

2. **Supabase Realtime Presence Limits**
   - What we know: Supabase Presence uses CRDTs for state synchronization. The free tier has limits on concurrent connections.
   - What's unclear: The exact concurrent connection limit per channel on the Supabase free tier and whether a classroom of 30-40 students approaches it.
   - Recommendation: Check Supabase pricing tier limits before deployment. For development, the free tier should be sufficient. Document that the teacher's Supabase plan may need upgrading for large classes.

3. **Item-Level Codes (Bracket/Poll Direct Links)**
   - What we know: CONTEXT.md mentions two levels of codes -- class code (joins session) and item code (goes directly to a specific bracket/poll). Phase 2 focuses on class codes.
   - What's unclear: Whether item-level codes should be implemented in Phase 2 or deferred to Phase 4/5 when brackets and polls exist.
   - Recommendation: Build the code infrastructure to support both code types (add a `type` field: 'class' | 'item'), but only implement class codes in Phase 2. Item codes will be activated when brackets/polls are built.

4. **FingerprintJS License Status**
   - What we know: The GitHub README says MIT license. One search result mentioned BSL (Business Source License) which prohibits production use.
   - What's unclear: Whether recent versions changed the license.
   - Recommendation: Verify the LICENSE file in the npm package before production deployment. The GitHub repo currently shows MIT. If license is BSL, ThumbmarkJS (MIT confirmed) is the fallback option.

5. **Recovery Code UX and Security**
   - What we know: Students can access a recovery code in their session settings to restore identity on a new device.
   - What's unclear: How to prevent students from sharing recovery codes to impersonate each other.
   - Recommendation: Recovery codes should be single-use (consumed on claim). After using a recovery code, generate a new one. This prevents sharing while allowing legitimate device switches.

## Sources

### Primary (HIGH confidence)

- [Supabase Realtime Presence Docs](https://supabase.com/docs/guides/realtime/presence) -- Presence API, track/untrack, sync/join/leave events
- [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) -- Client-side subscription patterns, useEffect cleanup
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) -- INSERT/UPDATE/DELETE subscriptions, RLS integration
- [FingerprintJS GitHub Repository](https://github.com/fingerprintjs/fingerprintjs) -- v5.0.1, MIT license, API: load() + get() + visitorId
- [qrcode.react GitHub Repository](https://github.com/zpao/qrcode.react) -- QRCodeSVG/QRCodeCanvas components, size/level/color props
- [nanoid GitHub Repository](https://github.com/ai/nanoid) -- v5.x, 118 bytes, crypto.getRandomValues, custom alphabets
- [Next.js Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) -- Parenthesized folders, layout isolation
- [Prisma Models Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/models) -- @@unique, @@index, @relation, @map patterns

### Secondary (MEDIUM confidence)

- [Canvas Fingerprinting Wikipedia](https://en.wikipedia.org/wiki/Canvas_fingerprinting) -- DrawnApart 2022 research, collision rates, entropy analysis
- [Browserless Device Fingerprinting Guide](https://www.browserless.io/blog/device-fingerprinting) -- Composite signal strategies, behavioral fingerprinting
- [Supabase Realtime Broadcast and Presence Authorization](https://dev.to/supabase/supabase-realtime-broadcast-and-presence-authorization-2ik) -- RLS policies for Realtime channels
- [ThumbmarkJS GitHub Repository](https://github.com/thumbmarkjs/thumbmarkjs) -- Alternative fingerprinting library, MIT license, ~80% accuracy

### Tertiary (LOW confidence)

- [BrowScan Device Fingerprinting Guide](https://blog.browserscan.net/docs/device-fingerprinting-guide) -- General fingerprinting overview, 2026 landscape
- [Cloudwards Browser Fingerprinting Protection](https://www.cloudwards.net/browser-fingerprinting-protection/) -- Anti-fingerprinting measures in modern browsers
- [Coronium Browser Fingerprint Detection Guide](https://www.coronium.io/blog/browser-fingerprint-detection-guide) -- 80-90% accuracy claim in controlled environments

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - FingerprintJS verified on GitHub (v5, MIT), qrcode.react active on npm, nanoid widely used, Supabase Realtime in official docs
- Architecture: HIGH - Composite identity pattern, route groups, Prisma schema patterns all follow established Next.js / Supabase conventions
- Fingerprinting on identical hardware: MEDIUM - Studies confirm collision issue but exact rates vary; composite strategy is the accepted mitigation; real-world validation needed
- Fun name generation: HIGH - Custom word lists with alliteration filtering is straightforward; uniqueness enforcement via Set + database constraint
- Pitfalls: MEDIUM - Identified from search results and architecture analysis; some (like Postgres Changes scaling) from Supabase's own documentation; school IT policy effects are context-dependent

**Research date:** 2026-01-29
**Valid until:** 2026-03-01 (30 days -- FingerprintJS may release updates; Supabase Realtime pricing may change; verify before production deployment)
