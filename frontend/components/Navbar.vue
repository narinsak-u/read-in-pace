<script setup lang="ts">
import {
  Rss,
  LayoutDashboard,
  User,
  LogOut,
  Shield,
} from 'lucide-vue-next';
import { computed } from 'vue';
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();
const open = shallowRef(false);
const dropdownRef = shallowRef<HTMLElement | null>(null);
const buttonRef = shallowRef<HTMLElement | null>(null);
const router = useRouter();

function onClickOutside(e: MouseEvent) {
  if (!open.value) return;
  const target = e.target as Node;
  if (dropdownRef.value?.contains(target) || buttonRef.value?.contains(target)) return;
  open.value = false;
}

onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));

const userInitials = computed(() => {
  if (!auth.user) return '';
  return auth.user.name
    .split(' ')
    .map((n: string) => n[0])
    .join('');
});

function navigate(path: string) {
  open.value = false;
  router.push(path);
}
</script>

<template>
  <header
    class="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl"
  >
    <div
      class="mx-auto flex h-16 max-w-5xl items-center justify-between px-6 md:px-0"
    >
      <NuxtLink to="/" class="text-lg font-semibold tracking-tight">
        Read<span class="text-primary"> in </span>Pace
      </NuxtLink>

      <nav class="flex items-center gap-1">
        <NuxtLink
          to="/feed"
          class="hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
        >
          <Rss class="h-4 w-4" /> Feed
        </NuxtLink>
        <NuxtLink
          to="/dashboard"
          class="hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
        >
          <LayoutDashboard class="h-4 w-4" /> My Dashboard
        </NuxtLink>
        <CartIcon class="ml-2" />

        <!-- Profile -->
        <div class="relative ml-2">
          <button
            ref="buttonRef"
            @click="open = !open"
            class="flex h-9 w-9 items-center cursor-pointer justify-center rounded-sm bg-transparent text-muted-foreground transition-colors hover:text-primary"
            aria-label="Profile menu"
          >
            <span v-if="auth.signedIn && auth.user" class="text-sm font-semibold">
              {{ userInitials }}
            </span>
            <User v-else class="h-4 w-4" />
          </button>
          <div
            v-if="open"
            ref="dropdownRef"
            class="absolute right-0 mt-2 w-60 origin-top-right rounded-xl border border-border bg-card p-2 shadow-md"
          >
            <template v-if="auth.signedIn">
              <div class="px-3 py-2">
                <p class="text-sm font-medium">{{ auth.user?.name }}</p>
                <p class="text-xs text-muted-foreground">{{ auth.user?.email }}</p>
              </div>
              <div class="my-1 h-px bg-border" />
              <Button
                variant="archivalGhost"
                class="w-full justify-start"
                @mousedown="navigate('/dashboard')"
              >
                <LayoutDashboard class="h-4 w-4" /> Dashboard
              </Button>
              <Button
                variant="archivalGhost"
                class="w-full justify-between"
                @mousedown="auth.toggleAdmin()"
              >
                <span class="flex items-center gap-2"><Shield class="h-4 w-4" /> Admin mode</span>
                <span
                  class="relative h-4 w-7 rounded-full transition-colors"
                  :class="auth.adminMode ? 'bg-primary' : 'bg-muted-foreground/30'"
                >
                  <span
                    class="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all"
                    :class="auth.adminMode ? 'left-3.5' : 'left-0.5'"
                  />
                </span>
              </Button>
              <Button
                variant="archivalGhost"
                class="w-full justify-start text-destructive"
                @mousedown="auth.signOut()"
              >
                <LogOut class="h-4 w-4" /> Sign out
              </Button>
            </template>
            <template v-else>
              <Button
                variant="archivalGhost"
                class="w-full justify-start"
                @mousedown="auth.openAuthModal()"
              >
                Sign in
              </Button>
            </template>
          </div>
        </div>
      </nav>
    </div>
  </header>
  <AuthModal v-if="auth.showAuthModal" @close="auth.closeAuthModal()" />
</template>
