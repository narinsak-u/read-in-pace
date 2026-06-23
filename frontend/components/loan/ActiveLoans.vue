<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { useLibraryStore } from '~/stores/library';
import { useBorrows } from '~/composables/useBorrows';
import { useBooks } from '~/composables/useBooks';

const props = defineProps<{
  mode: 'loans' | 'trending';
  flash: (message: string) => void;
}>();

const emit = defineEmits<{
  'open-review': [];
}>();

const auth = useAuthStore();
const store = useLibraryStore();

const {
  borrows,
  borrowsLoaded,
  borrowError,
  hasMoreBorrows,
  loadMoreBorrows,
  borrowedSlugs,
  borrowBook,
  returnBook,
  fetchBorrows,
} = useBorrows();

const { books: trendingBooks, loading: trendingLoading, refresh: refreshTrending } = useBooks({ limit: 4 });

const showTrending = computed(
  () =>
    props.mode === 'loans' &&
    auth.signedIn &&
    borrowsLoaded.value &&
    borrows.value.length === 0,
);

const userBorrowedSlugs = computed(() => {
  const slugs = new Set<string>();
  for (const loan of borrows.value) {
    slugs.add(loan.bookSlug);
  }
  return slugs;
});

async function onBorrowBook(bookId: string) {
  try {
    await borrowBook(bookId, '');
    props.flash('Book borrowed for 14 days.');
    await fetchBorrows(1);
    refreshTrending();
  } catch (e: any) {
    if (e?.status === 401) {
      auth.openAuthModal();
    } else if (e?.data?.message) {
      props.flash(e.data.message);
    } else {
      props.flash('Could not borrow the book. Please try again.');
    }
  }
}

async function onReturnBook(bookId: string, title: string) {
  try {
    await returnBook(bookId, '');
    props.flash(`${title} returned. Thank you!`);
    await fetchBorrows(1);
    refreshTrending();
  } catch (e: any) {
    props.flash(e?.data?.message || 'Could not return the book.');
  }
}

function onBorrow(slug: string, bookId: string) {
  if (!auth.signedIn) {
    auth.openAuthModal();
    return;
  }
  onBorrowBook(bookId);
}

onMounted(() => {
  if (props.mode === 'loans') {
    fetchBorrows(1).then(() => {
      if (borrows.value.length === 0) refreshTrending();
    });
  } else {
    refreshTrending();
  }
});

watch(
  () => auth.signedIn,
  (val) => {
    if (val && props.mode === 'loans') {
      fetchBorrows(1).then(() => {
        if (borrows.value.length === 0) refreshTrending();
      });
    }
  },
);
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
        v-if="trendingLoading"
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
        :books="trendingBooks as any"
        :borrowed-slugs="userBorrowedSlugs"
        :flash="flash"
        @borrow="(slug: string, bookId: string) => onBorrow(slug, bookId)"
        @return="(slug: string, bookId: string) => { const book = (trendingBooks as any).find((b: any) => b.id === bookId || b.slug === slug); onReturnBook(bookId, book?.title ?? 'Book'); }"
      />
    </template>

    <!-- Loans -->
    <template v-else>
      <div
        class="mb-6 flex items-baseline justify-between border-b border-border pb-2"
      >
        <h1 class="font-serif text-2xl">Active Loans</h1>
        <span class="font-mono text-[10px] uppercase text-muted-foreground">
          {{ borrows.length }}
          {{ borrows.length === 1 ? 'item' : 'items' }} currently on desk
        </span>
      </div>

      <div
        v-if="!borrowsLoaded"
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
        <template v-if="showTrending">
          <div class="mb-6 flex items-baseline justify-between">
            <h2 class="font-serif text-lg">No active loans — check what's trending</h2>
          </div>
          <div
            v-if="trendingLoading"
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
            :books="trendingBooks as any"
            :borrowed-slugs="userBorrowedSlugs"
            :flash="flash"
            @borrow="(slug: string, bookId: string) => onBorrow(slug, bookId)"
            @return="(slug: string, bookId: string) => { const book = (trendingBooks as any).find((b: any) => b.id === bookId || b.slug === slug); onReturnBook(bookId, book?.title ?? 'Book'); }"
          />
        </template>
        <template v-else>
          <LoansSection
            :loans="borrows as any"
            :has-more="hasMoreBorrows"
            :flash="flash"
            @return="(bookId: string, title: string) => onReturnBook(bookId, title)"
            @open-review="emit('open-review')"
            @load-more="loadMoreBorrows"
          />
        </template>
      </template>
    </template>
  </section>
</template>
