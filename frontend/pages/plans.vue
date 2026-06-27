<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import { useAuthStore } from "~/stores/auth";

definePageMeta({
  title: "Plans — Read in Peace",
  description: "Choose a membership plan that fits your reading pace.",
});

const auth = useAuthStore();
const { flash } = useFlash();

interface Plan {
  name: string;
  monthlyPrice: number | null;
  itemLimit: string;
  returnWindow: string;
  buyToKeepDiscount: string;
  highlighted?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    name: "The Bibliophile",
    monthlyPrice: null,
    itemLimit: "15 Items",
    returnWindow: "7 Days",
    buyToKeepDiscount: "5% Off",
  },
  {
    name: "The Curator",
    monthlyPrice: 35,
    itemLimit: "25 Items",
    returnWindow: "2 Weeks",
    buyToKeepDiscount: "15% Off",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "The Archivist",
    monthlyPrice: 75,
    itemLimit: "50 Items",
    returnWindow: "1 Month",
    buyToKeepDiscount: "25% Off",
  },
];

const features = [
  { key: "itemLimit", label: "Borrow limit" },
  { key: "returnWindow", label: "Return window" },
  { key: "buyToKeepDiscount", label: "Buy-to-keep discount" },
] as const;

function onSelect(plan: Plan) {
  if (!auth.signedIn) {
    auth.openAuthModal(() => {
      void onSelect(plan);
    });
    return;
  }
  flash(`${plan.name} selected — checkout coming soon.`);
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <Nav mode="cart" />

    <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
      <div class="border-b border-border pb-5">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">
          Membership
        </p>
        <h1 class="mt-2 font-serif text-4xl font-bold md:text-5xl">
          Choose your plan
        </h1>
        <p class="mt-2 max-w-lg text-sm text-muted-foreground">
          Borrow at your own pace. Upgrade anytime, cancel anytime.
        </p>
      </div>

      <div class="my-12 grid gap-6 md:grid-cols-3">
        <article
          v-for="plan in plans"
          :key="plan.name"
          class="relative flex flex-col rounded-sm border px-6 py-10 transition-colors"
          :class="
            plan.highlighted
              ? 'border-primary bg-card shadow-sm'
              : 'border-border bg-card'
          "
        >
          <span
            v-if="plan.badge"
            class="absolute -top-3 left-6 rounded-sm bg-primary px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary-foreground"
          >
            {{ plan.badge }}
          </span>

          <p class="font-serif text-lg font-bold">{{ plan.name }}</p>

          <div class="mt-4 flex items-baseline gap-1">
            <template v-if="plan.monthlyPrice !== null">
              <span class="font-serif text-4xl font-bold"
                >${{ plan.monthlyPrice }}</span
              >
              <span class="font-mono text-xs text-muted-foreground"
                >/month</span
              >
            </template>
            <template v-else>
              <span class="font-serif text-4xl font-bold">Free</span>
            </template>
          </div>

          <ul class="mt-6 flex flex-1 flex-col gap-3">
            <li
              v-for="feature in features"
              :key="feature.key"
              class="flex items-start gap-2.5 text-sm"
            >
              <Check class="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span class="text-muted-foreground">{{ feature.label }}:</span>
                {{ plan[feature.key] }}
              </span>
            </li>
          </ul>

          <Button
            class="mt-8 w-full"
            :variant="plan.highlighted ? 'archival' : 'archivalOutline'"
            @click="onSelect(plan)"
          >
            {{ plan.monthlyPrice !== null ? "Subscribe" : "Get Started" }}
          </Button>
        </article>
      </div>

      <p class="mt-10 text-center text-[11px] leading-5 text-muted-foreground">
        All plans include free in-store pickup and returns. Prices in USD.
      </p>
    </main>
  </div>
</template>
