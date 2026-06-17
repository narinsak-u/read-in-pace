import { defineStore } from "pinia";
import { shallowRef, computed, watch } from "vue";
import { mapBookResponse, type Book } from "~/types/book";
import { useAuthStore } from "~/stores/auth";

export const useLibraryStore = defineStore("library", () => {
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
  let trendingFetchedAt = 0;
  const TRENDING_TTL = 60_000;

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
        "/api/books/trending",
      );
      trendingBooks.value = raw.map(mapBookResponse);
    } catch {
      trendingBooks.value = [];
    } finally {
      trendingLoaded.value = true;
      trendingFetchedAt = Date.now();
    }
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
      const res = await $fetch<{
        data: { book: Record<PropertyKey, unknown> }[];
      }>("/api/user/borrows", { query: { page: 1, limit: 100 } });
      const slugs = res.data.map(
        (e) => (e.book.slug as string) ?? (e.book.id as string),
      );
      setBorrowedSlugs(slugs);
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
      }
    },
    { immediate: true },
  );

  return {
    borrowedSlugs,
    setBorrowedSlugs,
    addBorrowedSlug,
    removeBorrowedSlug,
    trendingBooks,
    trendingLoaded,
    fetchTrending,
    borrowRefreshKey,
    triggerBorrowRefresh,
    initBorrowedSlugs,
  };
});
