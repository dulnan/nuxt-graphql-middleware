<template>
  <div class="relative" style="height: 100vh">
    <div class="flex h-full">
      <div
        class="h-full border-r border-r-gray-800"
        h-full=""
        style="width: 22rem; min-width: 0; flex: 0 0 auto"
      >
        <div
          flex="~ col gap2"
          border="b base"
          class="border-b-gray-800 p3 flex-1"
        >
          <NTextInput
            v-model="search"
            placeholder="Search documents..."
            icon="carbon-search"
            class="w-full"
          />
        </div>
        <button
          v-for="doc in documentsFiltered"
          :key="doc.content"
          class="text-secondary hover:n-bg-hover flex select-none truncate px2 py2 font-mono text-sm w-full"
          :class="{ 'text-red-500': !doc.isValid }"
          @click="selectedId = doc.id"
        >
          <div style="width: 6rem" class="text-left">
            <Tag v-if="doc.operation === 'query'" green text="Query" />
            <Tag
              v-else-if="doc.operation === 'mutation'"
              orange
              text="Mutation"
            />
            <Tag v-else text="Fragment" />
          </div>
          <div>{{ doc.name }}</div>
        </button>
      </div>
      <div class="splitpanes__splitter"></div>
      <div v-if="selected" class="h-full relative w-full">
        <DocumentDetail
          v-bind="selected"
          :server-api-prefix="serverApiPrefix"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onDevtoolsClientConnected } from '@nuxt/devtools-kit/iframe-client'

const RPC_NAMESPACE = 'nuxt-graphql-middleware-rpc'

const selectedId = ref('')
const documents = ref([])
const search = ref('')
const serverApiPrefix = ref('')

const selected = computed(() => {
  if (!selectedId.value) {
    return
  }
  return documents.value.find((v) => v.id === selectedId.value)
})

onDevtoolsClientConnected(async (client) => {
  const rpc = client.devtools.extendClientRpc(RPC_NAMESPACE, {
    documentsUpdated(updated) {
      documents.value = updated
    },
  })

  documents.value = await rpc.getDocuments()

  const options = await rpc.getModuleOptions()
  serverApiPrefix.value = options.serverApiPrefix
})

const documentsFiltered = computed(() => {
  if (!search.value) {
    return documents.value
  }

  return documents.value.filter((v) => {
    const searchText = [v.relativePath, v.name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return searchText.includes(search.value.toLowerCase())
  })
})
</script>
