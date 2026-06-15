<template>
  <div class="space-y-10">
    <section class="relative border border-border bg-card p-6 shadow-sm">
      <div class="absolute inset-y-0 left-0 w-1 bg-primary" />
      <h2 class="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Yearly Progress
      </h2>
      <slot name="yearly-progress">
        <p class="text-sm italic text-muted-foreground">Set a reading goal to get started.</p>
      </slot>
    </section>

    <section>
      <div class="mb-4 flex items-baseline justify-between border-b border-border pb-2">
        <h2 class="font-serif text-xl">Reader Feed</h2>
        <span class="size-2 rounded-full bg-primary" />
      </div>
      <div class="space-y-6">
        <slot name="reader-feed">
          <p class="text-sm italic text-muted-foreground">No recent activity. Join the conversation.</p>
        </slot>
      </div>
    </section>

    <section class="rounded-sm border-2 border-dashed border-border p-6 text-center">
      <p class="mb-4 font-serif text-sm italic">
        Join the literary circles in your neighborhood.
      </p>
      <slot name="book-club">
        <Button variant="archivalOutline" class="w-full uppercase tracking-widest">
          Find a Book Club
        </Button>
      </slot>
    </section>
  </div>
</template>
