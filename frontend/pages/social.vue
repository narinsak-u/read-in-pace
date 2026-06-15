<script setup lang="ts">
import { useSocialStore } from '~/stores/social';

const socialStore = useSocialStore();
const text = shallowRef('');
const rating = shallowRef(0);
const submitting = shallowRef(false);

definePageMeta({
  title: 'Social — Read in Pace',
  description: 'Reader feed and community discussions.',
});

async function handlePublish() {
  if (!text.value.trim()) return;
  submitting.value = true;
  try {
    await socialStore.createPost(text.value, rating.value || undefined);
    text.value = '';
    rating.value = 0;
  } catch {
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  socialStore.fetchFeed();
});
</script>

<template>
  <NuxtLayout name="app">
    <template #sidebar>
      <AppSidebar>
        <template #yearly-progress>
          <YearlyProgressCard />
        </template>
        <template #reader-feed>
          <CompactFeedPosts :posts="socialStore.posts.slice(0, 3)" />
        </template>
      </AppSidebar>
    </template>

    <div class="space-y-8">
      <!-- Post Composer -->
      <section class="animate-enter rounded-sm border border-border bg-card p-5">
        <h2 class="mb-3 font-serif text-lg">What are you reading?</h2>
        <textarea
          v-model="text"
          rows="3"
          placeholder="Share your thoughts..."
          class="mb-3 w-full resize-none rounded-sm border border-border bg-input p-3 text-sm placeholder-muted-foreground focus:ring-1 focus:ring-ring"
        />
        <div class="flex items-center justify-between">
          <div class="flex gap-1" aria-label="Rating">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              :aria-label="`Rate ${n} stars`"
              @click="rating = rating === n ? 0 : n"
              class="cursor-pointer text-lg"
              :class="n <= rating ? 'text-primary' : 'text-border'"
            >
              {{ n <= rating ? '★' : '☆' }}
            </button>
          </div>
          <Button
            variant="archival"
            :disabled="!text.trim() || submitting"
            @click="handlePublish"
          >
            {{ submitting ? 'Publishing' : 'Publish' }}
          </Button>
        </div>
      </section>

      <!-- Feed -->
      <section class="animate-enter [animation-delay:100ms]">
        <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
          <h1 class="font-serif text-2xl">Reader Feed</h1>
          <span class="size-2 rounded-full bg-primary" />
        </div>

        <template v-if="socialStore.loading">
          <p class="text-muted-foreground italic">Loading feed...</p>
        </template>
        <template v-else-if="socialStore.posts.length === 0">
          <p class="text-muted-foreground italic">No posts yet. Start the conversation!</p>
        </template>
        <div v-else class="space-y-6">
          <FeedPost v-for="post in socialStore.posts" :key="post.id" :post="post" />
        </div>
      </section>
    </div>
  </NuxtLayout>
</template>
