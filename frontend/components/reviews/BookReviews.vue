<script setup lang="ts">
import { Button } from '~/components/ui/button';

interface CommentUser {
  id: string;
  name: string;
  image: string | null;
}

interface ApiComment {
  id: string;
  bookId: string;
  userId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
}

interface Review {
  id: string;
  initials: string;
  name: string;
  time: string;
  rating: number;
  text: string;
  likes: number;
  replies: string[];
}

const { flash, bookId } = defineProps<{
  flash: (message: string) => void;
  bookId: string;
}>();

const reviews = ref<Review[]>([]);
const loaded = shallowRef(false);

function getInitials(name: string): string {
  return name.toUpperCase().slice(0, 2);
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function mapCommentToReview(comment: ApiComment): Review {
  return {
    id: comment.id,
    initials: getInitials(comment.user.name),
    name: comment.user.name,
    time: timeAgo(comment.createdAt),
    rating: 0,
    text: comment.text,
    likes: 0,
    replies: [],
  };
}

async function fetchComments() {
  try {
    const data = await $fetch<ApiComment[]>(`/api/books/${bookId}/comments`);
    reviews.value = data.map(mapCommentToReview);
  } catch {
    reviews.value = [];
  } finally {
    loaded.value = true;
  }
}

onMounted(fetchComments);

const rating = shallowRef(0);
const reviewText = shallowRef('');
const replyingTo = shallowRef<string | null>(null);

function publishReview() {
  if (!rating.value || !reviewText.value.trim()) return;
  reviews.value.unshift({
    id: crypto.randomUUID(),
    initials: 'JS',
    name: 'Jamie S.',
    time: 'Just now',
    rating: rating.value,
    text: reviewText.value.trim(),
    likes: 0,
    replies: [],
  });
  rating.value = 0;
  reviewText.value = '';
  flash('Your review is now part of the discussion.');
}

function publishReply(reviewId: string, text: string) {
  reviews.value = reviews.value.map((r) =>
    r.id === reviewId ? { ...r, replies: [...r.replies, `${text} — Jamie S.`] } : r,
  );
  replyingTo.value = null;
}
</script>

<template>
  <section id="discussion" class="scroll-mt-24 py-14">
    <div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <div class="mb-8 flex items-end justify-between border-b border-border pb-3">
          <div>
            <p class="font-mono text-[10px] uppercase tracking-widest text-primary">Reader room</p>
            <h2 class="mt-1 font-serif text-3xl">Reviews &amp; discussion</h2>
          </div>
          <span class="text-sm text-muted-foreground">{{ reviews.length }} conversations</span>
        </div>
        <div class="divide-y divide-border">
          <ReviewItem
            v-for="item in reviews"
            :key="item.id"
            :review="item"
            :is-replying="replyingTo === item.id"
            @like="item.likes++"
            @reply="replyingTo = replyingTo === item.id ? null : item.id"
            @publish-reply="(text: string) => publishReply(item.id, text)"
            @cancel-reply="replyingTo = null"
          />
        </div>
      </div>

      <ReviewForm
        :rating="rating"
        :review-text="reviewText"
        :flash="flash"
        @update:rating="rating = $event"
        @update:review-text="reviewText = $event"
        @publish="publishReview"
      />
    </div>
  </section>
</template>
