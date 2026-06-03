import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useDashboardStore = defineStore('dashboard', () => {
  const borrowed = ref<string[]>(['2', '5']);
  const purchased = ref<string[]>(['1', '7', '9']);

  function borrow(id: string) {
    if (!borrowed.value.includes(id)) {
      borrowed.value = [...borrowed.value, id];
    }
  }

  function returnBook(id: string) {
    borrowed.value = borrowed.value.filter((x) => x !== id);
  }

  function buy(id: string) {
    if (!purchased.value.includes(id)) {
      purchased.value = [...purchased.value, id];
    }
  }

  return { borrowed, purchased, borrow, returnBook, buy };
});
