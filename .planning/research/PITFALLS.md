# Pitfalls Research

**Domain:** Student identity redesign -- fun name + emoji, localStorage persistence, cross-device reclaim, migration
**Researched:** 2026-03-08
**Confidence:** HIGH (all pitfalls grounded in direct codebase analysis of existing identity system, schema, and school device constraints)

---

## Critical Pitfalls

### Pitfall 1: Ephemeral Mode Silently Destroys localStorage on School Chromebooks

**What goes wrong:**
School IT admins enable Chrome's Ephemeral Mode (`DeviceEphemeralUsersEnabled`) or Managed Guest Sessions through the Google Admin console. When active, the Chrome profile is deleted when the browser closes. All localStorage, sessionStorage, cookies, and cached data are permanently wiped. The student reopens their Chromebook, enters the same session code, and is treated as a brand-new participant. Their fun name, emoji, vote history, and predictions are orphaned in the database under a now-unreachable deviceId.

This is not hypothetical. FCPS and many K-12 districts use ephemeral mode on shared Chromebook carts and testing devices. The current `getOrCreateDeviceId()` in `src/lib/student/session-identity.ts` generates a new UUID every time localStorage is empty, making the deviceId identity layer completely useless on those devices.

Even without ephemeral mode, Chrome's "Clear browsing data on exit" setting (controllable via admin policy `BrowsingDataLifetime`) can wipe localStorage on a schedule. IT departments routinely configure this for compliance.

**Why it happens:**
Developers test on personal Chrome profiles where localStorage persists indefinitely. School-managed Chromebooks have policies invisible to web developers. There is no browser API to detect whether ephemeral mode is active or whether localStorage will survive a browser restart.

**How to avoid:**
- Treat localStorage as an unreliable convenience cache, never as a durable identity store. The current `session-store.ts` (sessionStorage-based, per-tab) is already correct in treating storage as ephemeral per-tab state. The new identity system must follow the same philosophy.
- The primary identity reclaim mechanism must be server-side: first name + last initial matching against the `student_participants` table. This survives any client-side storage wipe.
- When localStorage has a deviceId, use it as a fast-path shortcut (skip the name entry form, go straight to the session). When it does not, fall back gracefully to the name entry flow without any error message or "something went wrong" state.
- Do not show a "device not recognized" warning. On ephemeral Chromebooks, this would appear every single session and train students to ignore it.

**Warning signs:**
- QA testing only on personal Chrome profiles, never on a managed Chromebook
- Identity reclaim tests that only cover "same device, same browser" scenarios
- No test scenario for "student closes Chromebook lid, reopens 10 minutes later, localStorage is gone"
- Error handling that treats missing localStorage as an exceptional case rather than a normal one

**Phase to address:**
Identity architecture phase (first phase). The entire storage strategy must assume localStorage is unreliable from day one. Every feature built on top inherits this assumption.

---

### Pitfall 2: Emoji Stored as Raw Unicode Creates Cross-Platform Rendering Inconsistencies and Database Issues

**What goes wrong:**
A student selects a rocket emoji on a Chromebook (Noto Color Emoji font). The database stores the raw Unicode `U+1F680`. A teacher views the participant list on an iPad (Apple Color Emoji) -- the rocket looks different but renders. An older Chromebook running ChromeOS 100 (2022) shows the rocket fine. But a student selects a newer emoji from Unicode 15.1 (2023) -- on older devices, it renders as a blank rectangle ("tofu").

Worse: some emoji are multi-codepoint sequences. Family emoji, flag sequences, and skin-tone variations consist of 2-7 Unicode codepoints joined by Zero-Width Joiners (ZWJ). In JavaScript, `"family_emoji".length` can return 7+ due to surrogate pairs. PostgreSQL's `VARCHAR(10)` counts characters differently than JavaScript's `.length`. The `@@unique([sessionId, funName])` constraint could fail or behave unexpectedly if emoji are concatenated into the fun name string.

Additionally, the same visible emoji can be encoded differently across platforms: base character vs. base + variation selector (U+FE0F). String equality checks fail even though the emoji looks identical to the user.

**Why it happens:**
Developers treat emoji as single characters. They pick emoji from their own device's picker, store whatever the browser gives them, and never test on a different platform. JavaScript string operations on emoji are notoriously unintuitive (`"star_emoji".length === 2`, not 1).

**How to avoid:**
- Store emoji as shortcodes or enum values (e.g., `"rocket"`, `"star"`, `"fox_face"`) in the database, not raw Unicode. Use a mapping table on the client to render: `EMOJI_MAP["rocket"] = "\u{1F680}"`.
- Use a curated set of 30-50 emoji restricted to Unicode 13.0 (2020) or earlier. This guarantees rendering on ChromeOS 100+, iOS 15+, Android 12+, and Windows 10 21H2+. No ZWJ sequences, no skin tone modifiers, no flag sequences.
- Store the emoji column as `@db.VarChar(20)` for the shortcode string, not raw Unicode.
- Keep emoji separate from `funName` in the schema. The fun name remains "Daring Dragon" (text only). Emoji is a separate column. This preserves the existing `@@unique([sessionId, funName])` constraint without emoji encoding complications.
- Test every emoji in the curated set on: ChromeOS (Noto Color Emoji), iOS/iPadOS (Apple Color Emoji), Android (Google Noto Emoji), Windows (Segoe UI Emoji), and Firefox on all platforms (uses platform fonts).

**Warning signs:**
- Emoji stored as raw Unicode text in a `VARCHAR` column without normalization
- Fun name uniqueness constraint that includes emoji in the concatenated string
- No cross-platform rendering test matrix
- Emoji picker showing the full Unicode 15.1 set instead of a curated subset
- JavaScript `.length` checks on emoji strings

**Phase to address:**
Schema design phase (first implementation phase). The emoji storage format must be decided before any data is written. Changing storage format after the first migration requires a second migration.

---

### Pitfall 3: Migration Adds NOT NULL Columns and Fails on Live Database with Existing Participants

**What goes wrong:**
The current `student_participants` table has existing rows with `fun_name` (alliterative "Adjective Animal"), `first_name`, `device_id`, and `fingerprint`. The redesign adds new columns: `emoji` (shortcode), `last_initial`, and possibly `avatar_emoji`. If these are added as `NOT NULL` without defaults, `prisma migrate deploy` fails on the production database because existing rows have no value for these columns.

If added with `@default("")`, the migration succeeds but creates empty strings that break UI rendering. An empty emoji shortcode resolves to nothing in the mapping table. The teacher dashboard shows "Daring Dragon " with a trailing space where the emoji should be. The participant list looks broken for all existing students until they rejoin and select an emoji.

The more insidious version: migration succeeds with defaults, but the application code assumes all participants have valid emoji. A `EMOJI_MAP[participant.emoji]` lookup on an empty string returns `undefined`, rendered as the literal string "undefined" in React.

**Why it happens:**
The expand-and-contract migration pattern is well-documented but easy to skip under deadline pressure. Developers add `NOT NULL` columns with `@default("")` in Prisma, which satisfies the migration tool but creates data integrity problems. On Supabase PostgreSQL, `ALTER TABLE ADD COLUMN ... NOT NULL` without a server-side default also takes an exclusive table lock for the rewrite, blocking all writes during the migration.

**How to avoid:**
- Use the expand-and-contract pattern per Prisma's official guidance:
  1. Add columns as nullable (`String?`) with no default
  2. Deploy code that writes new format for new participants, reads nullable columns gracefully
  3. Run a backfill script that assigns emoji and last_initial to existing participants
  4. Deploy code that treats columns as required
  5. Add `NOT NULL` constraint in a final migration
- For the `emoji` column: add as `@db.VarChar(20)` nullable. Backfill existing participants with a deterministic emoji (hash `participantId` to index into the curated emoji set). Then add `NOT NULL`.
- For `lastInitial`: keep nullable permanently. Existing participants genuinely do not have a last initial. The app should handle null gracefully (show fun name only, prompt for last initial on next rejoin).
- Run the backfill as a separate Node.js script using Prisma Client, not inside the Prisma migration SQL. Prisma migrations are DDL-only by convention; mixing DML risks transaction timeouts.
- Test the migration against a snapshot of production data, not just an empty dev database.
- Schedule migrations during low-usage windows (before 8am ET or after 3pm ET).

**Warning signs:**
- `@default("")` on string columns intended for display
- Schema migration PR without a corresponding data migration script
- Tests that only run against a fresh database with no existing participants
- `prisma migrate dev` succeeds locally but `prisma migrate deploy` has not been tested against production-like data
- Migration and code deploy in the same Vercel build step without considering the "old code + new schema" transition window

**Phase to address:**
Schema migration phase (must be the first implementation phase). Must deploy before any application code references the new columns.

---

### Pitfall 4: Cross-Device Name Matching Creates False Identity Claims in Common-Name Classrooms

**What goes wrong:**
The new identity reclaim uses first name + last initial to match a returning student. In a classroom of 30 students, name collisions are common: two students named "Emma S" are indistinguishable by name alone. The system either (a) auto-claims the wrong identity for one Emma, silently giving her the other Emma's vote history and fun name, or (b) shows both Emmas in a disambiguation list but they cannot tell which is theirs.

The current disambiguation in `name-disambiguation.tsx` shows fun names ("Daring Dragon") as identifiers -- this works because students remember their fun name. But if the redesign changes fun names during migration, students who remember "Daring Dragon" may not recognize their new identity in the list. The gap between "what the student remembers" and "what the system shows" causes confusion and wrong claims.

Additionally, young students (K-2) may not know their last initial, or may type a random character when prompted. "Last initial" is an adult concept that does not translate well to a 6-year-old.

**Why it happens:**
First name + single last initial has low entropy. In a US classroom of 30, roughly 15-20% of sessions will have at least one collision (two students with same first name and last initial). Developers test with 5 unique names and never encounter this. The current codebase already handles name collisions via the disambiguation flow, but the new identity model must not regress this.

**How to avoid:**
- Never auto-claim identity on a single match. Even if there is exactly one "Emma S" in the session, show the confirmation screen. The current `claimIdentity` action requires explicit selection -- maintain this pattern.
- Keep existing fun names immutable during migration. Do not change "Daring Dragon" to something else. Emoji is additive: "Daring Dragon + rocket_emoji" on rejoin. Students who remember "Daring Dragon" can still find themselves.
- In the disambiguation UI, show the fun name as the primary identifier (large, bold), not the emoji. Emoji is secondary/decorative. Legacy participants without emoji show fun name only.
- For the "last initial" prompt: label the field "First letter of your last name" not "Last initial." Use a single-character input (`maxLength={1}`), auto-uppercase. Show an example: "If your name is Emma Smith, type S." On mobile, use `inputMode="text"` with auto-capitalization.
- Allow last initial to be optional in the matching. If a student enters just their first name (no last initial), show all matching participants for disambiguation. The last initial narrows the list but is not required.
- Consider allowing 2 characters for last initial (to handle hyphenated last names like "Smith-Jones" -> "SJ") as mentioned in the project context.

**Warning signs:**
- Auto-claiming identity when first name + last initial has exactly one match (skipping confirmation)
- Test data with no duplicate first names
- Fun names changing during migration (breaking student memory)
- Disambiguation UI that only shows emoji, not the alliterative fun name
- "Last initial" input that accepts more than 2 characters or doesn't auto-uppercase
- No test scenario with two students sharing the same first name and last initial

**Phase to address:**
Join flow redesign phase. The matching logic and disambiguation UI are the core of the identity reclaim experience. Must be designed with collision cases as primary test scenarios, not edge cases.

---

### Pitfall 5: FingerprintJS Removal Leaves Dead Code Across Three Layers

**What goes wrong:**
FingerprintJS (`@fingerprintjs/fingerprintjs@^5.0.1` in `package.json`) is woven through three application layers:

1. **Client hook:** `src/hooks/use-device-identity.ts` imports `getBrowserFingerprint` from `src/lib/student/fingerprint.ts`
2. **Server actions:** `src/actions/student.ts` accepts `fingerprint` parameter in `joinSession`, passes to `createParticipant` and `findParticipantByFingerprint`
3. **DAL:** `src/lib/dal/student-session.ts` has `findParticipantByFingerprint()` function and `createParticipant` writes `fingerprint` to DB
4. **Schema:** `prisma/schema.prisma` has `fingerprint String?` column with `@@index([sessionId, fingerprint])`
5. **Types:** `src/types/student.ts` has `DeviceIdentity.fingerprint` field

Missing any one reference creates a build error (TypeScript import) or silent runtime waste (unused database column and index consuming write I/O). The `@@index([sessionId, fingerprint])` adds overhead to every `INSERT` and `UPDATE` on `student_participants` for zero benefit after removal.

A grep for `fingerprint` across the codebase returns 44 files (including planning docs). The application code references are in 6 files, but the planning doc references will cause confusion if not cleaned up.

**Why it happens:**
FingerprintJS was integrated as a "second layer" of identity (after localStorage UUID). It touches every layer of the identity stack. Developers remove the package and the obvious `fingerprint.ts` file but miss the DAL function, the schema column, the index, or the type definition. TypeScript catches import errors but not unused database columns or orphaned indexes.

**How to avoid:**
- Remove in a specific order to avoid the "old code + new schema" problem:
  1. Remove application code first (safe because fingerprint is nullable and already fails gracefully): delete `fingerprint.ts`, update `use-device-identity.ts` to not call it, remove fingerprint parameter from server actions and DAL
  2. Deploy the code change. The fingerprint column still exists but is never written to or read.
  3. In a subsequent migration: drop the `fingerprint` column and `@@index([sessionId, fingerprint])`
  4. `npm uninstall @fingerprintjs/fingerprintjs`
  5. Verify: `npm ls @fingerprintjs/fingerprintjs` returns empty, `grep -r "fingerprint" src/` shows no application code hits
- Update `DeviceIdentity` type in `src/types/student.ts` -- remove `fingerprint` field. Or replace the entire type if the hook is also being removed.
- Check `package-lock.json` for transitive dependencies that might pull FingerprintJS back in.

**Warning signs:**
- `npm ls @fingerprintjs/fingerprintjs` still shows the package after "removal"
- `fingerprint` column still in `schema.prisma` after code changes
- `findParticipantByFingerprint` function still exists in DAL
- Build succeeds but the `getBrowserFingerprint()` function silently returns empty string and does nothing
- Bundle size analysis still shows FingerprintJS (~150KB+ client-side)

**Phase to address:**
Cleanup phase, before or alongside the schema migration. Application code removal can be combined with the first deploy. Column/index removal goes in the same migration that adds the new emoji/lastInitial columns.

---

### Pitfall 6: sessionStorage Identity Lost on Tab Close Creates Duplicate Participants

**What goes wrong:**
The current `session-store.ts` uses `sessionStorage` (per-tab, survives refresh, dies on tab close). If a student accidentally closes the tab, reopens the app, and navigates back to the session URL, their `sessionStorage` is gone. They enter their name, the system finds no match in `sessionStorage`, and routes them through the full join flow. If the student's name has no collision in the database, a new participant is created -- now there are two database records for the same physical student, one orphaned with the old fun name and one new.

On iPads, Safari aggressively kills background tabs. The student switches to another app for 30 seconds, returns, and the tab has been unloaded. While `sessionStorage` survives soft tab unloads on most platforms, iOS Safari's behavior varies across versions, and teachers report students losing their session.

**Why it happens:**
`sessionStorage` was chosen to solve the multi-tab identity bleeding bug where `localStorage` caused all tabs to share the same student identity. The fix was correct for that bug but introduced fragility: tab close = identity loss = potential duplicate participant. The system has no way to connect "Emma S who was Daring Dragon" (old tab) with "Emma S who just joined as Mighty Moose" (new tab) unless the student remembers to use the disambiguation flow.

**How to avoid:**
- Keep `sessionStorage` as the fast per-tab identity cache (solves multi-tab bleeding).
- Add a `localStorage` fallback keyed by sessionId: when `sessionStorage` has no entry for a session, check `localStorage[sparkvotedu_identity_{sessionId}]` before showing the join form. Write to both on successful join. This is safe from the multi-tab bleeding bug because each tab reads `sessionStorage` first; `localStorage` is only checked when `sessionStorage` is empty (tab was closed).
- On ephemeral Chromebooks where localStorage also gets wiped: the name-based reclaim flow handles this. The `localStorage` fallback only helps on non-ephemeral devices where the tab was closed but the browser stayed open.
- In the join flow, when a student enters a name that matches an existing participant, show the disambiguation prompt immediately (current behavior via `name-disambiguation.tsx`). This catches the duplicate participant case even when storage-based shortcuts fail.
- Consider writing a short-lived cookie (expires in 24 hours) with the participant's sessionId + participantId. Cookies survive tab close and can be read in Next.js middleware for auto-redirect.

**Warning signs:**
- Test scenarios that only cover "same tab, refresh" and never "close tab, reopen"
- iPad testing that keeps the app in foreground for the entire session
- No `localStorage` fallback check in the session page load logic
- Duplicate participant records in the database for the same physical student (same firstName, different funName, same sessionId)

**Phase to address:**
Join flow redesign phase. The storage strategy (sessionStorage primary + localStorage fallback + cookie) must be decided as part of the identity architecture.

---

### Pitfall 7: Existing Fun Names Change During Migration, Breaking Student Recognition

**What goes wrong:**
The redesign introduces fun name + emoji as the new identity format. A developer decides to regenerate fun names during migration to include emoji in the name itself (e.g., "Daring Dragon" becomes "Rocket Daring Dragon"). Now every existing student's identity anchor -- the fun name they remember from last class -- is gone. When "Emma S" rejoins and sees the disambiguation list, none of the fun names match what she remembers. She picks "I'm new" instead, creating a duplicate.

Even a subtle change -- like normalizing capitalization, adding emoji prefix, or changing the name generator algorithm -- breaks recognition. Students in K-12 attach strongly to their fun names. "I'm Mighty Moose!" is part of the classroom experience.

**Why it happens:**
Developers treat fun names as data, not as identity anchors. During a schema redesign, it feels natural to "clean up" or "upgrade" existing data. But fun names are the one thing students remember across sessions (they do not remember UUIDs, device IDs, or recovery codes).

**How to avoid:**
- Existing fun names are immutable during and after migration. The migration must not modify the `fun_name` column for any existing participant.
- Emoji is a separate column, additive to the fun name. Display format becomes "Daring Dragon [rocket_emoji]" not "[rocket_emoji] Daring Dragon" or a new combined name.
- New participants created after the redesign get fun names from the same generator (alliterative "Adjective Animal" from `src/lib/student/fun-names.ts`). Do not change the generator algorithm unless you are sure no existing students will rejoin.
- In the disambiguation UI, show the fun name as the primary text (large, bold) with emoji as a small decorative element beside it. Not the reverse.
- If the fun name format is changing for new participants (e.g., adding emoji to the name itself), existing participants must retain their old format until they explicitly choose a new one.

**Warning signs:**
- Migration script that includes `UPDATE student_participants SET fun_name = ...`
- Fun name generator algorithm change that produces different names from the same seed
- UI redesign that hides or de-emphasizes the alliterative fun name in favor of emoji
- Test data created fresh (no legacy participants) during development

**Phase to address:**
Schema migration phase. The migration script must explicitly preserve existing `fun_name` values. Add a verification query: `SELECT COUNT(*) FROM student_participants WHERE fun_name != original_fun_name` should return 0.

---

### Pitfall 8: Emoji Picker Shows Full Unicode Set, Causing Classroom Chaos

**What goes wrong:**
The developer implements an emoji picker that shows all available emoji (3,600+ in Unicode 15.1). Students spend 5 minutes scrolling through categories, searching for the "perfect" emoji. The teacher loses class time. Worse: students find emoji that are inappropriate for a classroom context (middle finger, eggplant, skull, alcohol-related emoji). Some emoji have ambiguous meanings that vary by culture and age group.

On school Chromebooks, the OS-level emoji picker (`Win+.` on Windows, `Ctrl+Cmd+Space` on macOS) may not be available or may be disabled by IT policy. If the app relies on the OS picker instead of a custom one, students on locked-down Chromebooks cannot select emoji at all.

**Why it happens:**
Building a custom emoji picker from scratch is tedious. Developers reach for a library (like `emoji-mart`) that shows the full Unicode set by default. Filtering requires explicit configuration. The "full picker" path is the path of least resistance.

**How to avoid:**
- Build a simple custom emoji grid, not a full picker. 20-30 curated, classroom-appropriate emoji displayed in a single flat grid. No categories, no search, no recents, no skin tones. One tap to select.
- Curate the list manually: animals (cat, dog, fox, bear, penguin, octopus), space (rocket, star, moon, sun), nature (tree, flower, mushroom, rainbow), food (pizza, taco, cookie), objects (lightning, fire, sparkles, crown, gem). Avoid anything with cultural ambiguity.
- Do not use the OS-level emoji picker. Many school Chromebooks have it disabled. A custom in-app grid ensures consistent behavior.
- Make emoji selection optional at join time. Assign a random emoji from the curated set as default. Students can change it once (similar to the existing reroll mechanic for fun names). This prevents analysis paralysis and keeps the join flow fast.
- Store selected emoji as a shortcode enum value server-side. The curated set IS the validation schema -- anything not in the set is rejected.

**Warning signs:**
- An `emoji-mart` or `emoji-picker-react` dependency in `package.json`
- Emoji picker component with categories, search bar, or skin tone selector
- No server-side validation of emoji input against a curated allowlist
- Emoji selection blocking the join flow (student cannot proceed without choosing)
- Reports of inappropriate emoji in the teacher's participant list

**Phase to address:**
Join flow redesign phase. The emoji picker UI and curated set are part of the join experience.

---

### Pitfall 9: Schema Migration Runs During Active Sessions, Causing Join Failures

**What goes wrong:**
`prisma migrate deploy` executes DDL statements on the production Supabase database. During the migration:
- `ALTER TABLE student_participants ADD COLUMN emoji VARCHAR(20)` takes a brief exclusive lock
- If a student is joining at that exact moment, the `createParticipant` INSERT fails with a lock timeout or "table definition has changed" error
- On Vercel, the old application code continues serving requests during build+deploy. The migration runs as part of the build step, creating a window where old code hits the new schema

For dropping the `fingerprint` column: `ALTER TABLE student_participants DROP COLUMN fingerprint` also takes an exclusive lock and causes any in-flight query referencing `fingerprint` to fail.

**Why it happens:**
Prisma migrations are synchronous DDL. On small tables (< 10K rows) the lock is held for milliseconds. But SparkVotEDU has active sessions during school hours. Even a 100ms lock during peak usage (30 students simultaneously joining) can cause 2-3 failures. The students see "Something went wrong" and the teacher calls IT support.

**How to avoid:**
- Schedule migrations during off-hours. SparkVotEDU's primary usage is 8am-3pm ET on school days. Run migrations before 7am ET or after 4pm ET, or on weekends.
- Always add columns as nullable with server-side defaults. `ALTER TABLE ADD COLUMN ... DEFAULT NULL` does not rewrite the table on PostgreSQL 11+ (which Supabase uses). It is effectively instant.
- Never combine additive migrations (add column) with destructive migrations (drop column, rename column) in the same migration file. Add first, deploy code, then drop in a later migration.
- Deploy application code that handles both old and new schema BEFORE running the migration. The code must read nullable columns gracefully and not crash if a new column does not exist yet.
- Use `prisma migrate diff` to preview the SQL before running `prisma migrate deploy`.
- For the fingerprint column drop: deploy code that no longer reads `fingerprint` first. Wait 24 hours for all Vercel edge function instances to pick up the new code. Then drop the column.

**Warning signs:**
- Migration SQL contains `ALTER TABLE ... ADD COLUMN ... NOT NULL` without `DEFAULT`
- Migration and code deploy in the same Vercel build step without a deployment gap
- Migration run during school hours without checking for active sessions
- Migration combines adding new columns and dropping old columns in one file
- No staging environment test of the migration against production-like data volume

**Phase to address:**
Schema migration phase (first implementation phase). Timing and ordering are as important as the SQL itself.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store raw emoji Unicode in VARCHAR column | No mapping table needed | Inconsistent rendering, broken equality checks, potential uniqueness issues, requires migration to fix | Never -- use shortcodes from day one |
| Keep FingerprintJS in `package.json` but stop calling it | Avoids package removal risk | ~150KB client bundle waste, security audit liability, confusing dead code | Only during a transitional deploy (max 1 week) |
| Auto-claim identity on single name+initial match | Faster join for returning students | Students accidentally claim wrong identity in same-name scenarios; no undo | Never -- always show confirmation |
| Default emoji to empty string `""` in migration | Migration succeeds without backfill script | Empty strings break emoji rendering, `EMOJI_MAP[""]` returns undefined, teacher sees broken UI | Never -- use null, not empty string |
| Skip `lastInitial` column, match on firstName only | Fewer schema changes, simpler matching | Same collision rate as current system; name disambiguation flow handles it but more friction | Acceptable if disambiguation UX is strong enough; the current codebase already does this |
| Use OS emoji picker instead of custom grid | No custom UI to build | Disabled on managed Chromebooks; inconsistent across platforms; no curation control | Never for primary flow -- OK as secondary "advanced" option |
| Combine fingerprint removal and emoji addition in one migration | One migration instead of two | If either change causes issues, cannot roll back independently | Acceptable if thoroughly tested against production snapshot |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Realtime broadcast payloads | Broadcasting participant data with new `emoji` field but old subscriber code ignores it or crashes on unexpected field | Version the payload: add emoji as optional. Old clients render without it. Deploy subscriber code before broadcaster code. |
| Prisma + Supabase PostgreSQL migration | Running `prisma migrate deploy` with `--force` flag or during school hours | Never use `--force` in production. Schedule during off-hours. Use `prisma migrate diff` to preview. |
| Next.js middleware + identity storage | Trying to read localStorage/sessionStorage in `src/middleware.ts` for identity routing | Middleware runs in Edge runtime, cannot access browser storage. Use cookies for server-readable identity, or URL parameters. |
| Supabase RLS + new columns | Worrying about RLS policies for new columns | Current RLS is deny-all with Prisma bypass via `service_role` key. New columns inherit deny-all. No RLS change needed as long as all access goes through Prisma. |
| Fun name generator uniqueness | Adding emoji to the fun name string before checking uniqueness | Keep fun name and emoji as separate columns. Uniqueness check on fun name alone (existing `@@unique([sessionId, funName])` constraint). Emoji does not affect uniqueness. |
| Backfill script + Prisma Client | Running backfill inside Prisma migration SQL (mixing DDL and DML) | Run backfill as a separate Node.js script using Prisma Client. Batch in chunks of 100-500 rows. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Emoji rendering measurement via canvas on every render | Jank in participant list; dropped frames when scrolling 30+ students | Pre-compute emoji support once on page load, cache per shortcode in module-level Map | 50+ participants |
| Name collision query on every keystroke in join form | 200ms+ server action calls, laggy input | Only check on form submit (current design does this -- maintain it) | N/A if current pattern kept |
| Backfill migration as single transaction | Database lock held for entire backfill; all writes blocked | Batch in chunks of 100-500 with `COMMIT` between batches | 10,000+ total participants across all sessions |
| Loading full emoji font on page load | 500KB+ font download delays initial paint on slow school WiFi | Use system emoji fonts (Noto on Chrome, Apple on Safari). Do not bundle a custom emoji font. | Slow networks (<1 Mbps) |
| Cross-platform emoji detection on every participant card | Re-checking if each emoji renders correctly on every render cycle | Build a static allowlist tested offline; serve only allowed emoji in the picker | Any scale -- this is a design-time concern, not runtime |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-provided emoji input without validation | XSS via malformed Unicode; database encoding errors; display injection | Server-side validation: emoji must match a shortcode in the curated set. Reject any input not in the allowlist. Client sends shortcode string, server validates against enum. |
| Exposing participant matching logic to brute force | Attacker iterates first names + last initials to enumerate all participants in a session and steal identities | Rate-limit `joinSessionByName` per IP per session (max 5 attempts per minute). Current design requires disambiguation confirmation -- maintain this. |
| Recovery code as permanent identity token | Recovery codes (`nanoid(8)`) never expire. Anyone who sees a code can claim that identity forever. | If recovery codes are kept in the redesign: make them single-use (current behavior) and expire them after 24 hours. If removed: ensure no equivalent permanent token replaces them. |
| `claimIdentity` accepts participantId without rate limiting | A malicious student could enumerate UUIDs to claim another student's identity | Current validation (participantId must belong to session matching sessionCode) is correct. Add rate limiting: max 3 claim attempts per IP per session per minute. |
| Emoji shortcode injection into HTML | If shortcodes are rendered via `dangerouslySetInnerHTML` or similar | Always render emoji via the mapping table: `EMOJI_MAP[shortcode]` returns a Unicode string rendered as text content, never HTML. Never use `dangerouslySetInnerHTML` with user-provided emoji data. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Full emoji picker with 3,600+ emoji | Students waste 5+ minutes browsing; inappropriate emoji selected; class time lost | Curated grid of 20-30 classroom-safe emoji. One tap. No categories. No search. |
| Fun names change during migration | "I was Daring Dragon!" -- student cannot find themselves in disambiguation list | Fun names are immutable. Emoji is additive. "Daring Dragon + rocket_emoji" not a new name. |
| "Last initial" label on the input | K-2 students do not know what "last initial" means | Label: "First letter of your last name." Single-char input. Auto-uppercase. Show example. |
| Emoji renders as blank box on older Chromebooks | Student selects emoji, sees it on their device, teacher's projector shows a box | Restrict to Unicode 13.0 (2020). Test on ChromeOS 100+, iOS 15+, Android 12+, Windows 10+. |
| Disambiguation shows emoji but student joined before emoji existed | Returning legacy student sees fun names with emoji they never selected; "none of these are me" | Show fun name as primary, emoji as secondary. Legacy participants without emoji show fun name only. No placeholder emoji. |
| Emoji selection required at join time | Blocks the fast join flow; adds friction to a 10-second process | Make emoji optional. Auto-assign random emoji from curated set. Student can change once (like reroll). |
| Join flow requires too many steps after redesign | Code -> name -> last initial -> emoji -> confirm = 5 steps; students lose patience | Merge: Code -> name + last initial (one input: "Emma S") -> auto-assign emoji -> welcome screen with emoji display and optional change. 3 steps max. |

## "Looks Done But Isn't" Checklist

- [ ] **Emoji storage:** Emoji stored as shortcode string, not raw Unicode -- verify with `SELECT emoji FROM student_participants LIMIT 5` showing values like "rocket", "star"
- [ ] **Migration backfill:** All existing participants have non-null emoji after backfill -- verify with `SELECT COUNT(*) FROM student_participants WHERE emoji IS NULL` returning 0
- [ ] **FingerprintJS removal:** `npm ls @fingerprintjs/fingerprintjs` returns empty; `grep -r "fingerprint" src/` shows zero application code hits (planning docs OK)
- [ ] **Cross-platform emoji:** Every emoji in the curated set renders correctly on ChromeOS, iOS, Android, Windows -- verify with screenshot comparison on 4 devices
- [ ] **Name collision:** Two students with identical first name + last initial can both join and correctly disambiguate via fun name selection -- verify with test scenario
- [ ] **Tab close recovery:** Student closes tab, reopens session URL, can rejoin without full re-entry -- verify with manual test on Chrome and Safari
- [ ] **Ephemeral mode survival:** Student on ephemeral Chromebook rejoins after browser restart using name + last initial -- verify by clearing all storage before rejoin
- [ ] **Broadcast compatibility:** Pre-deploy client code handles broadcast payloads with new emoji field without crashing -- verify by running old client against new server
- [ ] **Migration on populated database:** `prisma migrate deploy` succeeds against a database with existing participants, votes, and predictions -- verify against production snapshot
- [ ] **Fun name immutability:** No existing participant's fun_name was modified by migration -- verify with `SELECT id FROM student_participants WHERE fun_name != old_fun_name` (requires pre-migration snapshot)
- [ ] **Fun name uniqueness constraint:** `@@unique([sessionId, funName])` still works correctly with emoji as a separate column -- verify by attempting duplicate fun name insert
- [ ] **Emoji validation:** Submitting an emoji shortcode not in the curated set is rejected by the server action -- verify with curl/fetch to the join endpoint with `emoji: "middle_finger"`

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Emoji stored as raw Unicode, rendering breaks on some platforms | HIGH | Create new shortcode column, write migration to map existing Unicode to shortcodes (requires manual mapping table), update all application code, redeploy |
| Migration failed mid-deploy, students cannot join | MEDIUM | Roll back migration with `prisma migrate resolve --rolled-back`, redeploy previous application version from Vercel |
| FingerprintJS references remain in code after "removal" | LOW | `grep -r "fingerprint" src/`, fix each reference, rebuild and redeploy |
| Students claimed wrong identities during rollout | HIGH | No automated fix. Teacher must review participant list, identify mismatches, remove/recreate affected participants. Add "release identity" action for future use. |
| Backfill assigned duplicate emoji within a session | LOW | Run deduplication: for each session, find participants with same emoji, reassign with different shortcodes. No uniqueness constraint on emoji, so this is cosmetic not blocking. |
| Tab close creates duplicate participants | MEDIUM | Merge duplicates server-side: identify participants with same firstName + sessionId but different funName, combine vote history to the older record, delete the newer one. Add localStorage fallback to prevent recurrence. |
| Fun names accidentally modified during migration | HIGH | Restore from pre-migration backup. If no backup: participants must rejoin and reclaim via disambiguation (fun names are now unfamiliar). Prevent by making fun_name immutable in migration script. |
| Old Chromebooks show tofu for selected emoji | LOW | Replace problematic emoji in curated set with Unicode 12.0 (2019) alternatives. Run backfill to reassign affected participants. No data loss. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Ephemeral mode destroys localStorage | Identity architecture (first phase) | Join flow works after clearing all browser storage; reclaim via name + last initial succeeds |
| Emoji codepoint inconsistency | Schema design (emoji storage format) | Cross-platform rendering test on 4+ device types; database contains shortcodes not Unicode |
| Migration NOT NULL failure | Schema migration (expand-and-contract) | `prisma migrate deploy` succeeds on production snapshot; no empty string defaults |
| Migration orphans participants | Schema migration + backfill script | `SELECT COUNT(*) WHERE emoji IS NULL` returns 0 after backfill; existing fun names unchanged |
| False identity claims (name collision) | Join flow redesign | Two "Emma S" students both join successfully; disambiguation shows correct fun names; neither auto-claimed |
| FingerprintJS dead code | Cleanup (before or during schema migration) | `npm ls` clean; bundle size reduced; no fingerprint references in src/ |
| sessionStorage tab close | Join flow redesign (storage strategy) | Close tab, reopen URL, student auto-recovers or sees 1-step rejoin |
| Fun names change during migration | Schema migration (immutability constraint) | Pre/post migration fun_name comparison shows zero changes |
| Full emoji picker | Join flow redesign (UI) | Emoji grid shows exactly 20-30 items; no categories, no search; server rejects non-allowlisted values |
| Schema migration during active sessions | Schema migration (scheduling) | Migration run during off-hours; no join failures during migration window |

## Sources

### Primary (HIGH confidence)
- **Codebase analysis:** Direct examination of `prisma/schema.prisma` (StudentParticipant model, columns, constraints, indexes), `src/lib/student/session-store.ts` (sessionStorage per-tab), `src/lib/student/session-identity.ts` (localStorage UUID), `src/lib/student/fingerprint.ts` (FingerprintJS integration), `src/hooks/use-device-identity.ts` (combined identity hook), `src/actions/student.ts` (joinSession, joinSessionByName, claimIdentity, recoverIdentity), `src/lib/dal/student-session.ts` (all participant DAL functions), `src/components/student/name-entry-form.tsx` (join UI), `src/components/student/name-disambiguation.tsx` (duplicate name resolution), `src/lib/student/fun-names.ts` (alliterative name generator), `src/types/student.ts` (DeviceIdentity, JoinResult types), `package.json` (@fingerprintjs/fingerprintjs@^5.0.1)
- **Prisma migration docs (HIGH):** [Expand and contract pattern](https://www.prisma.io/docs/guides/data-migration), [Customizing migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations)

### Secondary (MEDIUM confidence)
- **Chrome Ephemeral Mode:** [Google Chrome Enterprise Help](https://support.google.com/chrome/a/answer/3538894?hl=en) -- confirms profile deletion on session end, all local data wiped
- **Chrome Device Policies:** [Set ChromeOS device policies](https://support.google.com/chrome/a/answer/1375678?hl=en) -- admin console controls for BrowsingDataLifetime, ForceEphemeralProfiles
- **Emoji rendering:** [Solving the Emoji Rendering Issue - DEV Community](https://dev.to/nixx/solving-the-emoji-rendering-issue-a-comprehensive-guide-jn2) -- emoji support depends on OS, not browser
- **Cross-platform emoji study:** [What I See is What You Don't Get - ACM CSCW 2018](https://dl.acm.org/doi/10.1145/3274393) -- academic study confirming emoji render differently across platforms
- **Emoji browser compatibility:** [Emoji Compatibility With Browsers - TestMu](https://www.testmu.ai/blog/emoji-compatibility-with-browsers/) -- older devices show tofu for newer Unicode versions
- **Zero-downtime PostgreSQL migrations:** [Xata blog](https://xata.io/blog/zero-downtime-schema-migrations-postgresql) -- exclusive locks, nullable column additions are instant on PG 11+

### Tertiary (LOW confidence)
- **Name collision probability:** Estimated from US Social Security Administration baby name frequency data. Exact collision rates in a 30-student classroom are approximations.

---
*Pitfalls research for: Student identity redesign in SparkVotEDU*
*Researched: 2026-03-08*
