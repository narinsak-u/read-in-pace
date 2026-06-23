<script setup lang="ts">
import { Button } from '~/components/ui/button';
import { useAuthStore } from '~/stores/auth';

interface CommentUser {
  id: string;
  name: string;
  image: string | null;
}

interface ApiComment {
  id: string;
  bookId: string;
  userId: string;
  parentId: string | null;
  text: string;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  likedByUser: boolean;
  user: CommentUser;
  replies?: ApiComment[];
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

const auth = useAuthStore();

const reviews = ref<Review[]>([]);
const loaded = shallowRef(false);
const submitting = shallowRef(false);
const replyingSubmitId = shallowRef<string | null>(null);

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
    rating: comment.rating ?? 0,
    text: comment.text,
    likes: comment.likeCount ?? 0,
    replies: (comment.replies ?? []).map(
      (r) => `${r.text} — ${r.user.name}`,
    ),
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

async function publishReview() {
  if (!rating.value || !reviewText.value.trim()) return;

  if (!auth.signedIn) {
    auth.openAuthModal(() => {
      void publishReview();
    });
    return;
  }

  submitting.value = true;
  try {
    await $fetch<ApiComment>(`/api/books/${bookId}/comments`, {
      method: 'POST',
      body: { text: reviewText.value.trim(), rating: rating.value },
    });
    await fetchComments();
    rating.value = 0;
    reviewText.value = '';
    flash('Your review is now part of the discussion.');
  } catch (e: any) {
    if (e?.status === 401) {
      auth.openAuthModal(() => {
        void publishReview();
      });
    } else if (e?.data?.message) {
      flash(e.data.message);
    } else {
      flash('Could not publish your review. Please try again.');
    }
  } finally {
    submitting.value = false;
  }
}

async function publishReply(reviewId: string, text: string) {
  if (!text.trim()) return;

  if (!auth.signedIn) {
    auth.openAuthModal(() => {
      void publishReply(reviewId, text);
    });
    return;
  }

  replyingSubmitId.value = reviewId;
  try {
    await $fetch<ApiComment>(`/api/books/${bookId}/comments`, {
      method: 'POST',
      body: { text, parentId: reviewId },
    });
    await fetchComments();
    replyingTo.value = null;
  } catch (e: any) {
    if (e?.status === 401) {
      auth.openAuthModal(() => {
        void publishReply(reviewId, text);
      });
    } else if (e?.data?.message) {
      flash(e.data.message);
    } else {
      flash('Could not post your reply. Please try again.');
    }
  } finally {
    replyingSubmitId.value = null;
  }
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
            :reply-submitting="replyingSubmitId === item.id"
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
        :submitting="submitting"
        @update:rating="rating = $event"
        @update:review-text="reviewText = $event"
        @publish="publishReview"
      />
    </div>
  </section>
</template>
