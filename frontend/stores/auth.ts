import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const signedIn = ref(true);
  const username = ref('Alex Rivera');
  const adminMode = ref(false);

  async function toggleAuth() {
    if (signedIn.value) {
      await $fetch('/api/auth/logout', { method: 'POST' });
      signedIn.value = false;
    } else {
      await $fetch('/api/auth/login', {
        method: 'POST',
        body: { username: username.value },
      });
      signedIn.value = true;
    }
  }

  function toggleAdmin() {
    adminMode.value = !adminMode.value;
  }

  return { signedIn, username, adminMode, toggleAuth, toggleAdmin };
});
