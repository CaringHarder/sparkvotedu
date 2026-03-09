---
type: quick-summary
task: 29
description: Fix dashboard server-side rendering error
date: 2026-03-09
status: complete
---

# Quick Task 29: Fix dashboard server-side rendering error

## What Changed

**File:** `src/lib/dal/auth.ts`

Changed `prisma.teacher.create()` to `prisma.teacher.upsert()` in `getAuthenticatedTeacher()`. The upsert uses `email` as the unique key and updates `supabaseAuthId` if the teacher already exists.

## Why

Production dashboard was crashing with Prisma P2002 (unique constraint violation on `email`) when a teacher's Supabase auth ID didn't match their existing teacher record. The `findUnique` by `supabaseAuthId` returned null, then `create` failed because the email already existed.

## Verification

- TypeScript compilation: clean
- Pattern matches existing `upsert` in `src/app/auth/callback/route.ts:72`
