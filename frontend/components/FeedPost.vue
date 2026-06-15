<script setup lang="ts">
import type { Post } from '~/stores/social';
import { useSocialStore } from '~/stores/social';

const props = defineProps<{ post: Post }>();
const socialStore = useSocialStore();

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
</script>

<template>
  <article class="border-l border-foreground/5 pl-4">
    <div class="mb-1 flex items-center gap-2">
      <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">
        {{ initials(post.user.name) }}
      </span>
      <span class="text-[11px] font-bold uppercase">{{ post.user.name }}</span>
      <span class="font-mono text-[10px] text-muted-foreground">{{ timeAgo(post.createdAt) }}</span>
    </div>
    <p class="text-sm leading-snug text-foreground/80">{{ post.text }}</p>
    <p v-if="post.rating" class="mt-1.5 text-xs text-primary">
      {{ '★★★★★'.slice(0, post.rating) }}<span class="text-foreground/10">{{ '★★★★★'.slice(post.rating) }}</span>
    </p>
    <div class="mt-2 flex items-center gap-3">
      <Button
        variant="archivalGhost"
        size="sm"
        @click="socialStore.toggleLike(props.post.id)"
        :class="post.liked ? 'text-primary' : ''"
      >
        {{ post.liked ? 'Liked' : 'Like' }} ({{ post.likeCount }})
      </Button>
    </div>
  </article>
</template>
