<script setup lang="ts">
import { ShoppingBag, Star } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import { useCartStore } from "~/stores/cart";
import { useAuthStore } from "~/stores/auth";
import { mapBookResponse, type Book } from "~/types/book";
import { stockActions } from "~/utils/stock";

const props = defineProps<{
  mode: "loans" | "trending";
  returned?: string[];
  flash: (message: string) => void;
}>();

const emit = defineEmits<{
  return: [slug: string];
  "open-review": [];
}>();

const cart = useCartStore();
const auth = useAuthStore();

// --- Trending mode ---

const trendingBooks = ref<Book[]>([]);
const trendingLoaded = ref(false);

async function fetchTrending() {
  try {
    const raw = await $fetch<Record<string, unknown>[]>("/api/books/trending");
    trendingBooks.value = raw.map(mapBookResponse);
  } catch {
    trendingBooks.value = [];
  } finally {
    trendingLoaded.value = true;
  }
}

// --- Loans mode ---

interface BorrowItem {
  borrowId: string;
  bookId: string;
  bookSlug: string;
  title: string;
  author: string;
  cover: string;
  crop: number | null;
  shelf: string;
  dueAt: string;
  currentPage: number;
  totalPages: number;
  price: string;
  inStock: number;
}

const rawBorrows = ref<
  | {
      borrow: Record<PropertyKey, unknown>;
      book: Record<PropertyKey, unknown>;
    }[]
  | null
>(null);
const borrowError = ref<unknown>(null);
const loansLoaded = ref(false);

async function fetchBorrows() {
  if (!auth.signedIn) {
    rawBorrows.value = null;
    loansLoaded.value = true;
    return;
  }
  try {
    rawBorrows.value = await $fetch("/api/user/borrows");
    borrowError.value = null;
  } catch (e) {
    rawBorrows.value = null;
    borrowError.value = e;
  } finally {
    loansLoaded.value = true;
  }
}

const loans = computed<BorrowItem[]>(() => {
  if (!rawBorrows.value) return [];
  return rawBorrows.value.map((entry) => ({
    borrowId: entry.borrow.id as string,
    bookId: entry.book.id as string,
    bookSlug: (entry.book.slug as string) ?? (entry.book.id as string),
    title: entry.book.title as string,
    author: entry.book.author as string,
    cover: entry.book.cover as string,
    crop: (entry.book.crop as number | null) ?? null,
    shelf: (entry.book.shelf as string) ?? "GEN",
    dueAt: entry.borrow.dueAt as string,
    currentPage: entry.borrow.currentPage as number,
    totalPages: entry.borrow.totalPages as number,
    price: String(entry.book.price ?? "0"),
    inStock: (entry.book.inStock as number) ?? 0,
  }));
});

function dueLabel(dueAt: string): { text: string; urgent: boolean } {
  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return { text: `OVERDUE (${Math.abs(diffDays)}D)`, urgent: true };
  if (diffDays === 0) return { text: "DUE TODAY", urgent: true };
  if (diffDays <= 3) return { text: `DUE IN ${diffDays} DAYS`, urgent: true };
  const month = due.toLocaleDateString("en-US", { month: "short" });
  const day = due.getDate();
  return { text: `DUE: ${month.toUpperCase()} ${day}`, urgent: false };
}

function readPercent(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((current / total) * 100);
}

function handleReturn(slug: string, title: string) {
  emit("return", slug);
  props.flash(`${title} returned. Thank you!`);
}

const localBorrowed = ref<string[]>([]);
const userBorrowedSlugs = computed(() => {
  const slugs = new Set(localBorrowed.value);
  for (const loan of loans.value) {
    slugs.add(loan.bookSlug);
  }
  return slugs;
});

function localStockActions(book: { inStock: number; slug: string }) {
  return localStockActions(book, userBorrowedSlugs.value);
}

// Init
if (props.mode === "trending") {
  fetchTrending();
} else {
  fetchBorrows();
  watch(
    () => auth.signedIn,
    (val) => {
      if (val) fetchBorrows();
    },
  );
}
</script>

<template>
  <section id="loans" class="animate-enter scroll-mt-24">
    <!-- Trending header -->
    <template v-if="mode === 'trending'">
      <div
        class="mb-6 flex items-baseline justify-between border-b border-border pb-2"
      >
        <h1 class="font-serif text-2xl">Trending Now</h1>
        <span class="font-mono text-[10px] uppercase text-muted-foreground"
          >Most popular this month</span
        >
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

      <template v-else>
        <article
          class="group flex flex-col gap-8 rounded-sm border border-border bg-card p-5 md:flex-row md:p-6"
        >
          <div
            class="shrink-0 self-center shadow-xl transition-transform duration-500 group-hover:-translate-y-1 md:self-auto"
          >
            <CoverImage
              :crop="trendingBooks[0].crop"
              :src="trendingBooks[0].cover"
              :alt="`${trendingBooks[0].title} book cover`"
              class="h-[270px] w-[180px]"
            />
          </div>
          <div class="flex flex-1 flex-col justify-between py-2">
            <div>
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span
                  class="rounded-sm bg-primary px-2 py-0.5 font-mono text-[10px] text-primary-foreground"
                >
                  <Star class="mr-0.5 inline size-3 fill-current" />
                  {{ trendingBooks[0].avgRating.toFixed(2) }}
                </span>
                <span
                  class="font-mono text-[10px] uppercase text-muted-foreground"
                  >Shelf: {{ trendingBooks[0].shelf }}</span
                >
              </div>
              <h2 class="mb-1 font-serif text-3xl font-bold">
                <NuxtLink
                  :to="`/book/${trendingBooks[0].slug}`"
                  class="transition-colors hover:text-primary"
                  >{{ trendingBooks[0].title }}</NuxtLink
                >
              </h2>
              <p class="mb-4 italic text-muted-foreground">
                by {{ trendingBooks[0].author }}
              </p>
              <p class="max-w-2xl text-sm leading-6 text-foreground/70">
                {{ trendingBooks[0].synopsis }}
              </p>
            </div>
            <div class="mt-6 flex flex-wrap gap-3">
              <template v-if="localStockActions(trendingBooks[0]).isBorrowed">
                <Button
                  variant="archival"
                  @click="
                    handleReturn(trendingBooks[0].slug, trendingBooks[0].title)
                  "
                  >Return Book</Button
                >
              </template>
              <template
                v-else-if="localStockActions(trendingBooks[0]).canBorrow"
              >
                <Button
                  variant="archival"
                  @click="
                    () => {
                      localBorrowed.push(trendingBooks[0].slug);
                      flash(`${trendingBooks[0].title} borrowed for 21 days.`);
                    }
                  "
                  >Borrow</Button
                >
              </template>
              <template v-else>
                <Button variant="archivalOutline" disabled>Unavailable</Button>
              </template>
              <Button
                v-if="localStockActions(trendingBooks[0]).canBuy"
                variant="archivalGhost"
                @click="
                  () => {
                    cart.addItem({
                      id: trendingBooks[0].id,
                      title: trendingBooks[0].title,
                      author: trendingBooks[0].author,
                      price: Number(trendingBooks[0].price),
                      cover: trendingBooks[0].cover,
                      crop: trendingBooks[0].crop,
                    });
                    flash(`${trendingBooks[0].title} added to your cart.`);
                  }
                "
              >
                <ShoppingBag /> Buy ${{ trendingBooks[0].price }}
              </Button>
            </div>
          </div>
        </article>

        <div
          v-if="trendingBooks.length > 1"
          class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <template v-for="book in trendingBooks.slice(1)" :key="book.id">
            <article
              class="group flex gap-4 rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <CoverImage
                :crop="book.crop"
                :src="book.cover"
                class="h-24 w-16 shrink-0 shadow-sm"
              />
              <div class="flex min-w-0 flex-1 flex-col justify-center">
                <h3 class="font-serif text-sm font-bold leading-tight">
                  {{ book.title }}
                </h3>
                <p class="mb-2 text-xs italic text-muted-foreground">
                  {{ book.author }}
                </p>
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono text-[10px] text-primary">
                    <Star class="mr-0.5 inline size-3 fill-current" />
                    {{ book.avgRating.toFixed(2) }}
                  </span>
                  <template v-if="localStockActions(book).isBorrowed">
                    <Button
                      size="sm"
                      variant="archivalGhost"
                      @click="handleReturn(book.slug, book.title)"
                      >Return</Button
                    >
                  </template>
                  <template v-else-if="localStockActions(book).canBorrow">
                    <Button
                      size="sm"
                      variant="archivalGhost"
                      @click="
                        () => {
                          localBorrowed.push(book.slug);
                          flash(`${book.title} borrowed.`);
                        }
                      "
                      >Borrow</Button
                    >
                  </template>
                  <template v-else>
                    <Button size="sm" variant="archivalGhost" disabled
                      >Unavailable</Button
                    >
                  </template>
                </div>
              </div>
            </article>
          </template>
        </div>
      </template>
    </template>

    <!-- Loans header -->
    <template v-else>
      <div
        class="mb-6 flex items-baseline justify-between border-b border-border pb-2"
      >
        <h1 class="font-serif text-2xl">Active Loans</h1>
        <span class="font-mono text-[10px] uppercase text-muted-foreground"
          >{{ loans.length }} items currently on desk</span
        >
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
        <article
          v-for="loan in loans"
          :key="loan.borrowId"
          class="group flex flex-col gap-8 rounded-sm border border-border bg-card p-5 md:flex-row md:p-6"
          :class="{ 'mb-6': loans.length > 1 && loan === loans[0] }"
        >
          <div
            class="shrink-0 self-center shadow-xl transition-transform duration-500 group-hover:-translate-y-1 md:self-auto"
          >
            <CoverImage
              :crop="loan.crop"
              :src="loan.cover"
              :alt="`${loan.title} book cover`"
              class="h-67.5 w-45"
            />
          </div>
          <div class="flex flex-1 flex-col justify-between py-2">
            <div>
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span
                  :class="`rounded-sm px-2 py-0.5 font-mono text-[10px] ${dueLabel(loan.dueAt).urgent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`"
                >
                  {{ dueLabel(loan.dueAt).text }}
                </span>
                <span
                  class="font-mono text-[10px] uppercase text-muted-foreground"
                  >Shelf: {{ loan.shelf }}</span
                >
              </div>
              <h2 class="mb-1 font-serif text-3xl font-bold">
                <NuxtLink
                  :to="`/book/${loan.bookSlug}`"
                  class="transition-colors hover:text-primary"
                  >{{ loan.title }}</NuxtLink
                >
              </h2>
              <p class="mb-4 italic text-muted-foreground">
                by {{ loan.author }}
              </p>
              <div
                class="h-1.5 w-full overflow-hidden rounded-full bg-foreground/5"
              >
                <div
                  class="h-full bg-primary transition-all"
                  :style="{
                    width: `${readPercent(loan.currentPage, loan.totalPages)}%`,
                  }"
                />
              </div>
              <p class="mt-2 font-mono text-[11px] text-muted-foreground">
                PAGE {{ loan.currentPage }} OF {{ loan.totalPages }} ({{
                  readPercent(loan.currentPage, loan.totalPages)
                }}%)
              </p>
            </div>
            <div class="mt-6 flex flex-wrap gap-3">
              <Button
                variant="archival"
                @click="handleReturn(loan.bookSlug, loan.title)"
                >Return Book</Button
              >
              <Button variant="archivalOutline" @click="emit('open-review')"
                >Write Review</Button
              >
              <Button
                v-if="loan.inStock > 1"
                variant="archivalGhost"
                @click="
                  () => {
                    cart.addItem({
                      id: loan.bookId,
                      title: loan.title,
                      author: loan.author,
                      price: Number(loan.price),
                      cover: loan.cover,
                      crop: loan.crop,
                    });
                    flash(`${loan.title} added to your cart.`);
                  }
                "
              >
                <ShoppingBag /> Buy ${{ loan.price }}
              </Button>
            </div>
          </div>
        </article>

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
