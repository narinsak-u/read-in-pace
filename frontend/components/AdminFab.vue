<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import { useBooksStore } from '~/stores/books';

const auth = useAuthStore();
const booksStore = useBooksStore();
</script>

<template>
  <Button
    v-if="auth.adminMode"
    variant="archival"
    class="fixed bottom-8 right-8 z-40 flex h-14 items-center gap-2 px-5 shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-105 hover:-translate-y-px"
    @click="booksStore.openCreateForm()"
  >
    <Plus class="h-5 w-5" />
    <span class="font-medium">Add New Book</span>
  </Button>
</template>
