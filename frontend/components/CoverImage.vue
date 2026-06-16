<script setup lang="ts">
withDefaults(defineProps<{
  crop: number | null
  src?: string
  alt?: string
  class?: string
}>(), {
  src: '',
  alt: 'Book cover',
  class: '',
})
</script>

<template>
  <div v-if="crop !== null" :class="`cover-crop cover-${crop} ${class}`">
    <img src="/images/book-cover-sheet.png" :alt="alt" width="1536" height="1536" loading="lazy" />
  </div>
  <img v-else :src="src" :alt="alt" width="768" height="1152" loading="lazy" :class="class" />
</template>
