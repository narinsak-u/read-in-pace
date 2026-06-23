import { defineStore } from 'pinia';
import { shallowRef, computed, watch } from 'vue';
import { mapBookResponse, type Book } from '~/types/book';
import { useAuthStore } from '~/stores/auth';

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

function mapBorrowResponse(
  entry: BorrowsResponse['data'][number],
): BorrowItem {
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

export const useLibraryStore = defineStore('library', () => {
  const auth = useAuthStore();

  // --- Shared borrowed slugs ---
  const borrowedSlugs = shallowRef<Set<string>>(new Set());

  function setBorrowedSlugs(slugs: string[]) {
    borrowedSlugs.value = new Set(slugs);
  }

  function addBorrowedSlug(slug: string) {
    borrowedSlugs.value = new Set([...borrowedSlugs.value, slug]);
  }

  function removeBorrowedSlug(slug: string) {
    const next = new Set(borrowedSlugs.value);
    next.delete(slug);
    borrowedSlugs.value = next;
  }

  // --- Trending cache (1-minute TTL) ---
  const trendingBooks = shallowRef<Book[]>([]);
  const trendingLoaded = shallowRef(false);
  const TRENDING_TTL = 60_000;
  let trendingFetchedAt = 0;

  async function fetchTrending(force = false) {
    if (
      !force &&
      trendingBooks.value.length > 0 &&
      Date.now() - trendingFetchedAt < TRENDING_TTL
    ) {
      return;
    }
    try {
      const raw = await $fetch<Record<string, unknown>[]>(
        '/api/books/trending',
      );
      trendingBooks.value = raw.map(mapBookResponse);
    } catch {
      trendingBooks.value = [];
    } finally {
      trendingLoaded.value = true;
      trendingFetchedAt = Date.now();
    }
  }

  // --- Borrows state (shared, avoids per-component fetch duplication) ---
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

  const hasMoreBorrows = computed(() => {
    if (!borrowsMeta.value) return false;
    return borrowsPage.value < borrowsMeta.value.totalPages;
  });

  async function fetchBorrows(page = 1, append = false) {
    if (!auth.signedIn) {
      borrows.value = [];
      borrowsLoaded.value = true;
      borrowError.value = null;
      return;
    }
    borrowsLoaded.value = false;
    try {
      const res = await $fetch<BorrowsResponse>('/api/user/borrows', {
        query: { page, limit: 3 },
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
    fetchBorrows(borrowsPage.value + 1, true);
  }

  // --- Refresh key — components watch this to know when to re-fetch ---
  const borrowRefreshKey = shallowRef(0);

  function triggerBorrowRefresh() {
    borrowRefreshKey.value++;
  }

  // --- Init: auto-fetch borrowed slugs when signed in ---
  async function initBorrowedSlugs() {
    if (!auth.signedIn) {
      borrowedSlugs.value = new Set();
      return;
    }
    try {
      const res = await $fetch<BorrowsResponse>('/api/user/borrows', {
        query: { page: 1, limit: 100 },
      });
      setBorrowedSlugs(
        res.data.map((b) => (b.book.slug as string) ?? (b.book.id as string)),
      );
    } catch {
      borrowedSlugs.value = new Set();
    }
  }

  watch(
    () => auth.signedIn,
    (val) => {
      if (val) {
        initBorrowedSlugs();
      } else {
        borrowedSlugs.value = new Set();
        borrows.value = [];
        borrowsLoaded.value = true;
      }
    },
    { immediate: true },
  );

  return {
    borrowedSlugs: readonly(borrowedSlugs),
    setBorrowedSlugs,
    addBorrowedSlug,
    removeBorrowedSlug,
    trendingBooks: readonly(trendingBooks),
    trendingLoaded: readonly(trendingLoaded),
    fetchTrending,
    borrows: readonly(borrows),
    borrowsPage: readonly(borrowsPage),
    borrowsMeta: readonly(borrowsMeta),
    borrowsLoaded: readonly(borrowsLoaded),
    borrowError: readonly(borrowError),
    hasMoreBorrows,
    fetchBorrows,
    loadMoreBorrows,
    borrowRefreshKey: readonly(borrowRefreshKey),
    triggerBorrowRefresh,
  };
});
