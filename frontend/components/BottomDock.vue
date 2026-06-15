<script setup lang="ts">
import { Home, Search, Library, MessageCircle } from 'lucide-vue-next';

const route = useRoute();

const tabs = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/explore', icon: Search, label: 'Explore' },
  { to: '/shelf', icon: Library, label: 'Shelf' },
  { to: '/social', icon: MessageCircle, label: 'Social' },
];
</script>

<template>
  <div class="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-8 rounded-full border border-background/10 bg-foreground px-8 py-3 shadow-2xl">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="flex h-auto flex-col items-center gap-0.5 rounded-none bg-transparent p-0 text-background shadow-none transition-colors hover:text-primary"
      :class="route.path === tab.to ? 'text-primary' : ''"
    >
      <component :is="tab.icon" class="h-4 w-4" />
      <span class="font-mono text-[8px] uppercase opacity-60">{{ tab.label }}</span>
    </NuxtLink>
  </div>
</template>
