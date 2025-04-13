<template>
  <div class="h-full of-auto p2">
    <div class="p5">
      <h2 class="font-mono mb4 font-bold text-3xl">{{ name }}</h2>
      <div v-if="url" class="mb3">
        <Tag v-if="identifier === 'query'" green text="GET" />
        <Tag v-else orange text="POST" />
        <a
          class="n-transition n-link n-link-base hover:n-link-hover ml2"
          target="_blank"
          :href="url"
          >{{ url }}</a
        >
      </div>
    </div>
    <NSectionBlock text="Document" :description="filePath" padding="px4">
      <NCodeBlock :code="source" lang="graphql" />
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
import type { RpcItem } from './../../src/build/types/rpc'
const props = defineProps<RpcItem & { serverApiPrefix: string }>()

const errorsMapped = computed(() => {
  return []
})

const url = computed(() => {
  if (props.identifier !== 'fragment') {
    return `${props.serverApiPrefix}/${props.identifier}/${props.name}`
  }
  return null
})
</script>
