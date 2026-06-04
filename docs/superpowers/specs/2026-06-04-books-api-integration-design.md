# Book API & Backend Integration Design

## Goal

Replace mock book data with real PostgreSQL-backed API. Implement full book CRUD, like/unlike, comments, ratings, borrow/return/buy, and pagination — all authenticated via Better Auth.

## Database Schema

All tables use Drizzle ORM (`drizzle-orm/pg-core`) in `backend/src/db/schema.ts`.

### `books`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `text` | Primary key (UUID) |
| `title` | `text` | Not null |
| `author` | `text` | Not null |
| `price` | `numeric(10,2)` | Not null |
| `cover` | `text` | Not null (URL) |
| `synopsis` | `text` | Not null |
| `category` | `text` | Not null |
| `trending` | `boolean` | Default `false` |
| `createdBy` | `text` | FK → `user.id`, not null |
| `createdAt` | `timestamp` | Default `now()` |
| `updatedAt` | `timestamp` | Default `now()`, `$onUpdate` |

Note: `rating` is NOT stored on the book — it's computed as `AVG(ratings.rating)`.

### `likes`
| Column | Type | Constraints |
|--------|------|-------------|
| `bookId` | `text` | FK → `books.id`, onDelete cascade |
| `userId` | `text` | FK → `user.id`, onDelete cascade |
| `createdAt` | `timestamp` | Default `now()` |
| **PK** | | `(bookId, userId)` composite |

### `comments`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `text` | Primary key (UUID) |
| `bookId` | `text` | FK → `books.id`, onDelete cascade |
| `userId` | `text` | FK → `user.id`, onDelete cascade |
| `text` | `text` | Not null |
| `createdAt` | `timestamp` | Default `now()` |
| `updatedAt` | `timestamp` | Default `now()`, `$onUpdate` |

### `ratings`
| Column | Type | Constraints |
|--------|------|-------------|
| `bookId` | `text` | FK → `books.id`, onDelete cascade |
| `userId` | `text` | FK → `user.id`, onDelete cascade |
| `rating` | `integer` | Not null (1-5) |
| `createdAt` | `timestamp` | Default `now()` |
| **PK** | | `(bookId, userId)` composite |

### `borrows`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `text` | Primary key (UUID) |
| `bookId` | `text` | FK → `books.id`, onDelete cascade |
| `userId` | `text` | FK → `user.id`, onDelete cascade |
| `borrowedAt` | `timestamp` | Default `now()` |
| `returnedAt` | `timestamp` | Nullable — null means still borrowed |

### `purchases`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `text` | Primary key (UUID) |
| `bookId` | `text` | FK → `books.id`, onDelete cascade |
| `userId` | `text` | FK → `user.id`, onDelete cascade |
| `purchasedAt` | `timestamp` | Default `now()` |

## API Endpoints

All routes behind Better Auth session cookie. Auth required marked with 🔒. Owner-only marked with 🔑 (checks `createdBy` matches current user).

### Books

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/books` | — | List books with pagination. Query: `page` (default 1), `limit` (default 12), `category` (optional filter). Returns `{ data: Book[], meta: { page, limit, total, totalPages } }`. Each book includes `likeCount`, `commentCount`, `avgRating`, and if auth: `liked` (bool) and `userRating` (number or null). Trending books sorted by `avgRating` desc, top 3. |
| `GET` | `/api/books/:id` | — | Single book with `likeCount`, `commentCount`, `avgRating`, and if auth: `liked`, `userRating`, also `isBorrowed`, `isPurchased`. |
| `POST` | `/api/books` | 🔒 | Create book. Body: `title`, `author`, `price`, `cover`, `synopsis`, `category`, `trending`. Sets `createdBy` to current user. |
| `PUT` | `/api/books/:id` | 🔒🔑 | Update book. Owner only. Same body fields as create (all optional). |
| `DELETE` | `/api/books/:id` | 🔒🔑 | Delete book. Owner only. Cascades to likes, comments, ratings, borrows, purchases. |

### Likes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/books/:id/like` | 🔒 | Toggle like. If already liked, unlike. Returns `{ liked: boolean, likeCount: number }`. |

### Comments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/books/:id/comments` | — | List comments for a book. Includes `user` object (`id`, `name`, `image`). Sorted by `createdAt` desc. |
| `POST` | `/api/books/:id/comments` | 🔒 | Create comment. Body: `text`. Sets `userId` to current user. |
| `DELETE` | `/api/books/:id/comments/:commentId` | 🔒 | Delete own comment. Only the comment author can delete. |

### Ratings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/books/:id/rate` | 🔒 | Submit or update rating. Body: `rating` (1-5 integer). Upserts — one rating per user per book. Returns `{ avgRating: number, userRating: number }`. |

### Transactions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/books/:id/borrow` | 🔒 | Borrow a book. Creates borrow record with `borrowedAt`. Fails if already borrowed by user and not returned. |
| `POST` | `/api/books/:id/return` | 🔒 | Return a borrowed book. Sets `returnedAt` on the active borrow record. Fails if no active borrow. |
| `POST` | `/api/books/:id/buy` | 🔒 | Purchase a book. Creates purchase record. No-op if already purchased. |

### User Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/user/borrows` | 🔒 | List currently borrowed books (returnedAt IS NULL). Includes full book data. |
| `GET` | `/api/user/purchases` | 🔒 | List purchased books. Includes full book data. |

## NestJS Module Structure

```
backend/src/
├── books/
│   ├── books.module.ts          ← imports DRIZZLE, registers controllers + services, exports BooksService
│   ├── books.controller.ts      ← /api/books routes (CRUD)
│   ├── books.service.ts         ← book CRUD logic + pagination query builder
│   ├── likes.controller.ts      ← /api/books/:id/like
│   ├── likes.service.ts         ← toggle like logic
│   ├── comments.controller.ts   ← /api/books/:id/comments
│   ├── comments.service.ts      ← comment CRUD logic
│   ├── ratings.controller.ts    ← /api/books/:id/rate
│   └── ratings.service.ts       ← upsert rating + compute average
├── transactions/
│   ├── transactions.module.ts
│   ├── transactions.controller.ts  ← borrow/return/buy + user dashboard
│   └── transactions.service.ts
├── db/                          ← existing
├── auth/                        ← existing
├── app.module.ts                ← adds BooksModule + TransactionsModule
├── app.controller.ts            ← existing
└── main.ts                      ← existing
```

### Key patterns

- **Auth guard**: Existing `AuthGuard` from `auth/auth.guard.ts` — used on all 🔒 routes. No changes needed.
- **Owner check**: `BooksService.update()` and `BooksService.delete()` compare `createdBy` against current user's `id` from `@CurrentUser()`.
- **Pagination**: Offset-based. `books.service.ts` builds query with `.limit(limit).offset((page - 1) * limit)` plus a separate `SELECT COUNT(*)` for total.
- **Computed fields**: `likeCount`, `commentCount`, `avgRating` are subqueries or joins in the book list/detail query, not stored columns.

## Frontend Integration

### Nuxt proxy

Generalize `server/api/auth/[...].ts` → `server/api/[...].ts` so ALL `/api/*` requests are proxied to the backend (cookies, CORS, Set-Cookie headers).

### Store rewrites

- **`stores/books.ts`** — Replace mock data with `$fetch` calls to `/api/books`. Methods: `fetchBooks(page, limit, category)`, `fetchBook(id)`, `createBook(data)`, `updateBook(id, data)`, `deleteBook(id)`, `toggleLike(id)`, `fetchComments(id)`, `createComment(id, text)`, `deleteComment(id, commentId)`, `rateBook(id, rating)`. Maintain `liked`, `books`, `trending` as reactive state derived from API responses.
- **`stores/dashboard.ts`** — Replace mock data with `$fetch` calls to `/api/user/borrows` and `/api/user/purchases`. Methods: `fetchBorrows()`, `fetchPurchases()`, `borrowBook(id)`, `returnBook(id)`, `buyBook(id)`.

### Page updates

- **`feed.vue`** — `page` and `totalPages` come from API meta. `filteredBooks` fetched via `fetchBooks(page, limit, activeCategory)`. Remove hardcoded `totalPages = 10`.
- **`book/[id].vue`** — `book` fetched via `fetchBook(id)`. Reviews/comments fetched via `fetchComments(id)`. Like button calls `toggleLike(id)`. Rate via star click calling `rateBook(id, rating)`. Buy/Borrow calls real API.
- **`dashboard.vue`** — Borrowed/purchased lists fetched from `fetchBorrows()` / `fetchPurchases()`.
- **`BookCard.vue`** — Admin mode edit/delete buttons call `updateBook` / `deleteBook` with confirmation dialogs.

### Admin CRUD UI

- **New Book**: Add a "New Book" button (visible in adminMode) on the feed page that opens a form modal to create a book.
- **Edit Book**: The pencil icon on `BookCard.vue` (visible in adminMode) opens the same form modal pre-filled with book data.
- **Delete Book**: The trash icon triggers a confirmation dialog, then calls `deleteBook(id)`.

## Error Handling

- API returns standard HTTP status codes: `200` (success), `201` (created), `400` (bad request), `401` (unauthorized), `403` (forbidden — not owner), `404` (not found), `409` (conflict — already borrowed).
- Error responses: `{ message: string, statusCode: number }`.
- Frontend stores catch and surface errors via a `error` ref or toast notification (to be added later).

## Non-Goals

- No email verification, password reset, or OAuth
- No real payment integration (Buy is a record, not a charge)
- No due dates or late-return enforcement on borrows
- No image upload (cover remains a URL string)
