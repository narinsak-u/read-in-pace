# Auth Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock auth with real PostgreSQL-backed Better Auth on NestJS + auth modal on Nuxt frontend.

**Architecture:** Better Auth mounts as Express middleware on the NestJS backend at `/api/auth/*`. A NestJS guard/decorator pattern validates sessions for protected routes. The frontend proxies auth requests through Nuxt server routes and uses a Pinia store with real API calls. PostgreSQL runs in Docker.

**Tech Stack:** better-auth, drizzle-orm, pg, NestJS v11, Nuxt 3, Vue 3, Pinia

---

### Task 1: Docker Compose — PostgreSQL

**Files:**
- Create: `docker-compose.yml` (project root)

- [ ] **Step 1: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: readinpace-db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: readinpace
      POSTGRES_PASSWORD: readinpace
      POSTGRES_DB: readinpace
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: Create .env file (backend) for reference**

Create `backend/.env`:
```
DATABASE_URL=postgres://readinpace:readinpace@localhost:5432/readinpace
BETTER_AUTH_SECRET=dev-secret-change-in-production
```

Add `backend/.env` to `.gitignore` (check if `.gitignore` already covers `.env` files).

- [ ] **Step 3: Commit**

---

### Task 2: Backend dependencies

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install dependencies**

Run from `backend/`:

```bash
npm install better-auth drizzle-orm pg
npm install --save-dev drizzle-kit @types/pg
```

- [ ] **Step 2: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: add better-auth, drizzle-orm, pg dependencies"
```

---

### Task 3: Drizzle schema + config

**Files:**
- Create: `backend/drizzle.config.ts`
- Create: `backend/src/db/schema.ts`
- Create: `backend/src/db/migrations/.gitkeep`

- [ ] **Step 1: Create drizzle config**

`backend/drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 2: Create schema file**

Better Auth v1 provides Drizzle table definitions for its auth tables. Import them and re-export as the combined schema.

`backend/src/db/schema.ts`:
```ts
// Better Auth provides the auth tables via its drizzle exports.
// The exact import path should be verified against the installed version.
// Possible paths: "better-auth/db/drizzle" or "better-auth/adapters/drizzle"
import { user, session, account, verification } from 'better-auth/db/drizzle';

export { user, session, account, verification };
```

Create migration output directory:
```bash
mkdir -p backend/src/db/migrations
touch backend/src/db/migrations/.gitkeep
```

Note: The import path `better-auth/db/drizzle` is the standard Better Auth v1 export path. After installing, verify the actual export path by checking `node_modules/better-auth/db/drizzle/` or the package's `package.json` exports field. Adjust if different.

- [ ] **Step 3: Commit**

---

### Task 4: Drizzle NestJS module

**Files:**
- Create: `backend/src/db/db.module.ts`
- Create: `backend/src/db/db.provider.ts`

- [ ] **Step 1: Create DB provider**

`backend/src/db/db.provider.ts`:
```ts
import { Provider } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const DRIZZLE = 'DRIZZLE';

export const drizzleProvider: Provider = {
  provide: DRIZZLE,
  useFactory: () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    return drizzle(pool, { schema });
  },
};
```

- [ ] **Step 2: Create DB module**

`backend/src/db/db.module.ts`:
```ts
import { Global, Module } from '@nestjs/common';
import { drizzleProvider, DRIZZLE } from './db.provider';

@Global()
@Module({
  providers: [drizzleProvider],
  exports: [DRIZZLE],
})
export class DbModule {}

export { DRIZZLE };
```

- [ ] **Step 3: Import DbModule in AppModule**

`backend/src/app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';

@Module({
  imports: [AuthModule, DbModule],
})
export class AppModule {}
```

- [ ] **Step 4: Commit**

---

### Task 5: Better Auth instance

**Files:**
- Create: `backend/src/auth/better-auth.ts`

- [ ] **Step 1: Create Better Auth instance**

`backend/src/auth/better-auth.ts`:
```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ['http://localhost:3000'],
});
```

Note: The import path `better-auth/adapters/drizzle` is the standard Better Auth v1 adapter path. Verify after install.

- [ ] **Step 2: Commit**

---

### Task 6: NestJS auth guard + decorator

**Files:**
- Create: `backend/src/auth/auth.guard.ts`
- Create: `backend/src/auth/current-user.decorator.ts`

- [ ] **Step 1: Create auth guard**

`backend/src/auth/auth.guard.ts`:
```ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { auth } from './better-auth';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      throw new UnauthorizedException();
    }

    request.user = session.user;
    return true;
  }
}
```

- [ ] **Step 2: Create current-user decorator**

`backend/src/auth/current-user.decorator.ts`:
```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 3: Commit**

---

### Task 7: Update auth module + main.ts

**Files:**
- Modify: `backend/src/auth/auth.module.ts`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Rewrite auth module**

`backend/src/auth/auth.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

@Module({
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
```

- [ ] **Step 2: Mount Better Auth middleware in main.ts**

`backend/src/main.ts`:
```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { auth } from './auth/better-auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // Mount Better Auth middleware — handles /api/auth/sign-in, /api/auth/sign-up,
  // /api/auth/sign-out, /api/auth/session and others
  app.use('/api/auth', auth.handler);

  await app.listen(4000);
  console.log('Backend running on http://localhost:4000');
}
bootstrap();
```

- [ ] **Step 3: Commit**

---

### Task 8: Update frontend proxy for cookie forwarding

**Files:**
- Modify: `frontend/server/api/auth/[...].ts`

- [ ] **Step 1: Rewrite proxy to forward cookies**

`frontend/server/api/auth/[...].ts`:
```ts
export default defineEventHandler(async (event) => {
  const backendUrl = useRuntimeConfig().public.backendUrl;
  const path = event.path;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Forward the client's cookie header so Better Auth can read the session cookie
  const cookie = getHeader(event, 'cookie');
  if (cookie) {
    headers['cookie'] = cookie;
  }

  const response = await fetch(`${backendUrl}${path}`, {
    method: event.method,
    headers,
    body:
      event.method !== 'GET' && event.method !== 'HEAD'
        ? JSON.stringify(await readBody(event))
        : undefined,
  });

  // Forward Set-Cookie from the backend response to the client
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    setHeader(event, 'set-cookie', setCookie);
  }

  return response.json();
});
```

- [ ] **Step 2: Commit**

---

### Task 9: Rewrite auth store

**Files:**
- Modify: `frontend/stores/auth.ts`

- [ ] **Step 1: Rewrite auth store with real API calls**

`frontend/stores/auth.ts`:
```ts
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
      }
    } catch {
      signedIn.value = false;
      user.value = null;
    }
  }

  async function signIn(email: string, password: string) {
    loading.value = true;
    try {
      const data = await $fetch('/api/auth/sign-in', {
        method: 'POST',
        body: { email, password },
      });
      if (data?.user) {
        user.value = data.user;
        signedIn.value = true;
      }
    } finally {
      loading.value = false;
    }
  }

  async function signUp(name: string, email: string, password: string) {
    loading.value = true;
    try {
      const data = await $fetch('/api/auth/sign-up', {
        method: 'POST',
        body: { name, email, password },
      });
      if (data?.user) {
        user.value = data.user;
        signedIn.value = true;
      }
    } finally {
      loading.value = false;
    }
  }

  async function signOut() {
    await $fetch('/api/auth/sign-out', { method: 'POST' });
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
```

- [ ] **Step 2: Commit**

---

### Task 10: Auth modal component

**Files:**
- Create: `frontend/components/AuthModal.vue`

- [ ] **Step 1: Create AuthModal component**

`frontend/components/AuthModal.vue`:
```vue
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const emit = defineEmits<{
  close: [];
}>();

const auth = useAuthStore();
const router = useRouter();

const tab = ref<'sign-in' | 'sign-up'>('sign-in');
const email = ref('');
const password = ref('');
const name = ref('');
const error = ref('');
const submitting = ref(false);

async function handleSubmit() {
  error.value = '';
  submitting.value = true;
  try {
    if (tab.value === 'sign-in') {
      await auth.signIn(email.value, password.value);
    } else {
      await auth.signUp(name.value, email.value, password.value);
    }
    emit('close');
    router.push('/feed');
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Something went wrong';
  } finally {
    submitting.value = false;
  }
}

function switchTab(t: 'sign-in' | 'sign-up') {
  tab.value = t;
  error.value = '';
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-2xl"
    >
      <div class="mb-6 text-center">
        <p class="text-lg font-semibold tracking-tight">
          Read<span class="text-primary"> in </span>Pace
        </p>
      </div>

      <!-- Tabs -->
      <div class="mb-6 flex rounded-lg border border-border bg-muted p-1">
        <button
          @click="switchTab('sign-in')"
          class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          :class="tab === 'sign-in' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
        >
          Sign In
        </button>
        <button
          @click="switchTab('sign-up')"
          class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          :class="tab === 'sign-up' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
        >
          Sign Up
        </button>
      </div>

      <!-- Error -->
      <p
        v-if="error"
        class="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {{ error }}
      </p>

      <!-- Name field (sign-up only) -->
      <div v-if="tab === 'sign-up'" class="mb-4">
        <label class="mb-1 block text-sm font-medium text-muted-foreground">Name</label>
        <input
          v-model="name"
          type="text"
          placeholder="Alex Rivera"
          class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary"
        />
      </div>

      <!-- Email -->
      <div class="mb-4">
        <label class="mb-1 block text-sm font-medium text-muted-foreground">Email</label>
        <input
          v-model="email"
          type="email"
          placeholder="alex@example.com"
          class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary"
        />
      </div>

      <!-- Password -->
      <div class="mb-6">
        <label class="mb-1 block text-sm font-medium text-muted-foreground">Password</label>
        <input
          v-model="password"
          type="password"
          placeholder="At least 8 characters"
          class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary"
        />
      </div>

      <!-- Submit -->
      <button
        @click="handleSubmit"
        :disabled="submitting"
        class="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {{ submitting ? 'Please wait...' : tab === 'sign-in' ? 'Sign in' : 'Create account' }}
      </button>

      <!-- Switch tab -->
      <p class="mt-4 text-center text-sm text-muted-foreground">
        <template v-if="tab === 'sign-in'">
          Don't have an account?
          <button @click="switchTab('sign-up')" class="font-medium text-primary hover:underline">
            Sign up
          </button>
        </template>
        <template v-else>
          Already have an account?
          <button @click="switchTab('sign-in')" class="font-medium text-primary hover:underline">
            Sign in
          </button>
        </template>
      </p>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

---

### Task 11: Navbar + session hydration

**Files:**
- Modify: `frontend/components/Navbar.vue`
- Modify: `frontend/app.vue` — or `layouts/default.vue`

- [ ] **Step 1: Update Navbar to use real auth store and modal trigger**

`frontend/components/Navbar.vue` — wrap the profile area with a `showAuthModal` ref. Add `AuthModal` component rendering when `showAuthModal` is true.

Insert the modal trigger into the existing Navbar. When signed out, the avatar button shows a user icon and opens the modal. When signed in, the avatar shows initials as before.

Key changes to `Navbar.vue`:
- Import `AuthModal` (auto-imported by Nuxt, no manual import needed)
- Add `const showAuthModal = ref(false);`
- Guest state: replace the `User` icon button click to open modal instead of old toggle
- Signed-in state: use `auth.user?.name` instead of `auth.username`, use initials from the real user
- Sign out button calls `auth.signOut()` instead of `auth.toggleAuth()`
- Add `<AuthModal v-if="showAuthModal" @close="showAuthModal = false" />` in the template

Replace the false-branch template (signed-out state) button:
```vue
<button
  @click="showAuthModal = true"
  class="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted"
  aria-label="Sign in"
>
  <User class="h-4 w-4" />
</button>
```

Replace the signed-in avatar text to read from `auth.user`:
```vue
<span v-if="auth.signedIn && auth.user" class="text-sm font-semibold">
  {{ auth.user.name.split(' ').map((n: string) => n[0]).join('') }}
</span>
```

Replace the username in the dropdown:
```vue
<p class="text-sm font-medium">{{ auth.user?.name }}</p>
<p class="text-xs text-muted-foreground">{{ auth.user?.email }}</p>
```

Replace the sign-out button handler:
```vue
<button
  @mousedown="auth.signOut()"
  class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-muted"
>
  <LogOut class="h-4 w-4" /> Sign out
</button>
```

Add modal rendering at the end of the template:
```vue
<AuthModal v-if="showAuthModal" @close="showAuthModal = false" />
```

- [ ] **Step 2: Add session hydration**

Add session hydration to `layouts/default.vue`:

```vue
<script setup lang="ts">
const route = useRoute();
const auth = useAuthStore();

// Hydrate session on mount
onMounted(() => {
  auth.fetchSession();
});
</script>
```

Or to `app.vue`:
```vue
<script setup lang="ts">
const auth = useAuthStore();
onMounted(() => {
  auth.fetchSession();
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

The `layouts/default.vue` approach is cleaner since that's where the navbar lives.

- [ ] **Step 3: Commit**

---

### Task 12: Clean up + verify

**Files:**
- Delete: `backend/src/auth/auth.controller.ts`
- Delete: `backend/src/auth/auth.service.ts`

- [ ] **Step 1: Delete mock auth files**

```bash
rm backend/src/auth/auth.controller.ts backend/src/auth/auth.service.ts
```

- [ ] **Step 2: Start PostgreSQL**

```bash
docker compose up -d
```

- [ ] **Step 3: Push Drizzle schema to create tables**

```bash
cd backend
npx drizzle-kit push
```

- [ ] **Step 4: Start backend and verify**

```bash
cd backend
npm run start:dev
```

Verify Better Auth routes respond:
```bash
curl -X POST http://localhost:4000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex","email":"alex@test.com","password":"password123"}'
```

Expected: returns user + session JSON.

- [ ] **Step 5: Start frontend and verify proxy**

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`, click "Sign in" in navbar, verify modal appears. Test sign-up flow. After signing up, verify navbar shows user initials and dropdown has "Sign out".

- [ ] **Step 6: Run backend tests**

```bash
cd backend
npm run test
```

Verify existing tests still pass (AppController spec should remain passing).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: integrate real auth with Better Auth, Drizzle, PostgreSQL"
```
