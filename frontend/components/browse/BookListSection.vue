<script setup lang="ts">
import type { Book } from "~/types/book";

defineProps<{
  books: Book[];
  subtitle: string;
}>();

defineSlots<{
  badge(item: { book: Book; first: boolean }): unknown;
  extra(item: { book: Book; first: boolean }): unknown;
  actions(item: { book: Book; first: boolean }): unknown;
  compactBadge(item: { book: Book }): unknown;
  compactActions(item: { book: Book }): unknown;
}>();
</script>

<template>
  <template v-if="books.length > 0">
    <article
      class="group flex flex-col gap-8 rounded-sm border border-border bg-card p-5 md:flex-row md:p-6"
    >
      <div
        class="shrink-0 self-center shadow-xl transition-transform duration-500 group-hover:-translate-y-1 md:self-auto"
      >
        <CoverImage
          :crop="books[0].crop"
          :src="books[0].cover"
          :alt="`${books[0].title} book cover`"
          class="h-[270px] w-[180px]"
        />
      </div>
      <div class="flex flex-1 flex-col justify-between py-2">
        <div>
          <div
            v-if="$slots.badge"
            class="mb-2 flex flex-wrap items-center gap-2"
          >
            <slot name="badge" :book="books[0]" :first="true" />
          </div>
          <h2 class="mb-1 font-serif text-3xl font-bold">
            <NuxtLink
              :to="`/book/${books[0].slug}`"
              class="transition-colors hover:text-primary"
              >{{ books[0].title }}</NuxtLink
            >
          </h2>
          <p class="mb-4 italic text-muted-foreground">
            by {{ books[0].author }}
          </p>
          <slot name="extra" :book="books[0]" :first="true" />
        </div>
        <div v-if="$slots.actions" class="mt-6 flex flex-wrap gap-3">
          <slot name="actions" :book="books[0]" :first="true" />
        </div>
      </div>
    </article>

    <div
      v-if="books.length > 1"
      class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
    >
      <template v-for="book in books.slice(1)" :key="book.id">
        <article
          class="group flex gap-4 rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary/30"
        >
          <CoverImage
            :crop="book.crop"
            :src="book.cover"
            class="h-24 w-16 shrink-0 shadow-sm"
          />
          <div class="flex min-w-0 flex-1 flex-col justify-between">
            <div>
              <h3 class="font-serif text-sm font-bold leading-tight">
                {{ book.title }}
              </h3>
              <p class="text-xs italic mt-1 text-muted-foreground">
                {{ book.author }}
              </p>
            </div>
            <div class="mt-auto flex items-center justify-between gap-2 pt-2">
              <div v-if="$slots.compactBadge">
                <slot name="compactBadge" :book="book" />
              </div>
              <div v-if="$slots.compactActions" class="ml-auto">
                <slot name="compactActions" :book="book" />
              </div>
            </div>
          </div>
        </article>
      </template>
    </div>
  </template>
</template>
