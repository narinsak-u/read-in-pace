<script setup lang="ts">
import { Toaster } from 'vue-sonner';
import { useBooksStore } from '~/stores/books';

const booksStore = useBooksStore();
</script>

<template>
  <div class="min-h-screen bg-background pb-28 text-foreground selection:bg-primary/10 selection:text-primary">
    <AppNavbar />
    <main class="mx-auto grid max-w-7xl grid-cols-12 gap-10 px-4 py-8 md:px-6">
      <div class="col-span-12 space-y-12 lg:col-span-8">
        <slot />
      </div>
      <aside class="col-span-12 lg:col-span-4">
        <slot name="sidebar">
          <AppSidebar />
        </slot>
      </aside>
    </main>
    <BottomDock />
    <AdminFab />
    <BookFormModal
      v-if="booksStore.showForm"
      :book="booksStore.editingBook"
      @close="booksStore.closeForm()"
      @saved="booksStore.closeForm()"
    />
    <CheckoutDrawer />
    <Toaster richColors position="top-center" />
  </div>
</template>
