import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Book } from '~/data/books';

export interface BookWithMeta extends Book {
  likeCount: number;
  commentCount: number;
  avgRating: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Comment {
  id: string;
  bookId: string;
  userId: string;
  text: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

export const useBooksStore = defineStore('books', () => {
  const books = ref<BookWithMeta[]>([]);
  const trending = ref<BookWithMeta[]>([]);
  const currentBook = ref<BookWithMeta | null>(null);
  const comments = ref<Comment[]>([]);
  const liked = ref<Record<string, boolean>>({});
  const userRating = ref<Record<string, number>>({});
  const meta = ref<PaginationMeta>({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const loading = ref(false);

  async function fetchBooks(page = 1, limit = 12, category?: string) {
    loading.value = true;
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (category && category !== 'All') params.set('category', category);

      const res = await $fetch<{ data: BookWithMeta[]; meta: PaginationMeta }>(`/api/books?${params}`);
      books.value = res.data;
      meta.value = res.meta;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTrending() {
    const res = await $fetch<BookWithMeta[]>('/api/books/trending');
    trending.value = res;
  }

  async function fetchBook(id: string) {
    const res = await $fetch<BookWithMeta>(`/api/books/${id}`);
    currentBook.value = res;
    return res;
  }

  async function createBook(data: {
    title: string;
    author: string;
    price: string;
    cover: string;
    synopsis: string;
    category: string;
    trending?: boolean;
  }) {
    const res = await $fetch('/api/books', {
      method: 'POST',
      body: data,
    });
    return res;
  }

  async function updateBook(id: string, data: Partial<{
    title: string;
    author: string;
    price: string;
    cover: string;
    synopsis: string;
    category: string;
    trending: boolean;
  }>) {
    const res = await $fetch(`/api/books/${id}`, {
      method: 'PUT',
      body: data,
    });
    return res;
  }

  async function deleteBook(id: string) {
    await $fetch(`/api/books/${id}`, { method: 'DELETE' });
  }

  async function toggleLike(id: string) {
    const res = await $fetch<{ liked: boolean; likeCount: number }>(`/api/books/${id}/like`, {
      method: 'POST',
    });
    liked.value = { ...liked.value, [id]: res.liked };
    return res;
  }

  async function fetchComments(bookId: string) {
    const res = await $fetch<Comment[]>(`/api/books/${bookId}/comments`);
    comments.value = res;
    return res;
  }

  async function createComment(bookId: string, text: string) {
    const res = await $fetch(`/api/books/${bookId}/comments`, {
      method: 'POST',
      body: { text },
    });
    return res;
  }

  async function deleteComment(bookId: string, commentId: string) {
    await $fetch(`/api/books/${bookId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  async function rateBook(bookId: string, rating: number) {
    const res = await $fetch<{ avgRating: number; userRating: number }>(`/api/books/${bookId}/rate`, {
      method: 'POST',
      body: { rating },
    });
    userRating.value = { ...userRating.value, [bookId]: res.userRating };
    return res;
  }

  return {
    books, trending, currentBook, comments, liked, userRating, meta, loading,
    fetchBooks, fetchTrending, fetchBook, createBook, updateBook, deleteBook,
    toggleLike, fetchComments, createComment, deleteComment, rateBook,
  };
});
