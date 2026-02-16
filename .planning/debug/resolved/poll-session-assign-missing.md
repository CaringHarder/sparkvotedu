---
status: diagnosed
trigger: "No UI to assign a poll to a session"
created: 2026-01-31T00:00:00Z
updated: 2026-01-31T00:08:30Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: UI component for assigning polls to sessions was never implemented, despite server action existing
test: Compare bracket-to-session assignment UI pattern with poll equivalent
expecting: Bracket detail pages have session assignment UI; poll detail pages don't
next_action: Read assignPollToSession action signature, then check bracket assignment pattern

## Symptoms

expected: Teacher should be able to assign a poll to a class session from the UI so students can see polls in their session activity grid
actual: No UI exists to trigger the assignPollToSession server action
errors: None
reproduction: Navigate to poll detail page - no "Assign to Session" functionality visible
started: Feature never implemented (server action exists from 05-02 but UI was not built)

## Eliminated

## Evidence

- timestamp: 2026-01-31T00:01:00Z
  checked: src/actions/poll.ts lines 201-246
  found: assignPollToSession server action exists with signature { pollId: string.uuid, sessionId: string.uuid }
  implication: Backend logic is complete and ready to use

- timestamp: 2026-01-31T00:02:00Z
  checked: src/actions/bracket.ts lines 147-202
  found: assignBracketToSession has identical signature pattern { bracketId: string.uuid, sessionId: string.uuid.nullable }
  implication: Bracket allows nullable sessionId for unlink; poll action should too

- timestamp: 2026-01-31T00:03:00Z
  checked: src/components/bracket/bracket-detail.tsx lines 108-151 (desktop) and 192-234 (mobile)
  found: Bracket detail page has Session assignment UI in sidebar - select dropdown with sessions, "No session" option, Unlink button, Link/Unlink icons
  implication: This is the exact UI pattern that should be replicated for polls

- timestamp: 2026-01-31T00:04:00Z
  checked: src/app/(dashboard)/polls/[pollId]/page.tsx
  found: Poll detail page fetches poll data (including sessionId) but passes no session list to PollDetailView
  implication: Page doesn't fetch active sessions to populate dropdown

- timestamp: 2026-01-31T00:05:00Z
  checked: src/components/poll/poll-detail-view.tsx entire file
  found: No session assignment UI exists - has status controls, duplicate, delete, edit, but no session dropdown/link controls
  implication: The UI component was never built despite the server action existing

- timestamp: 2026-01-31T00:06:00Z
  checked: Bracket detail architecture
  found: BracketDetail receives sessions prop (SessionInfo[]) from page.tsx, uses assignBracketToSession action, maintains currentSessionId state, handles link/unlink with transitions
  implication: Need to replicate this pattern: fetch sessions in poll page.tsx, pass to PollDetailView, add session assignment UI section

- timestamp: 2026-01-31T00:07:00Z
  checked: src/app/(dashboard)/brackets/[bracketId]/page.tsx lines 27-38
  found: Bracket page fetches active sessions with prisma.classSession.findMany({ where: { teacherId, status: 'active' }, select: { id, code, createdAt }, orderBy: { createdAt: 'desc' } })
  implication: Poll page needs identical query to populate session dropdown

- timestamp: 2026-01-31T00:08:00Z
  checked: Comparison of assignBracketToSession (bracket.ts:156-159) vs assignPollToSession (poll.ts:202-205)
  found: Bracket schema allows sessionId: z.string().uuid().nullable() for unlink support; Poll schema only allows sessionId: z.string().uuid() (not nullable)
  implication: Poll action schema needs to be updated to allow null sessionId for unlinking polls from sessions

## Resolution

root_cause: Session assignment UI was never implemented for polls despite complete bracket equivalent existing. THREE specific gaps found:

1. **Missing UI component** - PollDetailView (src/components/poll/poll-detail-view.tsx) has no session assignment section. Bracket equivalent has session dropdown + link/unlink controls in lines 108-151 (desktop) and 192-234 (mobile).

2. **Missing session fetch** - Poll detail page (src/app/(dashboard)/polls/[pollId]/page.tsx) doesn't fetch active sessions to populate dropdown. Bracket page fetches them with: prisma.classSession.findMany({ where: { teacherId, status: 'active' }, select: { id, code, createdAt }, orderBy: { createdAt: 'desc' } })

3. **Schema mismatch** - assignPollToSession schema (src/actions/poll.ts:202-205) only accepts non-null sessionId. Bracket schema allows .nullable() for unlink support (src/actions/bracket.ts:158). Poll action cannot handle unlinking.

fix: (diagnosis only - no fix applied)
verification: (diagnosis only - no fix applied)
files_changed: []
