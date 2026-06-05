<script setup lang="ts">
import { Toaster } from 'vue-sonner';

const route = useRoute();
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <main class="flex-1">
      <slot />
    </main>
    <Footer v-if="route.name !== 'index'" />
    <AdminFab />
    <Toaster richColors position="top-center" />
  </div>
</template>
