# Read in Peace — Backend Overview

NestJS v11 REST API (Express platform) serving the Read in Peace book marketplace.
PostgreSQL via Drizzle ORM, Better Auth for authentication, Stripe for payments.

## Directory Structure

```
backend/src/
├── main.ts                     # Bootstrap: CORS, validation, auth middleware, global filters
├── app.module.ts               # Root module — imports all sub-modules
├── app.controller.ts           # Health check: GET /
├── app.service.ts              # (unused NestJS boilerplate)

├── config/                     # Environment configuration (hand-rolled, Zod-validated)
├── db/                         # Drizzle ORM schema, migrations, seed data
├── auth/                       # Authentication & authorization
├── shared/                     # Cross-cutting: logging, error handling
├── repositories/               # Data access — Drizzle implementations
├── books/                      # Books CRUD, comments, rating system
├── transactions/               # Borrowing, Stripe checkout, purchase verification
├── reading-goals/              # Yearly reading goal tracking
└── social/                     # User feed, posts, replies, likes
```

---

## Module Responsibilities

### `config/` — Environment Configuration
- `ConfigService` (Zod-validated, typed config groups: db, auth, stripe, server, frontend)
- `@Global()` module — available everywhere without importing
- Hand-rolled (no `@nestjs/config`), see [ADR 001](adr/001-handrolled-config.md)

### `db/` — Database Layer
- Drizzle ORM schema (`schema.ts`): 15 tables (users, sessions, books, comments, ratings, likes, borrows, purchases, posts, goals, and join tables)
- `DRIZZLE` provider: PostgreSQL connection pool via `pg` + `drizzle-orm/node-postgres`
- Migrations in `db/migrations/` (11 files), applied via `npm run db:migrate`
- Seed data via `npm run db:seed` (demo books, users, comments)
- `@Global()` module

### `auth/` — Authentication & Authorization
- **Better Auth** instance provided via `AUTH` token, mounted as Express middleware at `/api/auth`
- **Guards:**
  - `AuthGuard` — requires valid session, throws 401 on failure, sets `request.user`
  - `OptionalAuthGuard` — attaches user if session exists, never throws
  - `PoliciesGuard` — resolves `@Policies()` decorator tokens, runs each `Policy.check()`
- **Policies:**
  - `OwnershipPolicy` — verifies `createdBy`/`userId` matches current user for book edit/delete and comment delete
  - Bound to policy tokens: `CAN_EDIT_BOOK`, `CAN_DELETE_BOOK`, `CAN_DELETE_COMMENT`
- **Decorators:** `@CurrentUser()`, `@OptionalUser()`, `@Policies(...tokens)`
- `@Global()` module

### `shared/` — Cross-Cutting Infrastructure
- `AppLoggerModule` — nestjs-pino integration (structured JSON logging)
- `AllExceptionsFilter` — global exception filter producing `{ statusCode, error, message, requestId, timestamp, path }` envelope
- `ClsModule` — continuation-local storage for request-scoped `requestId`, `method`, `path`
- `@Global()` (`SharedModule`)

### `repositories/` — Data Access
- Drizzle implementations are concrete `@Injectable()` classes used as their own DI tokens (no interfaces, no Symbol tokens)
- `RepositoriesModule` (`@Global()`) provides: `DrizzleBookRepository`, `DrizzleCommentRepository`, `DrizzleRatingRepository`, `DrizzleLikeRepository`, `DrizzleBorrowRepository`, `DrizzlePurchaseRepository`, `DrizzlePostRepository`, `DrizzleGoalRepository`
- `Paginated<T>` helper for paginated responses
- `InMemoryLikeRepository` — test double for like toggle logic

### `books/` — Books Feature Module
- **Controller:** `BooksController` at `/api/books`
- **Endpoints:**
  - `GET /api/books` — paginated listing (filterable by `?category=`)
  - `GET /api/books/trending` — top 3 trending books
  - `GET /api/books/new-arrivals` — latest 4 books
  - `GET /api/books/:id` — single book detail
  - `POST /api/books` — create (auth required)
  - `PUT /api/books/:id` — update (auth + ownership policy)
  - `DELETE /api/books/:id` — delete (auth + ownership policy)
  - `GET /api/books/:id/like` — check if current user liked
  - `POST /api/books/:id/like` — toggle like (auth)
  - `GET /api/books/:id/rate` — get current user's rating
  - `POST /api/books/:id/rate` — submit/update rating (auth)
- **Sub-resources:** comments at `/api/books/:id/comments` (CRUD, like, reply)
- **Service:** `BooksService` — CRUD, like toggle, rating upsert
- **Service:** `CommentsService` — comment tree assembly, like/unlike, creation with optional rating in a Drizzle transaction
- **DTOs:** `CreateBookDto`, `UpdateBookDto` (class-validator), `CreateCommentDto`, `RateBookDto`

### `transactions/` — Purchases & Borrowing
- **Controller:** `TransactionsController`
- **Endpoints:**
  - `POST /api/books/:id/borrow` — borrow a book (stock lock via FOR UPDATE)
  - `POST /api/books/:id/return` — return a book
  - `POST /api/books/:id/create-checkout-session` — Stripe checkout for single book
  - `POST /api/cart/checkout` — Stripe checkout for multiple books
  - `POST /api/confirm-purchase` — Stripe webhook: verify session, record purchases, decrement stock
  - `GET /api/user/borrows` — list user's borrows
  - `GET /api/user/purchases` — list user's purchases
- **Services:**
  - `BorrowsService` — borrow with `SELECT ... FOR UPDATE` row lock, 14-day due, return, paginated history
  - `CheckoutService` — Stripe session creation (single + cart), integrates `pricing.ts`
  - `PurchaseConfirmationService` — Stripe signature verification, batch purchase recording
- `pricing.ts` — pure discount math (tier percentage, category bonus, every-$100 discount)

### `reading-goals/` — Reading Goals
- **Controller:** `ReadingGoalsController` at `/api/user/reading-goal`
- **Endpoints:**
  - `GET /api/user/reading-goal` — get current year's goal + progress
  - `PUT /api/user/reading-goal` — set/update yearly goal
- **Service:** `ReadingGoalsService` — goal CRUD with upsert logic

### `social/` — Social Feed
- **Controller:** `SocialController` at `/api/feed`
- **Endpoints:**
  - `GET /api/feed` — paginated feed of posts
  - `POST /api/feed` — create post (auth)
  - `POST /api/feed/:id/like` — toggle post like (auth)
  - `GET /api/feed/:id/like` — check if user liked post
  - `GET /api/feed/:id/replies` — list replies to a post
  - `POST /api/feed/:id/reply` — add reply (auth)
- **Service:** `SocialService` — feed, post CRUD, likes, replies

---

## Architecture Principles

### Repository Pattern (Concrete Classes)
All database access goes through Drizzle repository classes in `repositories/drizzle/`. Services never write raw SQL — they delegate to repositories. Repositories are concrete `@Injectable()` classes injected directly (no interfaces, no Symbol tokens).

### Port/Adapter (Auth Only)
`AuthPort` interface with `BetterAuthAdapter` implementation enables testable auth guards. This is the only remaining port/adapter abstraction — all others were inlined.

### Policy-Based Authorization
Composable `Policy` interface with `@Policies()` decorator + `PoliciesGuard` for fine-grained access control. Ownership verification lives in guards, not in service methods.

### Request Tracing
Every request gets a unique `requestId` via `nestjs-cls`. All error responses include this ID for log correlation.

### Pure Business Logic
`pricing.ts` has zero framework dependencies — pure functions, trivially testable.

---

## DI Tokens

| Token | Type | Purpose |
|---|---|---|
| `DrizzleBookRepository` | Class | Book write + read operations |
| `DrizzleCommentRepository` | Class | Comment CRUD + like aggregation |
| `DrizzleRatingRepository` | Class | Rating upsert + aggregation |
| `DrizzleLikeRepository` | Class | Book like toggle |
| `DrizzleBorrowRepository` | Class | Borrow record CRUD |
| `DrizzlePurchaseRepository` | Class | Purchase record CRUD |
| `DrizzlePostRepository` | Class | Social post CRUD + feed query |
| `DrizzleGoalRepository` | Class | Reading goal upsert |
| `DRIZZLE` | Symbol | Raw Drizzle ORM instance |
| `AUTH` | Symbol | Better Auth server instance |
| `AUTH_PORT` | Symbol | AuthPort adapter (for guards) |
| `ConfigService` | Class | Typed environment config |

---

## Database

**Engine:** PostgreSQL (via Docker Compose)  
**ORM:** Drizzle ORM with `node-postgres` driver  
**Schema:** 15 tables across 11 migration files  
**Setup:** `docker compose up -d && npm run db:migrate && npm run db:seed`

Key tables: `books` (UUID PK, unique slug), `comments` (self-referencing parentId), `ratings` (composite PK on bookId+userId), `borrows` (dueAt, borrowedAt, returnedAt), `purchases`, `readingGoals`, `posts`, and Better Auth tables (`user`, `session`, `account`, `verification`).

---

## Commands

| Command | Purpose |
|---|---|
| `npm run build` | Compile NestJS (nest build) |
| `npm run start:dev` | Watch mode (nest start --watch) |
| `npm run lint` | ESLint + Prettier fix |
| `npm run format` | Prettier format |
| `npm run test` | Jest unit tests |
| `npm run test:cov` | Jest with coverage |
| `npm run test:e2e` | E2E tests |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:seed` | Populate demo data |
