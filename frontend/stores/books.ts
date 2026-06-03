import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { books as bookData, getBook as getBookData, mockReviews, type Book, type Review } from '~/data/books';

export const useBooksStore = defineStore('books', () => {
  const books = ref<Book[]>(bookData);
  const liked = ref<Record<string, boolean>>({});
  const reviews = ref<Record<string, Review[]>>({});

  const trendingBooks = computed(() =>
    books.value.filter((b) => b.trending)
  );

  function getBook(id: string) {
    return getBookData(id);
  }

  function getReviews(bookId: string) {
    if (!reviews.value[bookId]) {
      reviews.value[bookId] = [...mockReviews];
    }
    return reviews.value[bookId];
  }

  function addReview(bookId: string, review: Review) {
    if (!reviews.value[bookId]) {
      reviews.value[bookId] = [...mockReviews];
    }
    reviews.value[bookId] = [review, ...reviews.value[bookId]];
  }

  function toggleLike(id: string) {
    liked.value = { ...liked.value, [id]: !liked.value[id] };
  }

  return { books, liked, trendingBooks, getBook, getReviews, addReview, toggleLike };
});
