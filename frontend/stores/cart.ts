import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import { toast } from 'vue-sonner';

export interface CartItem {
  bookId: string;
  title: string;
  author: string;
  cover: string;
  price: number;
  category: string;
}

export const useCartStore = defineStore(
  'cart',
  () => {
    const items = shallowRef<CartItem[]>([]);
    const drawerOpen = ref(false);

    const itemCount = computed(() => items.value.length);
    const subtotal = computed(() =>
      items.value.reduce((sum, item) => sum + item.price, 0),
    );
    const isEmpty = computed(() => items.value.length === 0);

    function addItem(book: CartItem) {
      if (items.value.some((i) => i.bookId === book.bookId)) {
        toast.info('This book is already in your cart');
        return;
      }
      items.value = [...items.value, book];
      drawerOpen.value = true;
    }

    function removeItem(bookId: string) {
      items.value = items.value.filter((i) => i.bookId !== bookId);
    }

    function clear() {
      items.value = [];
    }

    function openDrawer() { drawerOpen.value = true; }
    function closeDrawer() { drawerOpen.value = false; }
    function toggleDrawer() { drawerOpen.value = !drawerOpen.value; }

    async function checkout() {
      try {
        const res = await $fetch<{ url: string }>('/api/cart/checkout', {
          method: 'POST',
          body: { bookIds: items.value.map((i) => i.bookId) },
        });
        await navigateTo(res.url, { external: true });
      } catch (e: any) {
        if (e?.statusCode === 401) {
          toast.error('Please sign in to checkout');
        } else if (e?.data?.message) {
          toast.error(e.data.message);
        } else {
          toast.error('Failed to start checkout');
        }
      }
    }

    return {
      items: readonly(items),
      itemCount,
      subtotal,
      isEmpty,
      drawerOpen: readonly(drawerOpen),
      addItem,
      removeItem,
      clear,
      checkout,
      openDrawer,
      closeDrawer,
      toggleDrawer,
    };
  },
  {
    persist: true,
  },
);
