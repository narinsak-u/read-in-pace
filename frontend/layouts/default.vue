<script setup lang="ts">
import { Toaster } from 'vue-sonner';
import { useBooksStore } from '~/stores/books';

const route = useRoute();
const booksStore = useBooksStore();
const isNotIndex = computed(() => route.name !== 'index');
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <main class="flex-1">
      <slot />
    </main>
    <Footer v-if="isNotIndex" />
    <AdminFab v-if="isNotIndex" />
    <BookFormModal
      v-if="isNotIndex && booksStore.showForm"
      :book="booksStore.editingBook"
      @close="booksStore.closeForm()"
      @saved="booksStore.closeForm()"
    />
    <CheckoutDrawer v-if="isNotIndex" />
    <Toaster richColors position="top-center" />
  </div>
</template>
