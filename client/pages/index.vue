<template>
  <div class="relative" style="height: 100vh">
    <div class="flex h-full">
      <div
        class="h-full border-r border-r-gray-800 of-auto"
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
        <div
          v-for="doc in documentsFiltered"
          :key="doc.id"
          class="relative group"
        >
          <button
            class="text-secondary hover:n-bg-hover flex select-none truncate px2 py2 font-mono text-sm w-full"
            @click="selectedId = doc.id"
          >
            <div style="width: 6rem" class="text-left">
              <Tag v-if="doc.identifier === 'query'" green text="Query" />
              <Tag
                v-else-if="doc.identifier === 'mutation'"
                orange
                text="Mutation"
              />
            </div>
            <div>{{ doc.name }}</div>
          </button>
          <button
            class="absolute right-0 top-0 text-sm h-full flex items-center opacity-0 group-hover:opacity-100 pr2"
            @click="copyToClipboard(doc)"
          >
            <span>Copy</span>
          </button>
        </div>
      </div>
      <div class="splitpanes__splitter"></div>
      <div v-if="selected" class="h-full relative w-full of-auto">
        <DocumentDetail
          v-bind="selected"
          :server-api-prefix="serverApiPrefix"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from '#imports'
import { onDevtoolsClientConnected } from '@nuxt/devtools-kit/iframe-client'
import MiniSearch from 'minisearch'
import type {
  ServerFunctions,
  ClientFunctions,
  RpcItem,
} from './../../src/build/types/rpc'

const miniSearch = new MiniSearch<RpcItem>({
  fields: ['id', 'source', 'name', 'filePath', 'identifier'],
  storeFields: ['id', 'source', 'name', 'identifier', 'filePath'],
  searchOptions: {
    fuzzy: 0.7,
  },
})

const RPC_NAMESPACE = 'nuxt-graphql-middleware'

const selectedId = ref('')
const documents = ref<RpcItem[]>([])
const search = ref('')
const serverApiPrefix = ref('')

const selected = computed(() => {
  if (!selectedId.value) {
    return
  }
  return documents.value.find((v) => v.id === selectedId.value)
})

async function updateDocuments(newDocuments: any[]) {
  miniSearch.removeAll()
  documents.value = newDocuments
  miniSearch.addAll(newDocuments)
}

onDevtoolsClientConnected(async (client) => {
  const rpc = client.devtools.extendClientRpc<ServerFunctions, ClientFunctions>(
    RPC_NAMESPACE,
    {
      showNotification() {},
      documentsUpdated(updated: RpcItem[]) {
        updateDocuments(updated)
      },
    },
  )

  const newDocuments = await rpc.getDocuments()
  updateDocuments(newDocuments)
  const options = await rpc.getModuleOptions()
  serverApiPrefix.value = options.serverApiPrefix
})

function copyToClipboard(item: RpcItem) {
  const textArea = document.createElement('textarea')
  textArea.value = item.source

  textArea.style.top = '0'
  textArea.style.left = '0'
  textArea.style.position = 'fixed'

  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    document.execCommand('copy')
  } catch {
    // Noop
  }

  document.body.removeChild(textArea)
}

const documentsFiltered = computed<RpcItem[]>(() => {
  if (!search.value) {
    return documents.value
  }

  const results = miniSearch.search(search.value)
  return results as unknown as RpcItem[]
})
</script>
