<template>
  <div class="relative" style="height: 100vh">
    <div class="flex h-full">
      <div class="h-full" border="r base" h-full="" style="width: 30%">
        <button
          v-for="doc in documents"
          :key="doc.content"
          class="text-secondary hover:n-bg-hover flex select-none truncate px2 py2 font-mono text-sm w-full"
          @click="selected = doc"
        >
          <div style="width: 6rem" class="text-left">
            <span
              v-if="doc.operation === 'query'"
              class="mx-0.5 select-none whitespace-nowrap rounded px-1.5 py-0.5 text-xs"
              bg-green-400:10=""
              text-green-400=""
              >Query</span
            >
            <span
              v-else-if="doc.operation === 'mutation'"
              class="mx-0.5 select-none whitespace-nowrap rounded px-1.5 py-0.5 text-xs"
              bg-orange-400:10=""
              text-orange-400=""
              >Mutation</span
            >
            <span
              v-else
              class="mx-0.5 select-none whitespace-nowrap rounded px-1.5 py-0.5 text-xs"
              bg-gray-400:10=""
              text-gray=""
              >Fragment</span
            >
          </div>
          <div>{{ doc.name }}</div>
        </button>
      </div>
      <div class="splitpanes__splitter"></div>
      <div v-if="selected" class="h-full relative w-full">
        <div class="h-full of-hidden p2">
          <h2 class="font-mono mb4 text-sm">{{ selected.filename }}</h2>
          <NCodeBlock :code="selected.content" lang="graphql" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  useDevtoolsClient,
  onDevtoolsClientConnected,
} from '@nuxt/devtools-kit/iframe-client'

const RPC_NAMESPACE = 'nuxt-graphql-middleware-rpc'

const selected = ref(null)
const documents = ref([])

onDevtoolsClientConnected(async (client) => {
  const rpc = client.devtools.extendClientRpc(RPC_NAMESPACE, {
    documentsUpdated(updated) {
      documents.value = updated
      console.log(documents.value)
    },
  })

  documents.value = await rpc.getDocuments()

  console.log(documents.value)
})
</script>
