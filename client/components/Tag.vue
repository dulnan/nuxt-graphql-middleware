<template>
  <span
    class="mx-0.5 select-none whitespace-nowrap rounded px-1.5 py-0.5 text-xs inline-block"
    :class="classes"
    >{{ text }}</span
  >
</template>

<script lang="ts" setup>
const props = defineProps<{
  green?: boolean
  orange?: boolean
  text: string
}>()

const classes = computed(() => {
  if (props.green) {
    return 'bg-green-400:10 text-green-400'
  } else if (props.orange) {
    return 'bg-orange-400:10 text-orange-400'
  }

  return 'bg-gray-400:10 text-gray'
})
</script>
