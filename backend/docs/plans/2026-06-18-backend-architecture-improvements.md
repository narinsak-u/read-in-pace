# Backend Architecture Improvement Plan

> Generated from a full `improve-codebase-architecture` review. See `backend/docs/reviews/2026-06-18-architecture-review.md` for the raw findings (7 deepening clusters, 3 designs per cluster).

## Guiding principles

1. **Deep modules over shallow ones.** One cohesive concept per file, small surface, big body.
2. **Ports & adapters at every cross-cutting boundary.** Auth, config, logging, persistence, pricing, authorization.
3. **Tests follow the modules.** Each new port has a unit test seam at the boundary; no service is testable only via a live database.
4. **Strict layering.** `main.ts → AppModule → feature modules → services → repositories → Drizzle`. Cross-layer leakage (e.g. `DRIZZLE` injected into a service) is the smell to fix.
5. **Migration-friendly.** No behavior changes; existing endpoints respond identically; the e2e test still passes.

## Phased rollout

The phases below are ordered by **dependency**: each phase's ports/adapters must exist before later phases can wire through them. Within a phase, tasks are sequenced so the code compiles after each step.

### Phase 0 — Dependency hygiene (no behavior change)

- [ ] **0.1** Install runtime + dev deps:
  - `zod` (env validation)
  - `nestjs-pino`, `pino`, `pino-http` (structured logging)
  - `nestjs-cls` (request-scoped context — lighter than raw `AsyncLocalStorage` and integrates with `nestjs-pino`)
- [ ] **0.2** Update `package.json` scripts: add `lint` configuration for the new `process.env` rule (see 5.3).
- [ ] **0.3** Verify `npm run build` and `npm run lint` pass at baseline.

**Why first:** every later phase imports from these packages. Doing it now means the diff at each step is small.

---

### Phase 1 — ConfigService (cluster #5)

- [ ] **1.1** Create `src/config/env.schema.ts` (zod) — required: `DATABASE_URL`, `STRIPE_SECRET_KEY`. Optional with defaults: `PORT`, `BETTER_AUTH_URL`, `CORS_ORIGINS`, `FRONTEND_URL`, `AUTH_SECRET`, `NODE_ENV`, `LOG_LEVEL`.
- [ ] **1.2** Create `src/config/config.types.ts` — `AppConfig` interface with readonly `db`, `auth`, `stripe`, `server`, `frontend` namespaces.
- [ ] **1.3** Create `src/config/config.provider.ts` — `ConfigService` class that takes a `NodeJS.ProcessEnv`, runs zod, and exposes the typed `AppConfig`. Throws on boot if invalid.
- [ ] **1.4** Create `src/config/config.module.ts` — `@Global()` module that constructs `ConfigService` once via `useFactory` from `process.env`.
- [ ] **1.5** Wire `ConfigModule` into `AppModule.imports` (first).
- [ ] **1.6** Migrate each reader to `ConfigService`:
  - `db.provider.ts` → inject `ConfigService`, use `config.db.url`
  - `stripe.provider.ts` → inject `ConfigService`, use `config.stripe.secretKey`
  - `better-auth.ts` → accept `ConfigService` via factory provider; `baseURL`/`trustedOrigins` from `config.auth`
  - `transactions.service.ts` → inject `ConfigService`, replace 4× `process.env.BETTER_AUTH_URL` with `config.frontend.url`
  - `main.ts` → `app.get(ConfigService)` for port + CORS origins
  - `seed.ts` → construct `ConfigService` from `envSchema.parse(process.env)`
- [ ] **1.7** Add a unit test: `src/config/config.provider.spec.ts` — assert zod rejects missing `DATABASE_URL`, accepts defaults, and exposes nested `config.server.port`.

**Why now:** every later phase needs `ConfigService` (logger reads log level, repos could read pool size, etc.). Doing it first avoids scattered `process.env` writes.

---

### Phase 2 — Infrastructure layer: logger + request context + global error filter (cluster #6)

- [ ] **2.1** Create `src/shared/logger/logger.port.ts` — `LOGGER_PORT` symbol, `LoggerPort` interface, `LogContext` type.
- [ ] **2.2** Create `src/shared/logger/pino-logger.adapter.ts` — wraps `nestjs-pino`'s `Logger` to satisfy `LoggerPort`.
- [ ] **2.3** Create `src/shared/logger/logger.module.ts` — provides `LOGGER_PORT` → `PinoLoggerAdapter`. Uses `LoggerModule` from `nestjs-pino` for the underlying pino instance.
- [ ] **2.4** Create `src/shared/context/request-context.module.ts` — wraps `nestjs-cls` for `requestId`, `userId`, `method`, `path`. Middleware that sets `requestId` from `x-request-id` header or `crypto.randomUUID()`, and `userId` after auth runs (via CLS hook).
- [ ] **2.5** Create `src/shared/errors/exception-filter.port.ts` and `src/shared/errors/all-exceptions.filter.ts` — the filter reads the CLS store, builds `{ statusCode, error, message, requestId, timestamp, path }`, logs the error with `LOGGER_PORT`, then writes the JSON response.
- [ ] **2.6** Create `src/shared/shared.module.ts` — `@Global()` re-export of logger module, CLS module, and `AllExceptionsFilter`.
- [ ] **2.7** Wire `SharedModule` into `AppModule.imports` (after `ConfigModule`).
- [ ] **2.8** Update `main.ts` — `bufferLogs: true`, pass `new Logger` from `nestjs-pino`, register `AllExceptionsFilter` via `app.useGlobalFilters(new AllExceptionsFilter(app.get(LOGGER_PORT), app.get(ClsService)))`.
- [ ] **2.9** Replace `console.log` / `console.error` in `main.ts` and `seed.ts` with `LOGGER_PORT` (seed uses a standalone pino instance — see design doc §2.5).
- [ ] **2.10** Add unit test: `src/shared/errors/all-exceptions.filter.spec.ts` — assert response shape, assert logger was called with context.

**Why now:** Phase 3 (auth port) and Phase 4 (repositories) emit logs and throw errors. Having the filter and logger in place first means each later refactor can be observed end-to-end.

---

### Phase 3 — Auth port & adapter (cluster #4)

- [ ] **3.1** Create `src/auth/auth.types.ts` — `AuthSession`, `AuthUser` (re-export of `typeof schema.user.$inferSelect`).
- [ ] **3.2** Create `src/auth/auth.port.ts` — `AUTH_PORT` symbol, `AuthPort` interface (`getSession`, `handleHttp`). YAGNI: skip `getUserById`/`getUserByEmail` for now.
- [ ] **3.3** Create `src/auth/better-auth.adapter.ts` — `@Injectable() BetterAuthAdapter implements AuthPort`. Owns the `toNodeHandler(auth)` once. `getSession(headers)` returns `AuthSession | null` via `fromNodeHeaders(headers)` and `auth.api.getSession`.
- [ ] **3.4** Update `auth.module.ts` — providers include `BetterAuthAdapter` + `{ provide: AUTH_PORT, useExisting: BetterAuthAdapter }`. Mark `@Global()`. Export `AUTH_PORT`.
- [ ] **3.5** Refactor `auth.guard.ts` — inject `AUTH_PORT`, call `port.getSession(req.headers)`. Drop the `import { auth }` and `fromNodeHeaders` imports.
- [ ] **3.6** Refactor `optional-auth.guard.ts` — same change.
- [ ] **3.7** Update `main.ts` — resolve the auth handler via `app.get<BetterAuthAdapter>(BetterAuthAdapter).handleHttp` instead of importing the singleton. **Caveat:** `app.use` runs before guards set `request.user`; the `handleHttp` call must NOT depend on the guard. (It doesn't — Better Auth's `toNodeHandler` is self-contained.)
- [ ] **3.8** Add unit test: `src/auth/auth.guard.spec.ts` — fake `AuthPort`, assert throw on null session, attach on success.
- [ ] **3.9** Delete the `process.env` reads in `better-auth.ts` (now wired via `ConfigService` from Phase 1). Move the file to `src/auth/better-auth.factory.ts` and have it take a `ConfigService` + `DRIZZLE` instance.

**Why before services:** controllers in later phases will inject guards that depend on `AUTH_PORT`; switching adapters in tests requires the port to exist.

---

### Phase 4 — Repositories + read model (cluster #3)

This is the largest phase. Do it in this order: types → tokens → interfaces → implementations → in-memory fakes → service migrations.

- [ ] **4.1** Create `src/repositories/paginated.ts` — `Paginated<T> = { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }`.
- [ ] **4.2** Create `src/repositories/db-or-tx.ts` — type alias `DbOrTx = NodePgDatabase<typeof schema> | NodePgTransaction<typeof schema>`.
- [ ] **4.3** Create `src/repositories/interfaces/book.repository.ts` — `BookProjection`, `BookPricing`, `BookLockRow`, `BookRepository` interface (no implementation, no Drizzle imports).
- [ ] **4.4** Create `src/repositories/interfaces/comment.repository.ts` — `CommentWithUser`, `CommentRepository`.
- [ ] **4.5** Create `src/repositories/interfaces/rating.repository.ts` — `RatingRepository`.
- [ ] **4.6** Create `src/repositories/interfaces/like.repository.ts` — `LikeRepository`.
- [ ] **4.7** Create `src/repositories/interfaces/borrow.repository.ts` — `BorrowWithBook`, `BorrowRepository`.
- [ ] **4.8** Create `src/repositories/interfaces/purchase.repository.ts` — `PurchaseRepository`.
- [ ] **4.9** Create `src/repositories/interfaces/post.repository.ts` — `PostWithUser`, `PostRepository`.
- [ ] **4.10** Create `src/repositories/interfaces/goal.repository.ts` — `ReadingGoalRepository`.
- [ ] **4.11** Create `src/repositories/interfaces/user.repository.ts` — `UserRepository` (minimal — just `findById` for now).
- [ ] **4.12** Create `src/repositories/tokens.ts` — string DI tokens: `BOOK_REPO`, `COMMENT_REPO`, `RATING_REPO`, `LIKE_REPO`, `BORROW_REPO`, `PURCHASE_REPO`, `POST_REPO`, `GOAL_REPO`, `USER_REPO`, `BOOK_READ_MODEL`.
- [ ] **4.13** Create `src/repositories/drizzle/` directory with one file per repo: `drizzle-book.repository.ts`, `drizzle-comment.repository.ts`, etc. Each `@Injectable() class XxxRepository implements XxxRepository`, takes `@Inject(DRIZZLE) db`, exports domain methods. **All the meta-subquery SQL lives in `drizzle-book.repository.ts` and nowhere else.**
- [ ] **4.14** Create `src/repositories/read-models/book-read.model.ts` — `BookReadModel` with `findFullById`, `findFullPaginated`, `attachToBorrows`, `attachToPurchases`. The single home of the `likeCount`/`commentCount`/`avgRating`/`ratingsCount` SQL fragment.
- [ ] **4.15** Create `src/repositories/repositories.module.ts` — `@Global()`, registers each concrete repo as `{ provide: TOKEN, useExisting: ConcreteClass }`.
- [ ] **4.16** Create `src/repositories/fakes/in-memory-book.repository.ts` (and one per repo) — `InMemoryBookRepository implements BookRepository` backed by `Map`. ≤100 lines each. Used only in tests.
- [ ] **4.17** Migrate `BooksService` to use `BookRepository` and `BookReadModel`. Remove the `DRIZZLE` injection. The `bookWithMeta` private const moves into `BookReadModel` (the projection lives in one place).
- [ ] **4.18** Migrate `LikesService` to use `LikeRepository`.
- [ ] **4.19** Migrate `RatingsService` to use `RatingRepository` (see also Phase 5.2).
- [ ] **4.20** Migrate `CommentsService` to use `CommentRepository`. See Phase 5 for the rating cross-table fix.
- [ ] **4.21** Migrate `TransactionsService` to use `BookRepository`, `BorrowRepository`, `PurchaseRepository`. The `borrow` and `confirm` methods own `db.transaction()`; each call passes `tx` down. **Concurrency preserved:** the `FOR UPDATE` lock stays inside `BookRepository.acquireLockForBorrow(id, tx)`.
- [ ] **4.22** Migrate `ReadingGoalsService` to use `GoalRepository`.
- [ ] **4.23** Migrate `SocialService` to use `PostRepository`.
- [ ] **4.24** Add a `repositories.service.spec.ts` per repo (against the in-memory fake) — tests now possible.

**Why the largest phase:** it's the foundation for testability. After this, every service can be unit-tested against an in-memory fake.

---

### Phase 5 — Comments ↔ ratings transaction fix (cluster #2)

- [ ] **5.1** Add `recordFromComment(tx, { bookId, userId, rating })` to `RatingRepository` interface. The `tx` parameter is the caller's transaction (typed `NodePgTransaction<typeof schema>`).
- [ ] **5.2** Implement in `DrizzleRatingRepository`. Behavior: if `rating === null`, no-op; else `insert(...).onConflictDoUpdate`.
- [ ] **5.3** In `CommentsService.create`, wrap the comment insert + rating write in `db.transaction(async (tx) => { ... })`. Pass `tx` to `commentRepo.create` and `ratingRepo.recordFromComment`.
- [ ] **5.4** Extract a `projectComment(tx, commentId, currentUserId)` helper in `CommentsService`. Use it in both `create` and `findByBook`. Eliminates the projection duplication (lines 20-34 vs 121-139 in the old service).
- [ ] **5.5** Add a test: `comments.service.spec.ts` — fake `CommentRepository` and `RatingRepository`; assert that `recordFromComment` is called inside the same transaction (you can verify by passing a fake `tx` and asserting the calls are sequenced on it).

**Why after repositories:** the rating cross-table fix uses the repository layer's `tx` plumbing from Phase 4. Doing it earlier would mean threading `tx` through Drizzle directly.

---

### Phase 6 — Split TransactionsService (cluster #1)

- [ ] **6.1** Create `src/transactions/pricing.ts` — move `applyDiscounts` and `DiscountResult` here verbatim. Pure module, no Nest, no env.
- [ ] **6.2** Update `discount.spec.ts` to import from `./pricing`. Verify the spec still passes.
- [ ] **6.3** Create `src/transactions/borrows.service.ts` — `BorrowsService` with `borrow`, `returnBook`, `listForUser`. Uses `BookRepository`, `BorrowRepository`. Owns the `borrow` transaction. The `BORROW_PERIOD_DAYS = 14` constant lives here.
- [ ] **6.4** Create `src/transactions/checkout.service.ts` — `CheckoutService` with `forBook`, `forCart`. Uses `BookRepository`, `PricingService` (the imported module, not a provider). Owns Stripe success/cancel URL construction.
- [ ] **6.5** Create `src/transactions/purchase-confirmation.service.ts` — `PurchaseConfirmationService` with `confirm`, `listForUser`. Owns Stripe session retrieval, the `bc`/`bN` metadata parse, and the single/batch transactional writes.
- [ ] **6.6** Update `TransactionsController` — inject the three new services. Routes map 1:1 to controller methods (no path changes).
- [ ] **6.7** Update `TransactionsModule` — provide the three new services + `stripeProvider` (still needed by `CheckoutService` and `PurchaseConfirmationService`). The old `TransactionsService` is deleted.
- [ ] **6.8** Add unit tests:
  - `pricing.spec.ts` already exists (relocated).
  - `borrows.service.spec.ts` — in-memory `BookRepository` + `BorrowRepository`, assert the borrow transaction calls `acquireLockForBorrow` first.
  - `checkout.service.spec.ts` — fake Stripe, assert cart calls `applyDiscounts` and packs the metadata correctly.
  - `purchase-confirmation.service.spec.ts` — fake Stripe + repositories, assert idempotency on duplicate session, assert single vs batch path.

**Why after repositories + comments fix:** the splits use `BookRepository` and `BorrowRepository` from Phase 4. The `purchase-confirmation` service uses the rating write plumbing pattern established in Phase 5 (caller-owned transaction).

---

### Phase 7 — Authorization policies (cluster #7)

- [ ] **7.1** Create `src/auth/policies/policy.types.ts` — `Policy` interface, `PolicyContext` interface, symbolic tokens (`CAN_EDIT_BOOK`, `CAN_DELETE_BOOK`, `CAN_DELETE_COMMENT`, `CAN_BORROW_BOOK`).
- [ ] **7.2** Create `src/auth/policies/ownership.policy.ts` — `OwnershipPolicy` with `action` constructor argument and a switch on action. Loads the resource directly via `BookRepository`/`CommentRepository` (no separate `ResourceLoader` port — the repository IS the resource loader, and that's enough for this codebase).
- [ ] **7.3** Create `src/auth/policies/policies.decorator.ts` — `@Policies(...tokens)` setting metadata.
- [ ] **7.4** Create `src/auth/policies/policies.guard.ts` — reads metadata, resolves each token via `ModuleRef`, calls `policy.check(ctx)`. **No resource loading** — policies own that.
- [ ] **7.5** Create `src/auth/policies/policies.module.ts` — registers each policy under its token with the right `action` string.
- [ ] **7.6** Migrate `BooksService.update` and `BooksService.remove` — drop the `findOwner` helper and the inline `ForbiddenException`. Add `@Policies(CAN_EDIT_BOOK)` / `@Policies(CAN_DELETE_BOOK)` to the controller methods.
- [ ] **7.7** Migrate `CommentsService.remove` — drop the inline ownership check. Add `@Policies(CAN_DELETE_COMMENT)`.
- [ ] **7.8** Add unit tests:
  - `ownership.policy.spec.ts` — fake `BookRepository`, assert owner allows, non-owner forbids, missing resource throws NotFound.
  - `policies.guard.spec.ts` — fake `ModuleRef` and `Reflector`, assert policy chain.

**Why last:** the policies consume `BookRepository` and `CommentRepository` from Phase 4. The guard is the smallest change with the highest signal — it converts the authorization story from "scattered `if` checks" to "one decorator at the route".

---

### Phase 8 — Cleanup and verification

- [ ] **8.1** Remove dead code:
  - `AppController` / `AppService` / `app.controller.spec.ts` / `app.e2e-spec.ts` if the team agrees. Otherwise leave for now.
  - Dead exports in `BooksModule` (the `exports: [BooksService, CommentsService]` is unused — Phase 4 reveals this).
  - Redundant `imports: [DbModule]` from `ReadingGoalsModule` and `SocialModule` (the global module handles it; or remove `@Global` and import explicitly — pick one).
- [ ] **8.2** Add lint rules:
  - `@typescript-eslint/no-explicit-any: warn` (currently off in backend).
  - Custom rule or `no-restricted-syntax` blocking `process.env` outside `src/config/`.
  - `@typescript-eslint/no-console: error` outside `seed.ts` and the bootstrap `catch`.
- [ ] **8.3** Verify end-to-end:
  - `npm run build`
  - `npm run lint`
  - `npm run test` (all unit tests pass)
  - `npm run test:e2e` (existing e2e test still green)
  - Manual smoke test: `POST /api/auth/sign-up` → `POST /api/auth/sign-in` → `GET /api/books` → `POST /api/books/:id/borrow` → all return expected shapes.
- [ ] **8.4** Update `AGENTS.md` — add the new module structure, the test pattern, the policy pattern, the config pattern.

---

## Dependency graph

```
Phase 0 (deps)
  ↓
Phase 1 (ConfigService) ──── no other deps
  ↓
Phase 2 (Logger / CLS / Filter)
  ↓
Phase 3 (AuthPort) ──── uses ConfigService
  ↓
Phase 4 (Repositories + ReadModel) ──── no Phase 2/3 dependency
  ↓
Phase 5 (Comment-Rating tx fix) ──── uses Repositories
  ↓
Phase 6 (Split TransactionsService) ──── uses Repositories
  ↓
Phase 7 (Policies) ──── uses Repositories
  ↓
Phase 8 (Cleanup)
```

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Repository refactor breaks `findOne` / `findAll` shape and frontend breaks | Keep the `BookProjection` type *exactly* equivalent to the current `bookWithMeta` SQL result. Frontend doesn't change. |
| `nestjs-pino` upgrade in Phase 2 changes the response shape | `AllExceptionsFilter` controls the error response explicitly; success responses are unchanged. |
| `nestjs-cls` middleware ordering with `app.use('/api/auth', ...)` | Mount CLS middleware in `AppModule.configure(consumer)`; `app.use` mounts run after middleware in Express. The order in `main.ts` matters: middleware first, then `app.use`, then `await app.listen()`. |
| `applyDiscounts` moved to `pricing.ts` breaks the existing spec | Update the import in one line; test count and content unchanged. |
| `db.transaction(tx)` with `tx`-passing to repos has subtle issues with nested calls | All current `db.transaction` calls in `TransactionsService` are non-nested. After split, the same invariant holds. |
| Splitting `TransactionsService` while `transactions.module.ts` still has `stripeProvider` wired | `stripeProvider` is needed by `CheckoutService` and `PurchaseConfirmationService`; keep it in the module. |
| E2E test depends on the `Hello World!` controller and full `AppModule` | Either keep the controller (no harm) or remove + delete the e2e spec. The plan keeps both for now. |

## Out of scope (intentionally deferred)

- **Admin role / `Role` enum** — the policy system is forward-compatible; add when a real admin endpoint ships.
- **Stripe webhook handler** — orthogonal to this plan; out of scope.
- **Per-feature DTOs for `setGoal`, `createPost`, etc.** — the global `ValidationPipe` covers the main flows; the missing DTOs are a small follow-up.
- **Schema split** (per-domain schema files) — would help navigation but adds friction; defer until the schema file grows.
- **Caching layer** — premature.
- **Rate limiting** — orthogonal to testability/maintainability; defer.
- **CI / commit conventions** — orthogonal; defer.

## Success criteria

After all 8 phases:

1. `npm run test` runs a meaningful suite (≥20 tests covering pricing, borrow, checkout, confirmation, policies, ownership, repos).
2. `TransactionsService` no longer exists; three small services with focused tests replace it.
3. Every service is unit-testable with in-memory fakes — no live database required for service tests.
4. Every service emits structured logs with `requestId` and `userId` automatically.
5. Every error response carries a `requestId` for client correlation.
6. Every ownership check is a `@Policies(TOKEN)` decorator, not an inline `if`.
7. Configuration is a single typed `ConfigService`; no `process.env` outside `src/config/`.
8. Auth is a port; Better Auth is one adapter; tests use a fake.
9. Frontend is unchanged; no DB schema changes; e2e suite green.
