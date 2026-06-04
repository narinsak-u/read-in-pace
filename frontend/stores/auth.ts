import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface User {
  name: string;
  email: string;
}

export const useAuthStore = defineStore('auth', () => {
  const signedIn = ref(false);
  const user = ref<User | null>(null);
  const adminMode = ref(false);
  const loading = ref(false);

  async function fetchSession() {
    try {
      const session = await $fetch('/api/auth/session');
      if (session?.user) {
        user.value = session.user;
        signedIn.value = true;
      } else {
        signedIn.value = false;
        user.value = null;
      }
    } catch {
      signedIn.value = false;
      user.value = null;
    }
  }

  async function signIn(email: string, password: string) {
    loading.value = true;
    try {
      const data = await $fetch('/api/auth/sign-in/email', {
        method: 'POST',
        body: { email, password },
      });
      if (data?.user) {
        user.value = data.user;
        signedIn.value = true;
      }
    } catch {
      signedIn.value = false;
      user.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function signUp(name: string, email: string, password: string) {
    loading.value = true;
    try {
      const data = await $fetch('/api/auth/sign-up/email', {
        method: 'POST',
        body: { name, email, password },
      });
      if (data?.user) {
        user.value = data.user;
        signedIn.value = true;
      }
    } catch {
      signedIn.value = false;
      user.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function signOut() {
    await $fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => {});
    signedIn.value = false;
    user.value = null;
  }

  function toggleAdmin() {
    adminMode.value = !adminMode.value;
  }

  return {
    signedIn,
    user,
    adminMode,
    loading,
    fetchSession,
    signIn,
    signUp,
    signOut,
    toggleAdmin,
  };
});
