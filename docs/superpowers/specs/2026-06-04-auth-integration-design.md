# Auth Integration — Design Spec

**Date:** 2026-06-04
**Status:** Approved
**Tags:** auth, better-auth, drizzle, postgres, nestjs, nuxt

## Overview

Replace the existing mock authentication system with a real backend auth layer using Better Auth, PostgreSQL (via Docker), and Drizzle ORM. The frontend gets an auth modal (login/signup) that replaces the old mock toggle.

## Infrastructure

- **Docker Compose** at project root — single PostgreSQL container on port 5432 with named volume for persistence
- Frontend and backend run on host (no change to existing dev workflow)
- Connection string: `postgres://readinpace:readinpace@localhost:5432/readinpace`

## Backend — Drizzle ORM

- `backend/drizzle.config.ts` — config pointing to PostgreSQL, schema at `src/db/schema.ts`, output to `src/db/migrations/`
- `backend/src/db/schema.ts` — Better Auth's generated Drizzle schema (tables: user, session, account, verification) exported via `better-auth/db/drizzle`
- `backend/src/db/db.module.ts` — `@Global()` NestJS module that provides the `drizzle` instance
- `backend/src/db/db.provider.ts` — factory provider: creates `drizzle(pool, { schema })` from `@neondatabase/serverless` or `pg` pool (use `pg` for local Docker)
- Migrations: `drizzle-kit push` for dev, `drizzle-kit migrate` for prod

## Backend — Better Auth

- `backend/src/auth/better-auth.ts` — singleton `betterAuth()` instance with:
  - Drizzle adapter (`@better-auth/db/drizzle`)
  - `emailAndPassword` plugin enabled (sign-up + sign-in)
  - Session cookie configured with `httpOnly: true`, `sameSite: "lax"`, secure based on env
  - Trusted origins: `http://localhost:3000`
- Mounted in `main.ts` as Express middleware: `app.use('/api/auth', auth.handler)`
- Better Auth handles all auth routes automatically: `/api/auth/sign-up`, `/api/auth/sign-in`, `/api/auth/sign-out`, `/api/auth/session`

## Backend — NestJS Integration

- `backend/src/auth/auth.guard.ts` — `AuthGuard` that calls `auth.api.getSession({ headers })` from the incoming request. Throws `UnauthorizedException` if no valid session
- `backend/src/auth/current-user.decorator.ts` — `@CurrentUser()` param decorator extracting the user from the guarded request
- `backend/src/auth/auth.module.ts` — updated to export guard + decorator, removing old controller/service
- `backend/src/auth/auth.controller.ts` — deleted (Better Auth handles all auth routes)
- `backend/src/auth/auth.service.ts` — deleted

## Frontend — Auth Modal

- `components/AuthModal.vue` — modal overlay with two tabs: **Sign In** and **Sign Up**
  - Tabs toggle between sign-in and sign-up forms without navigating
  - Sign In: email field + password field + submit button + "Don't have an account?" link
  - Sign Up: name field + email field + password field + submit button + "Already have an account?" link
  - Inline error state below form on failure
  - Loading state on submit button
  - Emits `close` event on successful auth or manual dismiss
  - Modal backdrop dismisses on click outside (desktop)
- `Navbar.vue` — "Sign in" button opens auth modal via a reactive `showAuthModal` ref
  - Signed-in state unchanged (avatar dropdown with sign-out)
  - Guest state: single "Sign in" button → opens modal
- `stores/auth.ts` — complete rewrite:
  - `signIn(email, password)` → `$fetch('/api/auth/sign-in', { method: 'POST', body })` → sets `user` + `signedIn`
  - `signUp(name, email, password)` → `$fetch('/api/auth/sign-up', { method: 'POST', body })` → auto-signs in
  - `signOut()` → `$fetch('/api/auth/sign-out', { method: 'POST' })` → clears state
  - `fetchSession()` → `$fetch('/api/auth/session')` → hydrates store on app mount
  - State: `user` (name, email) | `signedIn` boolean | `adminMode` (unchanged, client-only)
  - Error responses from Better Auth surfaced as thrown errors caught by the modal

## Session Hydration

- `app.vue` or `layouts/default.vue` calls `useAuthStore().fetchSession()` on mount
- If session active → store populated → navbar shows avatar
- If no session → store stays signed out → navbar shows "Sign in"
- Works on hard refresh and direct URL navigation

## Route Guards

- Auth modal redirects to `/feed` on successful sign-in/sign-up
- No strict route guards on pages — users can browse feed/index as guests
- Protected actions (borrow, purchase) are future considerations

## Packages to Add

### Backend (`backend/package.json`)
- `better-auth`
- `drizzle-orm`
- `@better-auth/db` (or `@better-auth/drizzle`)
- `pg` (PostgreSQL client)
- `@types/pg`
- `drizzle-kit` (devDependency)

### Frontend (`frontend/package.json`)
- No new dependencies — uses existing `$fetch` + Nuxt proxy

## File Changes Summary

| Action | File |
|--------|------|
| CREATE | `docker-compose.yml` |
| CREATE | `backend/drizzle.config.ts` |
| CREATE | `backend/src/db/schema.ts` |
| CREATE | `backend/src/db/db.module.ts` |
| CREATE | `backend/src/db/db.provider.ts` |
| CREATE | `backend/src/auth/better-auth.ts` |
| CREATE | `backend/src/auth/auth.guard.ts` |
| CREATE | `backend/src/auth/current-user.decorator.ts` |
| CREATE | `frontend/components/AuthModal.vue` |
| UPDATE | `backend/src/auth/auth.module.ts` |
| UPDATE | `backend/src/main.ts` |
| UPDATE | `backend/package.json` |
| UPDATE | `frontend/stores/auth.ts` |
| UPDATE | `frontend/components/Navbar.vue` |
| UPDATE | `frontend/app.vue` or layout (session hydration) |
| DELETE | `backend/src/auth/auth.controller.ts` |
| DELETE | `backend/src/auth/auth.service.ts` |
