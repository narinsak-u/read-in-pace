<script setup lang="ts">
import {
  BookOpen, Home, Library, MessageCircle, Search, Settings, ShoppingBag, Star,
} from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { useCartStore } from '~/stores/cart';

definePageMeta({
  title: 'Ex Libris — Social Library',
  description: 'Borrow, return, buy, review, rate, and discuss books with fellow readers.',
  layout: 'default',
});

const router = useRouter();
const cart = useCartStore();

const arrivals = [
  { id: 'the-hidden-sea', title: 'The Hidden Sea', author: 'Eliot Harbor', crop: 2, rating: 4.7, price: 18.5 },
  { id: 'logic-and-form', title: 'Logic & Form', author: 'Adrian Wakefield', crop: 3, rating: 4.3, price: 24 },
  { id: 'paper-shadows', title: 'Paper Shadows', author: 'Maeve Lincoln', crop: 4, rating: 4.8, price: 16 },
  { id: 'the-long-night', title: 'The Long Night', author: 'Daniel Hastings', crop: 5, rating: 4.1, price: 19.99 },
];

const query = ref('');
const returned = ref<string[]>([]);
const borrowed = ref<string[]>([]);
const liked = ref(false);
const reviewOpen = ref(false);
const rating = ref(0);
const reviewText = ref('');
const notice = ref('');

const filtered = computed(() =>
  arrivals.filter((book) =>
    `${book.title} ${book.author}`.toLowerCase().includes(query.value.toLowerCase()),
  ),
);

function flash(message: string) {
  notice.value = message;
  window.setTimeout(() => { notice.value = ''; }, 2400);
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
</script>

<template>
  <div class="min-h-screen bg-background pb-28 text-foreground selection:bg-primary/10 selection:text-primary">
    <nav
      aria-label="Primary navigation"
      class="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md md:px-6"
    >
      <div class="flex items-center gap-8">
        <button
          type="button"
          class="font-serif text-xl font-bold italic tracking-tight text-primary"
          @click="scrollTo('loans')"
        >
          Read in Pace
        </button>
        <div class="hidden items-center gap-6 text-xs font-medium uppercase tracking-wider text-muted-foreground md:flex">
          <button type="button" class="border-b border-primary text-foreground" @click="scrollTo('loans')">Dashboard</button>
          <button type="button" class="transition-colors hover:text-foreground" @click="scrollTo('arrivals')">Discover</button>
          <button type="button" class="transition-colors hover:text-foreground" @click="scrollTo('loans')">The Stacks</button>
          <button type="button" class="transition-colors hover:text-foreground" @click="scrollTo('feed')">Archive</button>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <label class="relative hidden sm:block">
          <span class="sr-only">Search books</span>
          <Search class="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            v-model="query"
            placeholder="Search titles, authors..."
            class="w-56 rounded-sm border-0 bg-input py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-ring lg:w-64"
          />
        </label>
        <Button
          variant="archivalGhost"
          size="icon"
          :aria-label="`Cart with ${cart.itemCount} items`"
          class="relative"
          @click="router.push('/cart')"
        >
          <ShoppingBag />
          <span
            v-if="cart.itemCount > 0"
            class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground"
          >{{ cart.itemCount }}</span>
        </Button>
        <Button size="icon" variant="archival" aria-label="Open reader profile" class="rounded-full text-xs italic">JS</Button>
      </div>
    </nav>

    <main class="mx-auto grid max-w-7xl grid-cols-12 gap-10 px-4 py-8 md:px-6">
      <div class="col-span-12 space-y-12 lg:col-span-8">
        <!-- Active Loans -->
        <section id="loans" class="animate-enter scroll-mt-24">
          <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
            <h1 class="font-serif text-2xl">Active Loans</h1>
            <span class="font-mono text-[10px] uppercase text-muted-foreground">{{ 3 - returned.length }} items currently on desk</span>
          </div>

          <article v-if="!returned.includes('memory')" class="group flex flex-col gap-8 rounded-sm border border-border bg-card p-5 md:flex-row md:p-6">
            <div class="shrink-0 self-center shadow-xl transition-transform duration-500 group-hover:-translate-y-1 md:self-auto">
              <img
                src="/images/architecture-memory.png"
                alt="The Architecture of Memory book cover"
                width="768"
                height="1152"
                class="h-[270px] w-[180px] object-cover"
              />
            </div>
            <div class="flex flex-1 flex-col justify-between py-2">
              <div>
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <span class="rounded-sm bg-primary px-2 py-0.5 font-mono text-[10px] text-primary-foreground">DUE IN 2 DAYS</span>
                  <span class="font-mono text-[10px] uppercase text-muted-foreground">Shelf: 720.1 ARC</span>
                </div>
                <h2 class="mb-1 font-serif text-3xl font-bold">
                  <NuxtLink to="/book/architecture-of-memory" class="transition-colors hover:text-primary">The Architecture of Memory</NuxtLink>
                </h2>
                <p class="mb-4 italic text-muted-foreground">by Elena Rossi-Vaughn</p>
                <div class="mb-6 flex items-center gap-1" aria-label="Rated 4.2 out of 5">
                  <span class="text-lg text-primary">★★★★</span>
                  <span class="text-lg text-foreground/10">★</span>
                  <span class="ml-2 text-[11px] font-medium tracking-tight text-muted-foreground">4.2 AVG RATING</span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
                  <div class="h-full w-[64%] bg-primary" />
                </div>
                <p class="mt-2 font-mono text-[11px] text-muted-foreground">PAGE 218 OF 340 (64%)</p>
              </div>
              <div class="mt-6 flex flex-wrap gap-3">
                <Button variant="archival" @click="() => { returned.push('memory'); flash('Book returned. Thank you!'); }">Return Book</Button>
                <Button variant="archivalOutline" @click="reviewOpen = true">Write Review</Button>
                <Button variant="archivalGhost" @click="() => { cart.addItem({ id: 'architecture-of-memory', title: 'The Architecture of Memory', author: 'Elena Rossi-Vaughn', price: 21, cover: '/images/architecture-memory.png', crop: null }); flash('The Architecture of Memory added to your cart.'); }">
                  <ShoppingBag /> Buy $21.00
                </Button>
              </div>
            </div>
          </article>

          <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <template
              v-for="book in [
                { key: 'springs', title: 'Silent Springs Revisited', author: 'Marissa Langford', crop: 0 as const, due: 'DUE: JUN 22' },
                { key: 'urbanism', title: 'Urbanism 2050', author: 'Lena Parker', crop: 1 as const, due: 'OVERDUE (3D)' },
              ].filter(b => !returned.includes(b.key))"
              :key="book.key"
            >
              <article class="group flex gap-4 rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary/30">
                <CoverImage :crop="book.crop" class="h-24 w-16 shrink-0 shadow-sm" />
                <div class="flex min-w-0 flex-1 flex-col justify-center">
                  <h3 class="font-serif text-sm font-bold leading-tight">{{ book.title }}</h3>
                  <p class="mb-2 text-xs italic text-muted-foreground">{{ book.author }}</p>
                  <div class="flex items-center justify-between gap-2">
                    <span :class="`font-mono text-[10px] ${book.key === 'urbanism' ? 'font-bold text-primary' : 'text-muted-foreground'}`">{{ book.due }}</span>
                    <Button size="sm" variant="archivalGhost" @click="() => { returned.push(book.key); flash(`${book.title} returned.`); }">Return</Button>
                  </div>
                </div>
              </article>
            </template>
          </div>
        </section>

        <!-- New Arrivals -->
        <section id="arrivals" class="animate-enter scroll-mt-24 [animation-delay:150ms]">
          <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
            <h2 class="font-serif text-2xl">New Arrivals</h2>
            <span class="font-mono text-[10px] uppercase text-muted-foreground">Curated this week</span>
          </div>
          <div class="mb-5 sm:hidden">
            <input
              v-model="query"
              placeholder="Search new arrivals..."
              class="w-full rounded-sm bg-input px-4 py-2 text-sm"
            />
          </div>
          <div v-if="filtered.length > 0" class="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
            <article v-for="book in filtered" :key="book.id" class="group">
              <NuxtLink :to="`/book/${book.id}`" :aria-label="`View ${book.title}`">
                <CoverImage :crop="book.crop" class="mb-3 aspect-[2/3] shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl" />
              </NuxtLink>
              <h3 class="font-serif text-sm font-bold transition-colors group-hover:text-primary">
                <NuxtLink :to="`/book/${book.id}`">{{ book.title }}</NuxtLink>
              </h3>
              <p class="text-xs text-muted-foreground">{{ book.author }}</p>
              <div class="mt-1 flex items-center gap-1 text-[10px] text-primary">
                <Star class="size-3 fill-current" /> {{ book.rating }}
              </div>
              <div class="mt-3 flex gap-1">
                <Button
                  size="sm"
                  :variant="borrowed.includes(book.title) ? 'archivalOutline' : 'archival'"
                  :disabled="borrowed.includes(book.title)"
                  @click="() => { borrowed.push(book.title); flash(`${book.title} borrowed for 21 days.`); }"
                >
                  {{ borrowed.includes(book.title) ? 'Borrowed' : 'Borrow' }}
                </Button>
                <Button
                  size="icon"
                  variant="archivalGhost"
                  :aria-label="`Buy ${book.title}`"
                  @click="() => { cart.addItem({ id: book.id, title: book.title, author: book.author, price: book.price, cover: '/images/book-cover-sheet.png', crop: book.crop }); flash(`${book.title} added to your cart.`); }"
                >
                  <ShoppingBag />
                </Button>
              </div>
            </article>
          </div>
          <p v-else class="border-y border-border py-12 text-center font-serif italic text-muted-foreground">
            No volumes match "{{ query }}". Try another title or author.
          </p>
        </section>
      </div>

      <!-- Sidebar -->
      <aside class="col-span-12 space-y-10 lg:col-span-4">
        <section class="animate-enter relative overflow-hidden border border-border bg-card p-6 shadow-sm [animation-delay:250ms]">
          <div class="absolute inset-y-0 left-0 w-1 bg-primary" />
          <h2 class="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Yearly Progress</h2>
          <div class="mb-1 flex items-baseline gap-2">
            <span class="font-serif text-4xl font-bold">24</span>
            <span class="text-sm italic text-muted-foreground">of 50 books</span>
          </div>
          <div class="mb-4 h-1 w-full bg-foreground/5">
            <div class="h-full w-[48%] bg-foreground" />
          </div>
          <p class="text-[11px] leading-relaxed text-muted-foreground">
            You are <span class="text-primary">2 books behind</span> your 2026 reading goal. A short essay collection might be perfect this weekend.
          </p>
        </section>

        <section id="feed" class="animate-enter scroll-mt-24 [animation-delay:300ms]">
          <div class="mb-4 flex items-baseline justify-between border-b border-border pb-2">
            <h2 class="font-serif text-xl">Reader Feed</h2>
            <span class="size-2 rounded-full bg-primary" />
          </div>
          <div class="space-y-6">
            <article class="border-l border-foreground/5 pl-4">
              <div class="mb-1 flex items-center gap-2">
                <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">AM</span>
                <span class="text-[11px] font-bold uppercase">Aris M.</span>
                <span class="font-mono text-[10px] text-muted-foreground">14m ago</span>
              </div>
              <p class="text-sm leading-snug text-foreground/80">
                "Rossi-Vaughn's chapter on brutalist memorials is devastating. Did anyone else catch the reference to Rossi's own cemetery design?"
              </p>
              <div class="mt-2 flex items-center gap-3">
                <Button variant="archivalGhost" size="sm" @click="flash('Reply composer opened.')"><MessageCircle /> Reply</Button>
                <Button variant="archivalGhost" size="sm" @click="liked = !liked" :class="liked ? 'text-primary' : ''">{{ liked ? 'Liked' : 'Like' }} ({{ liked ? 13 : 12 }})</Button>
              </div>
            </article>
            <article class="border-l border-foreground/5 pl-4">
              <div class="mb-1 flex items-center gap-2">
                <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">LW</span>
                <span class="text-[11px] font-bold uppercase">Leo Wang</span>
                <span class="font-mono text-[10px] text-muted-foreground">2h ago</span>
              </div>
              <p class="text-sm leading-snug text-foreground/80">
                Just finished <span class="italic underline decoration-primary/30 underline-offset-2">Paper Shadows</span>. A little quiet in the middle, but the ending is worth it.
              </p>
              <p class="mt-2 text-xs text-primary" aria-label="3 out of 5 stars">★★★<span class="text-foreground/10">★★</span></p>
            </article>
            <article class="border-l border-foreground/5 pl-4">
              <div class="mb-1 flex items-center gap-2">
                <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">SS</span>
                <span class="text-[11px] font-bold uppercase">Sarah S.</span>
                <span class="font-mono text-[10px] text-muted-foreground">Yesterday</span>
              </div>
              <p class="text-sm leading-snug text-foreground/80">Looking for recommendations on mid-century urban design. Any classics I'm missing?</p>
              <Button class="mt-2" variant="archivalGhost" size="sm" @click="flash('Discussion saved to your archive.')">View discussion</Button>
            </article>
          </div>
        </section>

        <section class="animate-enter rounded-sm border-2 border-dashed border-border p-6 text-center [animation-delay:350ms]">
          <p class="mb-4 font-serif text-sm italic">Join the literary circles in your neighborhood.</p>
          <Button class="w-full uppercase tracking-widest" variant="archivalOutline" @click="flash('We found 8 active clubs near you.')">Find a Book Club</Button>
        </section>
      </aside>
    </main>

    <!-- Bottom Dock -->
    <div class="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-8 rounded-full border border-background/10 bg-foreground px-8 py-3 text-background shadow-2xl">
      <Button variant="archivalDock" @click="scrollTo('loans')"><Home /><span class="font-mono text-[8px] uppercase opacity-60">Home</span></Button>
      <Button variant="archivalDock" @click="scrollTo('arrivals')"><Library /><span class="font-mono text-[8px] uppercase opacity-60">Shelf</span></Button>
      <Button variant="archivalDock" @click="scrollTo('feed')"><MessageCircle /><span class="font-mono text-[8px] uppercase opacity-60">Social</span></Button>
      <Button variant="archivalDock" @click="flash('Reading preferences are up to date.')"><Settings /><span class="font-mono text-[8px] uppercase opacity-60">Prefs</span></Button>
    </div>

    <!-- Review Modal -->
    <Teleport to="body">
      <div v-if="reviewOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="review-title" @mousedown="reviewOpen = false">
        <div class="w-full max-w-lg border border-border bg-background p-6 shadow-2xl" @mousedown.stop>
          <div class="mb-6 flex gap-4">
            <img src="/images/architecture-memory.png" alt="" width="768" height="1152" class="h-24 w-16 object-cover shadow" />
            <div>
              <p class="font-mono text-[10px] uppercase text-primary">Reader review</p>
              <h2 id="review-title" class="font-serif text-2xl font-bold">The Architecture of Memory</h2>
              <p class="text-sm text-muted-foreground">What stayed with you?</p>
            </div>
          </div>
          <div class="mb-4 flex gap-1" :aria-label="`Your rating: ${rating} out of 5`">
            <button v-for="value in 5" :key="value" type="button" :aria-label="`Rate ${value} stars`" @click="rating = value">
              <Star :class="`size-7 ${value <= rating ? 'fill-current text-primary' : 'text-border'}`" />
            </button>
          </div>
          <label class="text-sm font-medium" for="review">Your review</label>
          <textarea id="review" v-model="reviewText" rows="5" placeholder="Write from the margins..." class="mt-2 w-full resize-none rounded-sm border border-border bg-card p-3 text-sm focus:ring-1 focus:ring-ring" />
          <div class="mt-5 flex justify-end gap-2">
            <Button variant="archivalGhost" @click="reviewOpen = false">Cancel</Button>
            <Button variant="archival" :disabled="!rating || !reviewText.trim()" @click="() => { reviewOpen = false; reviewText = ''; flash('Your review was published to the reader feed.'); }">Publish Review</Button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast Notification -->
    <Teleport to="body">
      <div v-if="notice" role="status" class="fixed right-5 top-20 z-50 border border-border bg-foreground px-4 py-3 text-sm text-background shadow-xl">
        {{ notice }}
      </div>
    </Teleport>
  </div>
</template>
