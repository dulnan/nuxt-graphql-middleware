<template>
  <div class="h-full of-hidden p2">
    <div class="p5">
      <h2 class="font-mono mb4 font-bold text-3xl">{{ name }}</h2>
      <div v-if="url" class="mb3">
        <Tag v-if="operation === 'query'" green text="GET" />
        <Tag v-else orange text="POST" />
        <a
          class="n-transition n-link n-link-base hover:n-link-hover ml2"
          target="_blank"
          :href="url"
          >{{ url }}</a
        >
      </div>
    </div>
    <NSectionBlock text="Document" :description="relativePath" padding="px4">
      <NCodeBlock :code="content" lang="graphql" />
    </NSectionBlock>

    <NSectionBlock
      text="Errors"
      :description="errorsMapped.length + ' errors'"
      padding="px4"
    >
      <div
        v-if="errorsMapped.length"
        class="font-mono bg-red-900 text-red-100 p2"
      >
        <div v-for="(e, i) in errorsMapped" :key="i">{{ e }}</div>
      </div>
    </NSectionBlock>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  id: string
  content: string
  isValid?: boolean
  errors?: any[]
  filename?: string
  relativePath?: string
  name?: string
  operation?: string
  serverApiPrefix: string
}>()

const errorsMapped = computed(() => {
  return (props.errors || []).map((v) => v.message)
})

const url = computed(() => {
  if (props.operation) {
    return `${props.serverApiPrefix}/${props.operation}/${props.name}`
  }
})
</script>
