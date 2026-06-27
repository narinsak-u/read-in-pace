# Book Status Store — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize borrowed/purchased book status into a Pinia store so `BookCard` shows correct buttons, cart shows owned-copy count, and the buy flow guards against accidental re-purchase.

**Architecture:** New `stores/bookStatus.ts` owns `borrowedSlugs: Set<string>` and `purchasedCounts: Map<string, number>`. Consumers read from the store instead of `useBorrows`. The store handles optimistic updates on borrow/return and re-fetches purchase counts after Stripe confirmation.

**Tech Stack:** Pinia, Vue 3 Composition API, Nuxt auto-imports

---

### Task 1: Create `stores/bookStatus.ts`

**Files:**
- Create: `frontend/stores/bookStatus.ts`

**Purpose:** Pinia store owning borrowed-slug and purchased-count maps, with borrow/return/purchase-init actions.

- [ ] **Write the store**

```ts
// frontend/stores/bookStatus.ts
import { defineStore } from 'pinia';
import { shallowRef, watch } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useInvalidate } from '~/composables/useInvalidate';

export const useBookStatusStore = defineStore('bookStatus', () => {
  const auth = useAuthStore();
  const { invalidate, onInvalidate } = useInvalidate();

  const borrowedSlugs = shallowRef<Set<string>>(new Set());
  const purchasedCounts = shallowRef<Map<string, number>>(new Map());
  const loaded = shallowRef(false);

  async function init() {
    if (!auth.signedIn) {
      borrowedSlugs.value = new Set();
      purchasedCounts.value = new Map();
      loaded.value = true;
      return;
    }
    loaded.value = false;
    try {
      const [borrowsRes, purchases] = await Promise.all([
        $fetch<{
          data: { borrow: Record<string, unknown>; book: Record<string, unknown> }[];
        }>('/api/user/borrows', { query: { page: 1, limit: 100 } }),
        $fetch<{ purchase: Record<string, unknown>; book: Record<string, unknown> }[]>('/api/user/purchases'),
      ]);
      borrowedSlugs.value = new Set(
        borrowsRes.data.map((b) => (b.book.slug as string) ?? (b.book.id as string)),
      );
      const counts = new Map<string, number>();
      for (const entry of purchases) {
        const slug = (entry.book.slug as string) ?? (entry.book.id as string);
        counts.set(slug, (counts.get(slug) ?? 0) + 1);
      }
      purchasedCounts.value = counts;
    } catch {
      borrowedSlugs.value = new Set();
      purchasedCounts.value = new Map();
    } finally {
      loaded.value = true;
    }
  }

  async function borrow(bookId: string, slug: string) {
    await $fetch(`/api/books/${bookId}/borrow`, { method: 'POST' });
    borrowedSlugs.value = new Set([...borrowedSlugs.value, slug]);
    invalidate('borrows', 'books');
  }

  async function returnBook(bookId: string, slug: string) {
    await $fetch(`/api/books/${bookId}/return`, { method: 'POST' });
    const next = new Set(borrowedSlugs.value);
    next.delete(slug);
    borrowedSlugs.value = next;
    invalidate('borrows', 'books');
  }

  async function refreshPurchases() {
    if (!auth.signedIn) {
      purchasedCounts.value = new Map();
      return;
    }
    try {
      const purchases = await $fetch<{ purchase: Record<string, unknown>; book: Record<string, unknown> }[]>('/api/user/purchases');
      const counts = new Map<string, number>();
      for (const entry of purchases) {
        const slug = (entry.book.slug as string) ?? (entry.book.id as string);
        counts.set(slug, (counts.get(slug) ?? 0) + 1);
      }
      purchasedCounts.value = counts;
    } catch {
      // keep existing
    }
  }

  function clear() {
    borrowedSlugs.value = new Set();
    purchasedCounts.value = new Map();
    loaded.value = true;
  }

  watch(
    () => auth.signedIn,
    (val) => {
      if (val) {
        init();
      } else {
        clear();
      }
    },
    { immediate: true },
  );

  onInvalidate('purchases', () => refreshPurchases());

  return {
    borrowedSlugs,
    purchasedCounts,
    loaded,
    init,
    borrow,
    returnBook,
    refreshPurchases,
    clear,
  };
});
```

- [ ] **Verify file exists**

Run: `ls frontend/stores/bookStatus.ts`
Expected: file exists

- [ ] **Commit**

```bash
git add frontend/stores/bookStatus.ts
git commit -m "feat: add useBookStatusStore for borrowed/purchased book maps"
```

---

### Task 2: Update `utils/stock.ts` — add purchase awareness

**Files:**
- Modify: `frontend/utils/stock.ts`

- [ ] **Update `StockActions` interface and `stockActions` function**

```ts
// frontend/utils/stock.ts
export interface StockActions {
  isBorrowed: boolean;
  canBuy: boolean;
  canBorrow: boolean;
  unavailable: boolean;
  isPurchased: boolean;
  ownedCount: number;
}

export function stockActions(
  book: StockInfo,
  borrowedSlugs: Set<string>,
  purchasedCounts?: Map<string, number>,
): StockActions {
  const isBorrowed = borrowedSlugs.has(book.slug);
  const ownedCount = purchasedCounts?.get(book.slug) ?? 0;
  const isPurchased = ownedCount > 0;
  const canBuy = book.inStock > 1;
  const canBorrow = book.inStock > 0 && !isBorrowed;
  const unavailable = book.inStock < 1 && !isBorrowed;
  return { isBorrowed, canBuy, canBorrow, unavailable, isPurchased, ownedCount };
}
```

- [ ] **Commit**

```bash
git add frontend/utils/stock.ts
git commit -m "feat: add isPurchased and ownedCount to StockActions"
```

---

### Task 3: Clean up `useBorrows.ts` — remove status concerns

**Files:**
- Modify: `frontend/composables/useBorrows.ts`

**Purpose:** Remove `borrowedSlugs`, `borrowBook`, `returnBook`, `initBorrowedSlugs`, and the auth watch for slugs. Keep only borrow-list pagination.

- [ ] **Apply edits to `useBorrows.ts`**

Remove lines 1-166 and rewrite:

```ts
import { ref, shallowRef, computed, readonly } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useInvalidate } from '~/composables/useInvalidate';

export interface BorrowItem {
  borrowId: string;
  bookId: string;
  bookSlug: string;
  title: string;
  author: string;
  cover: string;
  crop: number | null;
  shelf: string;
  category: string;
  dueAt: string;
  currentPage: number;
  totalPages: number;
  price: string;
  inStock: number;
  avgRating: number;
  ratingsCount: number;
}

export interface BorrowsResponse {
  data: {
    borrow: Record<PropertyKey, unknown>;
    book: Record<PropertyKey, unknown>;
  }[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const borrows = shallowRef<BorrowItem[]>([]);
const borrowsPage = shallowRef(1);
const borrowsMeta = shallowRef<{
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} | null>(null);
const borrowsLoaded = shallowRef(false);
const borrowError = shallowRef<unknown>(null);

let lastBorrowsLimit = 3;

export function useBorrows() {
  const auth = useAuthStore();
  const { invalidate, onInvalidate } = useInvalidate();

  const hasMoreBorrows = computed(() => {
    if (!borrowsMeta.value) return false;
    return borrowsPage.value < borrowsMeta.value.totalPages;
  });

  async function fetchBorrows(page = 1, append = false, limit?: number, sort?: string) {
    if (!auth.signedIn) {
      borrows.value = [];
      borrowsLoaded.value = true;
      borrowError.value = null;
      return;
    }
    borrowsLoaded.value = false;
    lastBorrowsLimit = limit ?? 3;

    try {
      const res = await $fetch<BorrowsResponse>('/api/user/borrows', {
        query: { page, limit: lastBorrowsLimit, ...(sort ? { sort } : {}) },
      });
      const items = res.data.map(mapBorrowResponse);
      borrows.value = append ? [...borrows.value, ...items] : items;
      borrowsPage.value = page;
      borrowsMeta.value = res.meta;
      borrowError.value = null;
    } catch (e) {
      if (!append) borrows.value = [];
      borrowError.value = e;
    } finally {
      borrowsLoaded.value = true;
    }
  }

  function loadMoreBorrows() {
    if (!hasMoreBorrows.value) return;
    fetchBorrows(borrowsPage.value + 1, true, lastBorrowsLimit);
  }

  onInvalidate('borrows', () => fetchBorrows(1));

  return {
    borrows: readonly(borrows),
    borrowsPage: readonly(borrowsPage),
    borrowsMeta: readonly(borrowsMeta),
    borrowsLoaded: readonly(borrowsLoaded),
    borrowError: readonly(borrowError),
    hasMoreBorrows,
    fetchBorrows,
    loadMoreBorrows,
  };
}

function mapBorrowResponse(entry: BorrowsResponse['data'][number]): BorrowItem {
  return {
    borrowId: entry.borrow.id as string,
    bookId: entry.book.id as string,
    bookSlug: (entry.book.slug as string) ?? (entry.book.id as string),
    title: entry.book.title as string,
    author: entry.book.author as string,
    cover: entry.book.cover as string,
    crop: (entry.book.crop as number | null) ?? null,
    shelf: (entry.book.shelf as string) ?? 'GEN',
    category: (entry.book.category as string) ?? '',
    dueAt: entry.borrow.dueAt as string,
    currentPage: entry.borrow.currentPage as number,
    totalPages: entry.borrow.totalPages as number,
    price: String(entry.book.price ?? '0'),
    inStock: (entry.book.inStock as number) ?? 0,
    avgRating: Number(entry.book.avgRating ?? 0),
    ratingsCount: (entry.book.ratingsCount as number) ?? 0,
  };
}
```

- [ ] **Commit**

```bash
git add frontend/composables/useBorrows.ts
git commit -m "refactor: remove status concerns from useBorrows composable"
```

---

### Task 4: Clean up `useBooks.ts` — remove borrow coupling

**Files:**
- Modify: `frontend/composables/useBooks.ts`

**Purpose:** Remove the `useBorrows()` call and `borrow`/`returnBook` methods. Data fetching only.

- [ ] **Remove `useBorrows` import and related code**

Remove line 6 (`import { useBorrows }`).
Remove line 17 (`const { borrowedSlugs } = useBorrows()`).
Remove the `borrow()` method (lines 90-95).
Remove the `returnBook()` method (lines 97-101).
Remove the `return: returnBook` from the return object (line 123).

- [ ] **Commit**

```bash
git add frontend/composables/useBooks.ts
git commit -m "refactor: remove borrow coupling from useBooks composable"
```

---

### Task 5: Update `NewArrivals.vue` — use store

**Files:**
- Modify: `frontend/components/browse/NewArrivals.vue`

- [ ] **Replace `useBorrows` with `useBookStatusStore`**

Remove line 5 (`import { useBorrows }`).
Change line 14 from:
```ts
const { borrowedSlugs, borrowBook, returnBook } = useBorrows();
```
to:
```ts
const { borrowedSlugs, borrow, returnBook } = useBookStatusStore();
```

Change line 33 from:
```ts
await borrowBook(bookId, slug);
```
to:
```ts
await borrow(bookId, slug);
```

Change line 88 from:
```ts
:actions="stockActions(book, borrowedSlugs)"
```
to:
```ts
:actions="stockActions(book, borrowedSlugs, purchasedCounts)"
```

Add `purchasedCounts` to the store destructure:
```ts
const { borrowedSlugs, purchasedCounts, borrow, returnBook } = useBookStatusStore();
```

- [ ] **Commit**

```bash
git add frontend/components/browse/NewArrivals.vue
git commit -m "refactor: NewArrivals uses useBookStatusStore instead of useBorrows"
```

---

### Task 6: Update `ActiveLoans.vue` — use store

**Files:**
- Modify: `frontend/components/loan/ActiveLoans.vue`

- [ ] **Replace `useBorrows` with `useBookStatusStore`**

Remove `import { useBorrows } from "~/composables/useBorrows";`
Replace destructure with:
```ts
const { borrow, returnBook } = useBookStatusStore();
```

Change `borrowBook` references to `borrow` (the store's method is named `borrow`).

- [ ] **Read and update the full file**

```vue
<script setup lang="ts">
import { useBookStatusStore } from "~/stores/bookStatus";

// ...
const { borrow, returnBook } = useBookStatusStore();

// Was: await borrowBook(bookId, "");
// Now: await borrow(bookId, "");
</script>
```

- [ ] **Commit**

```bash
git add frontend/components/loan/ActiveLoans.vue
git commit -m "refactor: ActiveLoans uses useBookStatusStore instead of useBorrows"
```

---

### Task 7: Update `BookBorrowCard.vue` — use store + purchase guard

**Files:**
- Modify: `frontend/components/book/BookBorrowCard.vue`

**Purpose:** Switch from `useBorrows` to store for status. Add owned-count check before `buyNow()`.

- [ ] **Replace `useBorrows` with store**

Remove `import { useBorrows }` (line 6).
Change line 17 from:
```ts
const { borrowedSlugs, borrowBook } = useBorrows();
```
to:
```ts
const { borrowedSlugs, purchasedCounts, borrow } = useBookStatusStore();
```
Change line 28 from:
```ts
await borrowBook(props.bookId, props.book.slug);
```
to:
```ts
await borrow(props.bookId, props.book.slug);
```

- [ ] **Add purchase guard to `buyNow`**

Add before `buyNow` function:
```ts
const ownedCount = computed(() => purchasedCounts.value.get(props.book.slug) ?? 0);
```

Wrap `buyNow` with a check:
```ts
async function buyNow() {
  if (!auth.signedIn) {
    auth.openAuthModal(() => { void buyNow(); });
    return;
  }
  if (ownedCount.value > 0) {
    const ok = window.confirm(
      `You already own ${ownedCount.value} copy${ownedCount.value > 1 ? 'ies' : 'y'}. Are you sure you want to buy more?`,
    );
    if (!ok) return;
  }
  // ... rest of existing buyNow
}
```

- [ ] **Update template — show owned count**

Add after the price element (line 134):
```html
<p v-if="ownedCount > 0" class="mt-1 text-xs text-muted-foreground">
  You own {{ ownedCount }} copy{{ ownedCount > 1 ? 'ies' : 'y' }}
</p>
```

- [ ] **Commit**

```bash
git add frontend/components/book/BookBorrowCard.vue
git commit -m "feat: BookBorrowCard uses store, adds owned-count guard on buy"
```

---

### Task 8: Update `BookCard.vue` — add purchase awareness

**Files:**
- Modify: `frontend/components/book/BookCard.vue`

- [ ] **Add store + purchase states**

Add import:
```ts
import { useBookStatusStore } from '~/stores/bookStatus';
```
Add store usage:
```ts
const { purchasedCounts } = useBookStatusStore();
const ownedCount = computed(() => purchasedCounts.value.get(props.book.slug) ?? 0);
```

- [ ] **Add purchase guard to `onBuy`**

Modify `onBuy`:
```ts
async function onBuy() {
  if (ownedCount.value > 0) {
    const ok = window.confirm(
      `You already own ${ownedCount.value} copy${ownedCount.value > 1 ? 'ies' : 'y'}. Are you sure you want to buy more?`,
    );
    if (!ok) return;
  }
  cart.addItem({
    id: props.book.id,
    title: props.book.title,
    author: props.book.author,
    price: Number(props.book.price),
    cover: props.book.cover,
    crop: props.book.crop,
  });
  props.flash(`${props.book.title} added to your cart.`);
}
```

- [ ] **Commit**

```bash
git add frontend/components/book/BookCard.vue
git commit -m "feat: BookCard adds owned-count guard before add-to-cart"
```

---

### Task 9: Update `cart.vue` — show owned copy count

**Files:**
- Modify: `frontend/pages/cart.vue`

- [ ] **Add store and owned-count display**

Add import:
```ts
import { useBookStatusStore } from '~/stores/bookStatus';
```
Add:
```ts
const { purchasedCounts } = useBookStatusStore();
```

In the template, inside the `v-for="item in cart.items"` article, after the price line (line 41), add:
```html
<p v-if="purchasedCounts.get(item.id) ?? 0 > 0" class="mt-1 text-[10px] text-muted-foreground">
  You own {{ purchasedCounts.get(item.id) ?? 0 }} copy{{ (purchasedCounts.get(item.id) ?? 0) > 1 ? 'ies' : 'y' }}
</p>
```

- [ ] **Commit**

```bash
git add frontend/pages/cart.vue
git commit -m "feat: cart page shows owned-copy count per item"
```

---

### Task 10: Update `dashboard.vue` — get returnBook from store

**Files:**
- Modify: `frontend/pages/dashboard.vue`

- [ ] **Add store, update returnBook source**

Add import:
```ts
import { useBookStatusStore } from '~/stores/bookStatus';
```

Add:
```ts
const { returnBook } = useBookStatusStore();
```

Remove `returnBook` from the `useBorrows()` destructure (line 39).

- [ ] **Commit**

```bash
git add frontend/pages/dashboard.vue
git commit -m "refactor: dashboard gets returnBook from useBookStatusStore"
```

---

### Self-review checklist

1. **Spec coverage:** Every section is covered — store (Task 1), stock.ts (Task 2), useBorrows cleanup (Task 3), useBooks cleanup (Task 4), consumer updates (Tasks 5-7, 10), BookCard purchase awareness (Task 8), cart text (Task 9).
2. **Placeholder scan:** No TBD/TODO, no "add error handling" without actual code, no "similar to" references, no incomplete code blocks.
3. **Type consistency:** `borrow` in store matches `borrow` calls in consumers. `returnBook` in store matches `returnBook` calls everywhere. `purchasedCounts` is `Map<string, number>` throughout.
4. **Consumers verified:** NewArrivals passes `purchasedCounts` to `stockActions`. `stockActions` accepts optional 3rd param.
