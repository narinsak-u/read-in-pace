<script setup lang="ts">
import { useAuthStore } from "~/stores/auth";
import { useLibraryStore } from "~/stores/library";
import { mapBookResponse, type Book } from "~/types/book";

const props = defineProps<{
  mode: "loans" | "trending";
  flash: (message: string) => void;
}>();

const emit = defineEmits<{
  "open-review": [];
}>();

const auth = useAuthStore();
const store = useLibraryStore();

// --- Trending (uses store cache) ---
const trendingBooks = computed(() => store.trendingBooks);
const trendingLoaded = computed(() => store.trendingLoaded);

// --- Loans ---
interface BorrowItem {
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

interface BorrowsResponse {
  data: {
    borrow: Record<PropertyKey, unknown>;
    book: Record<PropertyKey, unknown>;
  }[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const LIMIT = 3;
const allBorrows = ref<BorrowItem[]>([]);
const borrowsPage = shallowRef(1);
const borrowsMeta = shallowRef<BorrowsResponse['meta'] | null>(null);
const borrowError = shallowRef<unknown>(null);
const loansLoaded = shallowRef(true);

const hasMore = computed(() => {
  if (!borrowsMeta.value) return false;
  return borrowsPage.value < borrowsMeta.value.totalPages;
});

async function fetchBorrows(page = 1, append = false) {
  if (!auth.signedIn) {
    allBorrows.value = [];
    loansLoaded.value = true;
    return;
  }
  loansLoaded.value = false;
  try {
    const res = await $fetch<BorrowsResponse>('/api/user/borrows', {
      query: { page, limit: LIMIT },
    });
    const items = res.data.map((entry) => ({
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
    }));
    if (append) {
      allBorrows.value = [...allBorrows.value, ...items];
    } else {
      allBorrows.value = items;
    }
    borrowsPage.value = page;
    borrowsMeta.value = res.meta;
    borrowError.value = null;
  } catch (e) {
    if (!append) allBorrows.value = [];
    borrowError.value = e;
  } finally {
    loansLoaded.value = true;
  }
}

function loadMore() {
  if (!hasMore.value) return;
  fetchBorrows(borrowsPage.value + 1, true);
}

const loans = computed(() => allBorrows.value);

// --- Borrow / Return API ---
const userBorrowedSlugs = computed(() => {
  const slugs = new Set<string>();
  for (const loan of loans.value) {
    slugs.add(loan.bookSlug);
  }
  return slugs;
});

// handle borrow book
// then fetch borrows and trending books
async function borrowBook(bookId: string) {
  try {
    await $fetch(`/api/books/${bookId}/borrow`, { method: "POST" });
    props.flash("Book borrowed for 14 days.");
    await fetchBorrows(1);
    store.setBorrowedSlugs(allBorrows.value.map((l) => l.bookSlug));
    store.triggerBorrowRefresh();
    await store.fetchTrending(true);
  } catch (e: any) {
    if (e?.status === 401) {
      auth.openAuthModal();
    } else if (e?.data?.message) {
      props.flash(e.data.message);
    } else {
      props.flash("Could not borrow the book. Please try again.");
    }
  }
}

async function returnBook(bookId: string, title: string) {
  try {
    await $fetch(`/api/books/${bookId}/return`, { method: "POST" });
    props.flash(`${title} returned. Thank you!`);
    await fetchBorrows(1);
    store.setBorrowedSlugs(allBorrows.value.map((l) => l.bookSlug));
    store.triggerBorrowRefresh();
    await store.fetchTrending(true);
  } catch (e: any) {
    props.flash(e?.data?.message || "Could not return the book.");
  }
}

function onBorrow(_slug: string, bookId: string) {
  if (!auth.signedIn) {
    auth.openAuthModal();
    return;
  }
  borrowBook(bookId);
}

if (props.mode === "trending") {
  store.fetchTrending();
} else {
  fetchBorrows(1);
  watch(() => auth.signedIn, (val) => {
    if (val) fetchBorrows(1);
  });
}

// Re-fetch when external borrow/return happens (from NewArrivals, etc.)
watch(() => store.borrowRefreshKey, () => {
  if (props.mode === "loans") {
    fetchBorrows(1);
  } else {
    store.fetchTrending(true);
  }
});
</script>

<template>
  <section id="loans" class="animate-enter scroll-mt-24">
    <!-- Trending -->
    <template v-if="mode === 'trending'">
      <div
        class="mb-6 flex items-baseline justify-between border-b border-border pb-2"
      >
        <h1 class="font-serif text-2xl">Trending Now</h1>
        <span class="font-mono text-[10px] uppercase text-muted-foreground">
          Most popular this month
        </span>
      </div>

      <div
        v-if="!trendingLoaded"
        class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
      >
        Loading trending books...
      </div>
      <div
        v-else-if="trendingBooks.length === 0"
        class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
      >
        No trending books right now.
      </div>
      <TrendingSection
        v-else
        :books="trendingBooks"
        :borrowed-slugs="userBorrowedSlugs"
        :flash="flash"
        @borrow="(slug, bookId) => onBorrow(slug, bookId)"
        @return="(slug, bookId) => { const book = trendingBooks.find(b => b.id === bookId || b.slug === slug); returnBook(bookId, book?.title ?? 'Book'); }"
      />
    </template>

    <!-- Loans -->
    <template v-else>
      <div
        class="mb-6 flex items-baseline justify-between border-b border-border pb-2"
      >
        <h1 class="font-serif text-2xl">Active Loans</h1>
        <span class="font-mono text-[10px] uppercase text-muted-foreground">
          {{ loans.length }} items currently on desk
        </span>
      </div>

      <div
        v-if="!loansLoaded"
        class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
      >
        Loading your loans...
      </div>
      <div
        v-else-if="!auth.signedIn"
        class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
      >
        Sign in to see your active loans.
      </div>
      <div
        v-else-if="borrowError"
        class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
      >
        Could not load your loans. Please try again.
      </div>

      <template v-else>
        <LoansSection
          :loans="loans"
          :has-more="hasMore"
          :flash="flash"
          @return="(bookId, title) => returnBook(bookId, title)"
          @open-review="emit('open-review')"
          @load-more="loadMore"
        />
        <div
          v-if="loans.length === 0"
          class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
        >
          No active loans. Browse the library to borrow a book.
        </div>
      </template>
    </template>
  </section>
</template>
