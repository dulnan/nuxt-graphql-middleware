<template>
  <div>
    <Hero
      title="Delayed Hydration"
      lead="Test a cached query in a component with delayed hydration"
    />

    <div class="container">
      <LazyCachingCurrentTime
        :hydrate-after="500"
        @hydrated="isHydrated = true"
      />
      <div v-if="isHydrated" id="delayed-hydrated" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const isHydrated = ref(false)
</script>
