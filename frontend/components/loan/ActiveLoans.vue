<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { useLibraryStore } from '~/stores/library';

const props = defineProps<{
  mode: 'loans' | 'trending';
  flash: (message: string) => void;
}>();

const emit = defineEmits<{
  'open-review': [];
}>();

const auth = useAuthStore();
const store = useLibraryStore();

const userBorrowedSlugs = computed(() => {
  const slugs = new Set<string>();
  for (const loan of store.borrows) {
    slugs.add(loan.bookSlug);
  }
  return slugs;
});

async function borrowBook(bookId: string) {
  try {
    await $fetch(`/api/books/${bookId}/borrow`, { method: 'POST' });
    props.flash('Book borrowed for 14 days.');
    await store.fetchBorrows(1);
    store.setBorrowedSlugs(
      store.borrows.map((l: { bookSlug: string }) => l.bookSlug),
    );
    store.triggerBorrowRefresh();
    await store.fetchTrending(true);
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

async function returnBook(bookId: string, title: string) {
  try {
    await $fetch(`/api/books/${bookId}/return`, { method: 'POST' });
    props.flash(`${title} returned. Thank you!`);
    await store.fetchBorrows(1);
    store.setBorrowedSlugs(
      store.borrows.map((l: { bookSlug: string }) => l.bookSlug),
    );
    store.triggerBorrowRefresh();
    await store.fetchTrending(true);
  } catch (e: any) {
    props.flash(e?.data?.message || 'Could not return the book.');
  }
}

function onBorrow(_slug: string, bookId: string) {
  if (!auth.signedIn) {
    auth.openAuthModal();
    return;
  }
  borrowBook(bookId);
}

onMounted(() => {
  if (props.mode === 'loans') {
    store.fetchBorrows(1);
  } else {
    store.fetchTrending();
  }
});

watch(
  () => auth.signedIn,
  (val) => {
    if (val && props.mode === 'loans') store.fetchBorrows(1);
  },
);

watch(
  () => store.borrowRefreshKey,
  () => {
    if (props.mode === 'loans') {
      store.fetchBorrows(1);
    } else {
      store.fetchTrending(true);
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
        v-if="!store.trendingLoaded"
        class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
      >
        Loading trending books...
      </div>
      <div
        v-else-if="store.trendingBooks.length === 0"
        class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
      >
        No trending books right now.
      </div>
      <TrendingSection
        v-else
        :books="store.trendingBooks as any"
        :borrowed-slugs="userBorrowedSlugs"
        :flash="flash"
        @borrow="(slug: string, bookId: string) => onBorrow(slug, bookId)"
        @return="(slug: string, bookId: string) => { const book = (store.trendingBooks as any).find((b: any) => b.id === bookId || b.slug === slug); returnBook(bookId, book?.title ?? 'Book'); }"
      />
    </template>

    <!-- Loans -->
    <template v-else>
      <div
        class="mb-6 flex items-baseline justify-between border-b border-border pb-2"
      >
        <h1 class="font-serif text-2xl">Active Loans</h1>
        <span class="font-mono text-[10px] uppercase text-muted-foreground">
          {{ store.borrows.length }}
          {{ store.borrows.length === 1 ? 'item' : 'items' }} currently on desk
        </span>
      </div>

      <div
        v-if="!store.borrowsLoaded"
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
        v-else-if="store.borrowError"
        class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
      >
        Could not load your loans. Please try again.
      </div>
      <template v-else>
        <LoansSection
          :loans="store.borrows as any"
          :has-more="store.hasMoreBorrows"
          :flash="flash"
          @return="(bookId: string, title: string) => returnBook(bookId, title)"
          @open-review="emit('open-review')"
          @load-more="store.loadMoreBorrows"
        />
        <div
          v-if="store.borrows.length === 0"
          class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
        >
          No active loans. Browse the library to borrow a book.
        </div>
      </template>
    </template>
  </section>
</template>
