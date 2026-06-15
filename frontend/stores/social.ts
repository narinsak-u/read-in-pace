import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import { toast } from 'vue-sonner';

export interface Post {
  id: string;
  text: string;
  rating: number | null;
  createdAt: string;
  user: { id: string; name: string; image: string | null };
  likeCount: number;
  replyCount: number;
  liked: boolean;
}

export interface Reply {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; image: string | null };
}

export const useSocialStore = defineStore('social', () => {
  const posts = shallowRef<Post[]>([]);
  const loading = shallowRef(false);

  async function fetchFeed(): Promise<void> {
    loading.value = true;
    try {
      const res = await $fetch<Post[]>('/api/feed');
      posts.value = res;
    } catch {
    } finally {
      loading.value = false;
    }
  }

  async function createPost(text: string, rating?: number): Promise<void> {
    try {
      await $fetch('/api/feed', {
        method: 'POST',
        body: { text, rating },
      });
      toast.success('Your review was published to the reader feed.');
      await fetchFeed();
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to post');
      else toast.error('Failed to publish post');
      throw e;
    }
  }

  async function toggleLike(postId: string): Promise<void> {
    try {
      const res = await $fetch<{ liked: boolean; likeCount: number }>(
        `/api/feed/${postId}/like`,
        { method: 'POST' },
      );
      posts.value = posts.value.map((p) =>
        p.id === postId
          ? { ...p, liked: res.liked, likeCount: res.likeCount }
          : p,
      );
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to like posts');
      throw e;
    }
  }

  async function replyToPost(postId: string, text: string): Promise<void> {
    try {
      await $fetch(`/api/feed/${postId}/reply`, {
        method: 'POST',
        body: { text },
      });
      toast.success('Reply published.');
      await fetchFeed();
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to reply');
      else toast.error('Failed to publish reply');
      throw e;
    }
  }

  return {
    posts: readonly(posts),
    loading: readonly(loading),
    fetchFeed,
    createPost,
    toggleLike,
    replyToPost,
  };
});
