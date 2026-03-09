---
type: quick
task: 29
description: Fix dashboard server-side rendering error
date: 2026-03-09
---

# Quick Task 29: Fix dashboard server-side rendering error

## Problem

Production dashboard crashes with `PrismaClientKnownRequestError` P2002 (unique constraint on `email`) when `getAuthenticatedTeacher()` tries to `create` a teacher record that already exists with the same email but different `supabaseAuthId`.

## Root Cause

`src/lib/dal/auth.ts:getAuthenticatedTeacher()` does `findUnique` by `supabaseAuthId`, then `create` if not found. If a teacher with that email already exists (e.g., re-created Supabase auth account), the create fails on the email unique constraint.

## Fix

Change `create` to `upsert` keyed on email, updating `supabaseAuthId` when the teacher already exists. This matches the pattern already used in `src/app/auth/callback/route.ts:72`.

## Tasks

### Task 1: Replace create with upsert in getAuthenticatedTeacher
- **files:** src/lib/dal/auth.ts
- **action:** Change `prisma.teacher.create()` to `prisma.teacher.upsert()` with email as the unique key
- **verify:** `npx tsc --noEmit` passes
- **done:** Type-check clean
