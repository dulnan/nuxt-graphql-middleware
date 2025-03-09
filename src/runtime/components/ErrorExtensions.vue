<template>
  <tr v-for="item in mapped" :key="item.key">
    <td>{{ item.key }}</td>
    <td>{{ item.value }}</td>
  </tr>
</template>

<script setup lang="ts">
import { computed } from '#imports'

const props = defineProps<{
  extensions?: Record<string, unknown>
}>()

const mapped = computed(() => {
  if (!props.extensions) {
    return []
  }
  return Object.entries(props.extensions).map(([key, value]) => {
    return { key, value }
  })
})
</script>
