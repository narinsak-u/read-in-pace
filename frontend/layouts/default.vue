<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const route = useRoute();
const auth = useAuthStore();

onMounted(() => {
  auth.fetchSession();
});
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <main class="flex-1">
      <slot />
    </main>
    <Footer v-if="route.name !== 'index'" />
    <AdminFab />
  </div>
</template>
