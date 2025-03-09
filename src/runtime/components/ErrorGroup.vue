<template>
  <table class="nuxt-graphql-middleware-error-group">
    <tbody>
      <tr>
        <td>Operation</td>
        <td>{{ operation }}</td>
      </tr>

      <tr></tr>
      <tr>
        <td>Name</td>
        <td>{{ operationName }}</td>
      </tr>

      <tr>
        <td>File</td>
        <td>{{ filePath }}</td>
      </tr>
      <tr v-if="stack">
        <td>Stack</td>
        <td v-text="stack" />
      </tr>
      <template v-for="error in uniqueErrors" :key="error.key">
        <tr>
          <td>Path</td>
          <td>{{ error.path.join(' - ') }}</td>
        </tr>
        <tr>
          <td colspan="2" class="ngm-large">{{ error.message }}</td>
        </tr>

        <template v-if="source">
          <tr
            v-for="(location, i) in error.locations"
            :key="error.key + 'code' + i"
          >
            <td colspan="2">
              <CodeFrame v-bind="location" :source />
            </td>
          </tr>
        </template>

        <ErrorExtensions :extensions="error.extensions" />
      </template>
    </tbody>
  </table>
</template>

<script lang="ts" setup>
import type { GraphqlResponseError } from '../types'
import { documents } from '#nuxt-graphql-middleware/documents'
import { operationSources } from '#nuxt-graphql-middleware/sources'
import { computed } from '#imports'
import CodeFrame from './CodeFrame.vue'
import ErrorExtensions from './ErrorExtensions.vue'

type MappedError = GraphqlResponseError & { count: number; key: string }

const props = defineProps<{
  operation: string
  operationName: string
  errors: GraphqlResponseError[]
  stack?: string
}>()

const key = computed(() => props.operation + '_' + props.operationName)

const filePath = computed(() => {
  return operationSources[key.value]
})

const source = computed(
  () => (documents as any)[props.operation]?.[props.operationName],
)

const uniqueErrors = computed<MappedError[]>(() => {
  return props.errors
    .reduce<Map<string, MappedError>>((acc, v) => {
      const key = v.message
      if (!acc.has(key)) {
        acc.set(key, { ...v, key, count: 0 })
      }
      acc.get(key)!.count++
      return acc
    }, new Map())
    .values()
    .toArray()
})
</script>
