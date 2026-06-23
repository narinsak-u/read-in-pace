# Data Fetching Composables Refactor

## Goal

Refactor all frontend data fetching into domain-level composables so that:
- Each data domain has a single, consistent fetch pattern
- Cache invalidation is predictable — mutations auto-trigger re-fetches via channels
- Components are thinner (no inline `$fetch` + `onMounted` boilerplate)
- `library.ts` store is removed (its logic moves to composables)

## Architecture

### Invalidation system (`composables/useInvalidate.ts`)

A lightweight reactive channel system. Module-level `reactive` map stores a counter per channel. Subscribers watch their channels and re-fetch when the counter changes.

```ts
const channels = reactive<Record<string, number>>({})

export function useInvalidate() {
  function invalidate(...keys: string[]) {
    for (const key of keys) channels[key] = (channels[key] ?? 0) + 1
  }
  function onInvalidate(key: string, cb: () => void) {
    watch(() => channels[key], () => cb())
  }
  return { invalidate, onInvalidate }
}
```

Channels used:
- `'books'` — re-fetch current book listing
- `'borrows'` — re-fetch borrow list + borrowed slugs
- `'feed'` — re-fetch social feed
- `'purchases'` — re-fetch purchase history
- `'comments:{bookId}'` — re-fetch comments for a specific book

### Composable structure

Each data composable follows this pattern:
1. Accept `MaybeRef` params (via `toRef`)
2. Set up `onInvalidate` subscriptions
3. Call initial fetch via `watch(id, fetch, { immediate: true })` or manual
4. Return `readonly(data)`, `loading`, `error`, `refresh`, and mutation functions
5. Mutation functions call `invalidate(...)` on success

### Composable reference

| Composable | Channels subscribed | Channels invalidated | Notes |
|---|---|---|---|
| `useBooks` | `books`, `borrows` | — | Calls `invalidate('borrows', 'books')` on borrow/return |
| `useBook` | `book:{id}` | `book:{id}` | Calls `invalidate('book:{id}', 'books')` on like/rate |
| `useBookComments` | `comments:{bookId}`, `borrows` | `comments:{bookId}` | Calls `invalidate('comments:{bookId}', 'books')` after CRUD |
| `useBorrows` | `borrows` | `borrows`, `books` | Singleton module-level state for borrowedSlugs |
| `useFeed` | `feed` | `feed` | |
| `usePurchases` | `purchases` | `purchases` | |

### Module-level shared state (`useBorrows`)

`borrowedSlugs` is the one piece of state shared across many components. It lives as module-level state inside `useBorrows.ts`, so all callers get the same reactive `Set<string>`. No Pinia store needed.

```ts
// Module-level singleton state
const borrowedSlugs = ref<Set<string>>(new Set())
const borrows = ref<BorrowItem[]>([])
// ...

export function useBorrows() {
  // ... all callers share the same refs above
}
```

This means `library.ts` is removed entirely.

## Files to create

1. `frontend/composables/useInvalidate.ts`
2. `frontend/composables/useBooks.ts`
3. `frontend/composables/useBook.ts`
4. `frontend/composables/useBookComments.ts`
5. `frontend/composables/useBorrows.ts`
6. `frontend/composables/useFeed.ts`
7. `frontend/composables/usePurchases.ts`

## Files to modify/remove

- `frontend/stores/library.ts` — **DELETE** (replaced by `useBorrows` + `useBooks`)
- `frontend/pages/book/[id].vue` — Replace `useFetch` with `useBook`
- `frontend/pages/dashboard.vue` — Replace inline `$fetch` with `usePurchases`
- `frontend/pages/feed.vue` — Pass fewer props to children (composables called in children)
- `frontend/components/book/BookHero.vue` — Use `useBook`
- `frontend/components/book/BookBorrowCard.vue` — Use `useBorrows`
- `frontend/components/reviews/BookReviews.vue` — Use `useBookComments`
- `frontend/components/social/ReaderFeed.vue` — Use `useFeed`
- `frontend/components/browse/NewArrivals.vue` — Use `useBooks`
- `frontend/components/loan/ActiveLoans.vue` — Use `useBooks` + `useBorrows`
- `frontend/components/browse/TrendingSection.vue` — No change (data passed via props)
- `frontend/components/loan/LoansSection.vue` — No change (data passed via props)
- `frontend/components/Nav.vue` — No change (uses auth store only)
- `frontend/components/auth/ProfileDropdown.vue` — No change

## Migration steps (per file)

### 1. `composables/useInvalidate.ts`
Create with the channel-based reactive system described above.

### 2. `composables/useBooks.ts`
- Accept `MaybeRef` for `page`, `limit`, `category`, `query`
- Fetch `/api/books` with query params
- Provide `borrow(bookId, slug)` and `return(bookId, slug)` that call API + `invalidate('borrows', 'books')`
- Return `books`, `meta`, `loading`, `error`, `page`, `category`, `query` (two-way), `refresh`, `borrow`, `return`

### 3. `composables/useBook.ts`
- Accept `MaybeRef<bookId>`
- Fetch `/api/books/{id}` via `useFetch` (SSR-friendly) + like status + user rating on mount
- `toggleLike()` — optimistic update, POST API, invalidate `book:{id}`
- `setRating(rating)` — POST API, invalidate `book:{id}`
- Return `book`, `liked`, `likeCount`, `userRating`, `loading`, `error`, `toggleLike`, `setRating`, `refresh`

### 4. `composables/useBookComments.ts`
- Accept `MaybeRef<bookId>`
- Fetch `/api/books/{id}/comments`
- `addComment(text, rating)`, `addReply(parentId, text)` — POST, invalidate `comments:{id}`
- `toggleLike(commentId)` — optimistic, POST/DELETE, invalidate `comments:{id}` on failure for consistency
- Return `comments`, `loading`, `error`, `refresh`, `addComment`, `addReply`, `toggleLike`

### 5. `composables/useBorrows.ts`
- Module-level singleton state for `borrows`, `borrowsMeta`, `borrowsLoaded`, `borrowError`, `borrowedSlugs`
- `fetchBorrows(page, append?)` — GET `/api/user/borrows`
- `loadMore()` — increment page + append
- `initBorrowedSlugs()` — fetch all borrows to populate slugs
- `borrowBook(bookId, slug)` — POST `/api/books/{id}/borrow`, add slug, invalidate
- `returnBook(bookId, slug)` — POST `/api/books/{id}/return`, remove slug, invalidate
- Watch `auth.signedIn` to auto-init slugs or clear state

### 6. `composables/useFeed.ts`
- Fetch `/api/feed`
- `toggleLike(postId)` — optimistic, POST, invalidate `feed`
- `publishReply(postId, text)` — POST, invalidate `feed`
- Return `posts`, `loading`, `error`, `refresh`, `toggleLike`, `publishReply`

### 7. `composables/usePurchases.ts`
- `fetchPurchases()` — GET `/api/user/purchases`
- `confirmPurchase(sessionId)` — POST `/api/confirm-purchase`, invalidate `purchases`
- Return `purchases`, `loading`, `error`, `refresh`, `fetchPurchases`, `confirmPurchase`

## Component migration notes

### `BookHero.vue`
- Remove `flash` prop — use composable's built-in flash or parent notification
- Remove `book` prop + `bookId` prop → use `useBook(toRef(props, 'bookId'))`
- Emit events upward for notifications (or keep flash prop)

### `BookBorrowCard.vue`
- Remove `store` usage → use `useBorrows().borrowBook(bookId, slug)`
- Buy still uses `$fetch` directly (one-off Stripe checkout)

### `BookReviews.vue`
- Remove all inline `$fetch` calls → use `useBookComments(toRef(props, 'bookId'))`
- `flash` prop can stay for success/error notifications

### `ReaderFeed.vue`
- Remove all inline `$fetch` calls → use `useFeed()`
- Remove `flash` prop → get flash from composable

### `NewArrivals.vue`
- Replace `useFetch` with `useBooks()`
- Borrow/return handlers → use composable's methods (which auto-refresh)

### `ActiveLoans.vue`
- Replace `store.fetchBorrows()`, `store.fetchTrending()` → `useBorrows()` + `useBooks()`
- Remove `store.borrowRefreshKey` watch → invalidation system handles this

### `dashboard.vue`
- Replace inline `$fetch` → `usePurchases()`
- `flash` can stay or come from composable

### `library.ts`
- DELETE entirely. Everything moves to `useBorrows` or `useBooks`.

## Anti-regression checks

After migration:
- `/feed` page loads trending, borrows, new arrivals, reader feed correctly
- Book detail page shows likes, rating, comments (with like)
- Borrow + return updates stock counts and borrowed slugs everywhere
- Purchase flow works (Stripe → confirm → list)
