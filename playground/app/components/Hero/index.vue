<template>
  <section class="hero is-warning">
    <div class="hero-body">
      <div class="container">
        <h1 class="title is-1">{{ title }}</h1>
        <p v-if="lead" class="subtitle is-4">{{ lead }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  lead?: string | undefined | null
}>()
</script>
