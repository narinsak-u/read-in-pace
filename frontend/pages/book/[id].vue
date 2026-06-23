<script setup lang="ts">
import { buttonVariants } from "~/components/ui/button/variants";
import { mapBookResponse, type Book } from "~/types/book";

const route = useRoute();
const { flash } = useFlash();

const slug = route.params.id as string;

const { data: rawBook, error } = await useFetch<Record<string, unknown>>(
  `/api/books/${slug}`,
  { key: `book-${slug}` },
);

const book = computed<Book | null>(() => {
  if (!rawBook.value) return null;
  return mapBookResponse(rawBook.value);
});

definePageMeta({
  layout: 'default',
});

useHead({
  title: computed(() => {
    if (!book.value) return "Book \u2014 Read in Peace";
    return `${book.value.title} by ${book.value.author} \u2014 Read in Peace`;
  }),
  meta: computed(() => {
    if (!book.value) return [];
    return [{ name: "description", content: book.value.synopsis }];
  }),
});
</script>

<template>
  <div
    v-if="error || !book"
    class="flex min-h-screen items-center justify-center bg-background px-6 text-center"
  >
    <div>
      <p class="font-mono text-xs uppercase text-primary">Catalog note 404</p>
      <h1 class="mt-2 font-serif text-4xl">This volume isn't on the shelf.</h1>
      <NuxtLink to="/feed" :class="buttonVariants({ variant: 'archival', className: 'mt-6' })">Return to library</NuxtLink>
    </div>
  </div>

  <div v-else class="min-h-screen bg-background pb-16 text-foreground">
    <Nav mode="book" />

    <main class="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:py-14">
      <section
        class="animate-enter grid gap-10 border-b border-border pb-14 lg:grid-cols-[300px_1fr_280px] lg:gap-14"
      >
        <div class="mx-auto w-full max-w-[300px]">
          <CoverImage
            :crop="book.crop"
            :src="book.cover"
            :alt="`${book.title} book cover`"
            class="aspect-[2/3] w-full shadow-2xl"
          />
        </div>

        <BookHero :book="book" :flash="flash" />

        <BookBorrowCard :book="book" :book-id="book.id" :flash="flash" />
      </section>

      <BookReviews :flash="flash" :book-id="book.id" />
    </main>
  </div>
</template>
