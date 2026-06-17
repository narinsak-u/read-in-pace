<script setup lang="ts">
import { Button } from "~/components/ui/button";
import { ArrowRight } from "lucide-vue-next";
import { useLibraryStore } from "~/stores/library";

interface CommentUser {
  id: string;
  name: string;
  image: string | null;
}

interface FeedComment {
  id: string;
  bookId: string;
  userId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
}

const props = defineProps<{
  flash: (message: string) => void;
}>();

provide("flash", props.flash);

const store = useLibraryStore();
const comments = ref<FeedComment[]>([]);
const bookSlug = shallowRef("");
const bookLikeCount = shallowRef(0);
const loaded = shallowRef(false);

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

async function fetchFeed() {
  try {
    await store.fetchTrending();
    const trending = store.trendingBooks;
    if (trending.length === 0) return;
    const first = trending[0];
    bookSlug.value = first.slug;
    bookLikeCount.value = first.likeCount;
    const data = await $fetch<FeedComment[]>(`/api/books/${first.id}/comments`);
    comments.value = data;
  } catch {
    comments.value = [];
  } finally {
    loaded.value = true;
  }
}

onMounted(fetchFeed);
</script>

<template>
  <section id="feed" class="animate-enter scroll-mt-24 [animation-delay:300ms]">
    <div
      class="mb-4 flex items-baseline justify-between border-b border-border pb-2"
    >
      <h2 class="font-serif text-xl">Reader Feed</h2>
      <span class="size-2 rounded-full bg-primary" />
    </div>
    <div v-if="!loaded" class="space-y-6">
      <div class="border-l border-foreground/5 pl-4 animate-pulse">
        <div class="mb-1 flex items-center gap-2">
          <span class="size-6 rounded-full bg-muted" />
          <span class="h-3 w-16 rounded bg-muted" />
          <span class="h-3 w-10 rounded bg-muted" />
        </div>
        <div class="h-3 w-full rounded bg-muted" />
      </div>
    </div>
    <div v-else-if="comments.length === 0" class="space-y-6">
      <p class="font-serif text-sm italic text-muted-foreground">
        No comments on trending books yet.
      </p>
    </div>
    <div v-else class="space-y-6">
      <FeedPost
        v-for="comment in comments"
        :key="comment.id"
        :initials="comment.user.name.toUpperCase().slice(0, 2)"
        :name="comment.user.name"
        :time="timeAgo(comment.createdAt)"
        :like-count="bookLikeCount"
      >
        {{ comment.text }}
      </FeedPost>
      <NuxtLink
        v-if="bookSlug"
        :to="`/book/${bookSlug}`"
        class="group inline-block"
      >
        <Button variant="archivalGhost" size="sm">
          View discussion
          <ArrowRight
            class="h-4 w-4 transition-transform group-hover:translate-x-1"
          />
        </Button>
      </NuxtLink>
    </div>
  </section>
</template>
