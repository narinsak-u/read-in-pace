# Book Status Store — Design

## Problem

`borrowedSlugs`, `borrowBook`, and `returnBook` live inside the `useBorrows` composable,
which also manages borrow-list pagination. Purchase-ownership data (`purchasedCounts`)
has no reactive frontend presence at all. This causes:

- `BookCard` cannot show "You own N copy" or block re-buying
- Cart page cannot show ownership status
- `useBooks` composable imports `useBorrows()` internally just for status, creating coupling
- The buy flow has no "you already own this" guard

## Solution

A focused Pinia store (`useBookStatusStore`) that owns only user→book relationship maps:

- `borrowedSlugs: Set<string>` — which books are currently borrowed
- `purchasedCounts: Map<string, number>` — how many copies of each book the user owns
- Borrow/return actions with optimistic local updates
- Auto-init on sign-in, auto-clear on sign-out
- Invalidation hooks so purchases refetch after Stripe confirmation

Composables drop their status-tracking responsibilities and keep only data-fetching/pagination.

## Store API

```ts
// stores/bookStatus.ts
defineStore('bookStatus', () => {
  // State
  const borrowedSlugs = shallowRef<Set<string>>(new Set())
  const purchasedCounts = shallowRef<Map<string, number>>(new Map())
  const loaded = shallowRef(false)

  // Actions
  async function init()              // fetch both from API
  async function borrow(bookId, slug)  // optimistic add + POST
  async function returnBook(bookId, slug)  // optimistic remove + POST
  async function refreshPurchases()   // re-fetch purchases only
  function clear()                    // reset on sign-out

  // Init on sign-in
  watch(() => auth.signedIn, (val) => { val ? init() : clear() }, { immediate: true })
  onInvalidate('purchases', () => refreshPurchases())

  return { borrowedSlugs, purchasedCounts, loaded, borrow, returnBook, refreshPurchases }
})
```

## Data flow

### Init
```
auth.signedIn = true → init()
  Promise.all([
    GET /api/user/borrows?page=1&limit=100  → borrowedSlugs = Set(slugs)
    GET /api/user/purchases                  → purchasedCounts = Map(slug → count)
  ])
```

### Borrow
```
borrow(bookId, slug)
  borrowedSlugs.add(slug)                          // optimistic
  POST /api/books/:bookId/borrow                   // API
  invalidate('borrows', 'books')                   // refetch lists
```

### Return
```
returnBook(bookId, slug)
  borrowedSlugs.delete(slug)                       // optimistic
  POST /api/books/:bookId/return                   // API
  invalidate('borrows', 'books')
```

### Purchase confirm
```
POST /api/confirm-purchase?session_id=XXX          // API (unchanged)
invalidate('purchases')                            // triggers store refreshPurchases
```

### Sign-out
```
clear()
  borrowedSlugs = new Set()
  purchasedCounts = new Map()
```

## Consumer changes

### `useBorrows` composable
- **Remove:** `borrowedSlugs`, `borrowBook`, `returnBook`
- **Keep:** borrow list, pagination, `fetchBorrows`, `loadMoreBorrows`

### `usePurchases` composable
- **No change.** Keeps raw purchase list for dashboard display + `confirmPurchase`.

### `useBooks` composable
- **Remove:** internal `useBorrows()` call
- **Remove:** `borrow()` and `returnBook()` methods
- **Keep:** book fetching, filtering, pagination

### `stock.ts` utility
```ts
export interface StockActions {
  isBorrowed: boolean
  isPurchased: boolean
  ownedCount: number
  canBuy: boolean
  canBorrow: boolean
  unavailable: boolean
}
```
New 3rd param `purchasedCounts: Map<string, number>`.

### `BookCard.vue`
- Reads `purchasedCounts` from store (or receives via updated `stockActions`)
- Shows `You own N` badge below price when `isPurchased`
- Buy button: if `isPurchased`, shows confirm modal before checkout

### `cart.vue`
- Each cart item reads `ownedCount` from store
- Shows `You own N copy` below price when `owned > 0`

### `NewArrivals.vue`
- Uses `useBookStatusStore()` instead of destructuring `borrowedSlugs` from `useBorrows()`

### `ActiveLoans.vue`
- Uses `useBookStatusStore()` for `borrowBook`/`returnBook` instead of `useBorrows()`

### `BookBorrowCard.vue`
- Uses `useBookStatusStore()` for `borrowedSlugs` instead of `useBorrows()`

### `TrendingSection.vue`
- Receives `borrowedSlugs` as prop (from store, passed by parent) — no change needed if already receiving as prop

## Buy flow guard

When the user clicks "Buy" on `BookCard` or `BookBorrowCard`:

1. Check `purchasedCounts.get(slug)`
2. If `> 0`, show a confirm dialog: "You already own N copy. Are you sure you want to buy more?"
3. If user confirms, proceed to `cart.addItem()` or checkout
4. If not owned, proceed directly
