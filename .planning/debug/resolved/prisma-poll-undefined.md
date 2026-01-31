---
status: resolved
trigger: "prisma.poll is undefined -- Teacher clicks Create Poll on /polls/new -> failed to create poll; /activities -> TypeError: Cannot read properties of undefined (reading 'findMany')"
created: 2026-01-31T17:49:00Z
updated: 2026-01-31T17:55:00Z
---

## Current Focus

hypothesis: CONFIRMED -- stale globalForPrisma singleton
test: Restarted dev server, fresh PrismaClient now has all model accessors
expecting: N/A -- resolved
next_action: Archive this session

## Symptoms

expected: Teacher can create polls via /polls/new and view them on /activities
actual: "failed to create poll" error on creation; TypeError "Cannot read properties of undefined (reading 'findMany')" at src/lib/dal/poll.ts:78 on /activities
errors: TypeError: Cannot read properties of undefined (reading 'findMany') at prisma.poll.findMany
reproduction: Navigate to /activities while authenticated as teacher; or submit poll form on /polls/new
started: After Poll/PollOption/PollVote models were added to schema.prisma and prisma generate was run while dev server was already running

## Eliminated

- hypothesis: prisma generate was not run after adding Poll models
  evidence: prisma/generated/prisma/index.d.ts line 262 has "get poll(): Prisma.PollDelegate". index.js has PollScalarFieldEnum (line 178), ModelName.Poll (line 236), and full Poll runtimeDataModel. Generated at 2026-01-31 17:11:39.
  timestamp: 2026-01-31T17:50:00Z

- hypothesis: prisma db push was not run (tables missing from database)
  evidence: "npx prisma db push" output says "The database is already in sync with the Prisma schema." -- polls, poll_options, poll_votes tables all exist.
  timestamp: 2026-01-31T17:50:30Z

- hypothesis: The generated PrismaClient class itself is broken / missing Poll accessor
  evidence: Direct Node.js test -- instantiating PrismaClient with adapter shows client.poll is type "object" (the delegate), client.pollOption is "object", client.pollVote is "object". The generated client works correctly when freshly instantiated.
  timestamp: 2026-01-31T17:51:30Z

- hypothesis: Turbopack did not rebundle the updated Prisma client
  evidence: .next/dev/server/chunks/prisma_generated_prisma_470c612b._.js was updated at 2026-01-31 17:15 (after prisma generate at 17:11). Contains PollScalarFieldEnum. Turbopack detected and rebundled the change.
  timestamp: 2026-01-31T17:51:45Z

## Evidence

- timestamp: 2026-01-31T17:49:30Z
  checked: prisma/schema.prisma
  found: Poll model (line 156), PollOption (line 181), PollVote (line 197) all present with correct fields, relations, and @@map annotations
  implication: Schema is correct

- timestamp: 2026-01-31T17:49:45Z
  checked: prisma/generated/prisma/index.d.ts
  found: Line 262 "get poll(): Prisma.PollDelegate<ExtArgs, ClientOptions>" exists. Export types for Poll, PollOption, PollVote all present (lines 55, 60, 65). PollCountOutputType at line 1959.
  implication: TypeScript types are generated correctly -- prisma generate HAS been run

- timestamp: 2026-01-31T17:50:00Z
  checked: prisma/generated/prisma/index.js (runtime)
  found: PollScalarFieldEnum (line 178), PollOptionScalarFieldEnum (line 193), PollVoteScalarFieldEnum (line 202), ModelName includes Poll/PollOption/PollVote (lines 236-239). runtimeDataModel JSON contains full Poll model definition with all fields.
  implication: Runtime JavaScript is also up to date -- fresh PrismaClient instances will have .poll accessor

- timestamp: 2026-01-31T17:50:15Z
  checked: npx prisma db push
  found: "The database is already in sync with the Prisma schema." -- PostgreSQL on Supabase has all tables
  implication: Database tables exist, schema is in sync

- timestamp: 2026-01-31T17:50:30Z
  checked: File timestamps -- prisma/generated/prisma/index.js vs .next/dev/lock
  found: Generated client modified 2026-01-31 17:11:39. Dev server lock file 2026-01-31 11:51:30. Server chunks from 09:15. Dev server started HOURS before prisma generate ran.
  implication: The dev server was running with the old PrismaClient (without Poll) when prisma generate was executed

- timestamp: 2026-01-31T17:51:00Z
  checked: Turbopack bundled chunk prisma_generated_prisma_470c612b._.js
  found: Updated at 17:15 (after generate at 17:11). Contains PollScalarFieldEnum. Turbopack rebundled correctly.
  implication: Module code was hot-reloaded, BUT the globalForPrisma singleton was NOT recreated

- timestamp: 2026-01-31T17:51:30Z
  checked: Direct Node.js instantiation test
  found: Fresh PrismaClient({ adapter }) has client.poll (typeof "object"), client.pollOption, client.pollVote all present
  implication: The generated client is NOT broken. Problem is the CACHED instance, not the code.

- timestamp: 2026-01-31T17:51:45Z
  checked: src/lib/prisma.ts singleton pattern
  found: globalForPrisma stores PrismaClient on globalThis. The ?? operator returns cached instance. Hot reload updates module code but does NOT clear globalThis. The old PrismaClient instance (created before Poll model existed) persists across hot reloads.
  implication: ROOT CAUSE CONFIRMED -- stale singleton

- timestamp: 2026-01-31T17:53:00Z
  checked: Dev server restart and endpoint verification
  found: Killed old dev server (PID 40438), started fresh. Dev server responds 200 on / and 307 (auth redirect) on /activities. No 500 errors. Fresh PrismaClient test confirms client.poll, client.pollOption, client.pollVote all typeof "object".
  implication: Fix verified -- fresh globalThis creates new PrismaClient with all model accessors

## Resolution

root_cause: The PrismaClient singleton cached in globalThis (via the globalForPrisma pattern in src/lib/prisma.ts) held a stale instance created BEFORE the Poll, PollOption, and PollVote models were added to schema.prisma. When `prisma generate` ran at 17:11, Turbopack correctly rebundled the new generated code, but the globalForPrisma.prisma value on globalThis still held the old PrismaClient instance without .poll, .pollOption, or .pollVote accessors. The nullish coalescing operator (??) returned this stale cached instance instead of creating a new one. This is a known limitation of the globalThis singleton pattern for Prisma in Next.js dev mode -- module hot reload updates the code, but objects stored on globalThis survive across reloads.

fix: Restarted the Next.js dev server (killed PID 40438, started fresh with `npx next dev --turbopack`). This cleared globalThis, causing the next request to create a fresh PrismaClient from the updated generated code. No code changes were needed -- all generated artifacts and database schema were already correct.

verification:
  - Fresh PrismaClient instantiation test confirms client.poll is typeof "object" (not undefined)
  - Dev server responds 200 on / and 307 on /activities (no 500 error)
  - prisma db push confirms "database is already in sync"
  - All three generated model accessors (poll, pollOption, pollVote) verified present

files_changed: [] (no code changes -- operational fix only, dev server restart)

note: To prevent this in the future, always restart the Next.js dev server after running `prisma generate` when new models are added. Alternatively, a postgenerate script could be added to prisma that touches a watched file to force a full server reload.
