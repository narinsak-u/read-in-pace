# Data Fetching Composables Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use `- [ ]` syntax.

**Goal:** Refactor frontend data fetching into 7 domain-level composables with channel-based invalidation, removing `library.ts`.

**Architecture:** Module-level `channels` reactive map tracks invalidation counters. Composables subscribe via `watch`. Mutations call `invalidate(...)` on success, triggering re-fetches. `useBorrows` uses module-level state so callers share `borrowedSlugs`.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, TypeScript

## Task sequence

1. Create `useInvalidate.ts` — invalidation channel system
2. Create `useBorrows.ts` — singleton borrows + slug state
3. Create `useBooks.ts` — book listing (trending, search, filter, pagination)
4. Create `useBook.ts` — single book fetch, like, rate
5. Create `useBookComments.ts` — comments CRUD + replies + likes
6. Create `useFeed.ts` — social feed posts
7. Create `usePurchases.ts` — purchase history + confirmation
8. Update `BookHero.vue` to use `useBook`
9. Update `BookBorrowCard.vue` to use `useBorrows`
10. Update `BookReviews.vue` to use `useBookComments`
11. Update `ReaderFeed.vue` to use `useFeed`
12. Update `NewArrivals.vue` to use `useBooks`
13. Update `ActiveLoans.vue` to use `useBorrows` + `useBooks`
14. Update `dashboard.vue` to use `usePurchases`
15. Delete `library.ts`

## Composable contracts

### `useInvalidate()`
- Returns `{ invalidate(...channels), onInvalidate(channel, cb) }`
- Module-level `reactive<Record<string, number>>` — shared by all callers

### `useBorrows()` (singleton)
- Module-level refs: `borrows`, `borrowsPage`, `borrowsMeta`, `borrowsLoaded`, `borrowError`, `borrowedSlugs`
- Methods: `fetchBorrows(page, append?)`, `loadMoreBorrows()`, `borrowBook(bookId, slug)`, `returnBook(bookId, slug)`
- Auto-inits `borrowedSlugs` on `auth.signedIn` change
- `borrowBook`/`returnBook` call `invalidate('borrows', 'books')`

### `useBooks(options?)`
- Accepts reactive `{ page?, limit?, category?, query? }`
- Returns `{ books, filtered, meta, pageNumbers, page, category, query, loading, error, refresh, borrow, return }`
- Subscribes to `'books'` and `'borrows'` invalidation channels

### `useBook(bookId)`
- Fetches book + like status + user rating
- Returns `{ book, liked, likeCount, userRating, loading, error, refresh, toggleLike, setRating }`
- `toggleLike` is optimistic with rollback; calls `invalidate('books')`

### `useBookComments(bookId)`
- Fetches comments with mapping (initials, timeAgo, replies)
- Returns `{ reviews, loading, error, refresh, addComment, addReply, toggleLike }`
- `toggleLike` is optimistic; mutations call `invalidate('comments:{id}', 'books')`

### `useFeed()`
- Fetches `/api/feed` on init
- Returns `{ posts, loading, error, replySubmittingId, refresh, toggleLike, publishReply }`
- `publishReply` calls `invalidate('feed')`

### `usePurchases()`
- Returns `{ purchases, loaded, loading, error, refresh, confirmPurchase }`
- `confirmPurchase` calls `invalidate('purchases')`

## Channels

| Channel | Subscribers | Invalidated by |
|---|---|---|
| `'books'` | `useBooks`, `useBook` | `useBorrows` (borrow/return), `useBook` (like/rate), `useBookComments` (comment) |
| `'borrows'` | `useBooks`, `useBorrows` | `useBorrows` (borrow/return) |
| `'feed'` | `useFeed` | `useFeed` (reply) |
| `'purchases'` | `usePurchases` | `usePurchases` (confirm) |
| `'comments:{id}'` | `useBookComments` | `useBookComments` (addComment, addReply) |

## Key code

### `useBook.ts` (reference — apply same pattern to all composables)

```ts
import { ref, shallowRef, readonly, watch, toRef } from 'vue'
import { mapBookResponse } from '~/types/book'
import { useAuthStore } from '~/stores/auth'
import { useInvalidate } from '~/composables/useInvalidate'

export function useBook(bookId: string | Ref<string>) {
  const id = toRef(bookId)
  const auth = useAuthStore()
  const { invalidate, onInvalidate } = useInvalidate()

  const book = ref<Book | null>(null)
  const liked = shallowRef(false)
  const likeCount = shallowRef(0)
  const userRating = shallowRef<number | null>(null)
  const loading = shallowRef(true)
  const error = shallowRef<unknown>(null)

  async function fetch() {
    loading.value = true; error.value = null
    try {
      const raw = await $fetch<Record<string, unknown>>(`/api/books/${id.value}`)
      book.value = mapBookResponse(raw)
      if (auth.signedIn) {
        try {
          const likeRes = await $fetch<{ liked: boolean }>(`/api/books/${id.value}/like`)
          liked.value = likeRes.liked
          const ratingRes = await $fetch<number | null>(`/api/books/${id.value}/rate`)
          userRating.value = ratingRes
        } catch { /* not authenticated */ }
      }
    } catch (e) { error.value = e; book.value = null }
    finally { loading.value = false }
  }

  async function toggleLike() {
    if (!auth.signedIn) { auth.openAuthModal(() => { void toggleLike() }); return }
    const prevLiked = liked.value; const prevCount = likeCount.value
    liked.value = !liked.value; likeCount.value += liked.value ? 1 : -1
    try {
      const res = await $fetch<{ liked: boolean; likeCount: number }>(`/api/books/${id.value}/like`, { method: 'POST' })
      liked.value = res.liked; likeCount.value = res.likeCount
      invalidate('books')
    } catch { liked.value = prevLiked; likeCount.value = prevCount }
  }

  async function setRating(rating: number) {
    if (!auth.signedIn) { auth.openAuthModal(() => { void setRating(rating) }); return }
    await $fetch(`/api/books/${id.value}/rate`, { method: 'POST', body: { rating } })
    userRating.value = rating; invalidate('books')
  }

  watch(id, () => fetch(), { immediate: true })
  onInvalidate(`book:${id.value}`, () => fetch())

  return {
    book: readonly(book), liked: readonly(liked), likeCount: readonly(likeCount),
    userRating, loading: readonly(loading), error: readonly(error),
    refresh: fetch, toggleLike, setRating,
  }
}
```

## Component migration notes

- **BookHero**: Remove `checkLikeStatus`, `checkUserRating`, `onMounted` — `useBook` handles this. Template stays the same.
- **BookBorrowCard**: Replace `store` + `borrowed` ref with `useBorrows().borrowedSlugs` + `computed isBorrowed`. Borrow via `borrowBook()`.
- **BookReviews**: Remove all inline `$fetch`, `fetchComments`, `toggleLike` — use `useBookComments`.
- **ReaderFeed**: Remove `fetchFeed`, `toggleLike`, `publishReply`, `posts`/`loaded` refs — use `useFeed`. Change `v-if="!loaded"` to `v-if="loading"`.
- **NewArrivals**: Replace `useFetch` + `rawPage` with `useBooks`. Remove `watch(page)`, `watch(category)`, `watch(query)`. Use `loading` from composable.
- **ActiveLoans**: Replace `store.fetchBorrows`/`store.fetchTrending` with `useBorrows()` + `useBooks()`. Remove `borrowRefreshKey` watch. Template: `store.borrows` → `borrows`, `store.trendingBooks` → `trendingBooks`, `store.borrowError` → `borrowError`, etc.
- **dashboard**: Replace inline `$fetch` + `purchases`/`loaded` refs with `usePurchases()`.
- **library.ts**: Delete after confirming no remaining imports.

## Verification

After all tasks, run `npm run dev` from `frontend/` and verify:
- `/feed` — trending + borrows + new arrivals + reader feed load
- `/book/[id]` — book detail with likes, ratings, comments
- `/dashboard` — purchase history
- Borrow/return updates stock and borrowed status immediately
