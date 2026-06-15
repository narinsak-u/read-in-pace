<script setup lang="ts">
import { ShoppingBag } from 'lucide-vue-next';
import { useCartStore } from '~/stores/cart';

const cartStore = useCartStore();
</script>

<template>
  <Button
    variant="archivalGhost"
    size="icon"
    class="relative"
    @click="cartStore.toggleDrawer()"
    aria-label="Open cart"
  >
    <ShoppingBag class="h-4 w-4" />
    <span
      v-if="cartStore.itemCount > 0"
      class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-mono text-primary-foreground"
    >
      {{ cartStore.itemCount }}
    </span>
  </Button>
</template>
