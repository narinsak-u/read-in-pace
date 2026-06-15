<script setup lang="ts">
import { computed } from 'vue';
import { useCartStore } from '~/stores/cart';
import type { BookWithMeta } from '~/stores/books';

const props = defineProps<{
  book: BookWithMeta;
  hasBorrowed: boolean;
}>();

const emit = defineEmits<{
  borrow: [];
}>();

const cartStore = useCartStore();

const borrowLabel = computed(() => {
  return props.book.isAvailable && props.book.inStock >= 1 && !props.hasBorrowed
    ? 'Borrow'
    : 'Unavailable';
});

function handleBuy() {
  cartStore.addItem({
    bookId: props.book.id,
    title: props.book.title,
    author: props.book.author,
    cover: props.book.cover,
    price: Number(props.book.price),
    category: props.book.category,
    crop: props.book.crop,
  });
}
</script>

<template>
  <div class="mt-8 flex flex-col gap-3 sm:flex-row">
    <Button
      v-if="book.inStock > 1"
      variant="archival"
      class="flex-1"
      @click="handleBuy"
    >
      Buy Now — ${{ Number(book.price).toFixed(2) }}
    </Button>
    <Button
      variant="archivalOutline"
      class="flex-1"
      :disabled="!book.isAvailable || book.inStock < 1 || hasBorrowed"
      @click="emit('borrow')"
    >
      {{ borrowLabel }}
    </Button>
  </div>
</template>
