<template>
  <div class="box" :data-instance="instanceId">
    <h3 class="subtitle">{{ label }}</h3>

    <p
      :data-status="instanceId"
      :style="{ color: isStale ? 'red' : 'green', fontWeight: 'bold' }"
    >
      {{ isStale ? 'STALE' : 'OK' }}
    </p>

    <div class="content">
      <p><strong>overrideOuIds:</strong> {{ overrideOuIds }}</p>
      <p>
        <strong>ouId:</strong> <span :data-ou-id="instanceId">{{ ouId }}</span>
      </p>
      <p><strong>variables:</strong> {{ variables }}</p>
      <p><strong>expected org IDs:</strong> {{ ouId ?? 'any' }}</p>
      <p>
        <strong>actual org IDs in items:</strong>
        <span :data-actual-org-ids="instanceId">{{ actualOrgIds }}</span>
      </p>
    </div>

    <table v-if="items.length" class="table is-fullwidth is-striped">
      <thead>
        <tr>
          <th>Title</th>
          <th>Lead</th>
          <th>Org ID</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in items" :key="index">
          <td>{{ item.title }}</td>
          <td>{{ item.lead }}</td>
          <td>{{ item.organizationId }}</td>
          <td>{{ item.date }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No news items.</p>
  </div>
</template>

<script lang="ts" setup>
import { computed, inject } from '#imports'
import { useAsyncGraphqlQuery } from '#imports'
import { OU_CONTEXT_KEY } from '~/helpers/ouContext'

const props = defineProps<{
  instanceId: string
  label: string
  organizations?: {
    list?: ({ id?: string | number | null } | null)[]
  } | null
}>()

// Inject the current OU context (provided by the page).
const ouContext = inject(OU_CONTEXT_KEY, null)

const overrideOuIds = computed<string[]>(() => {
  return (props.organizations?.list ?? [])
    .map((v) => v?.id)
    .filter((v): v is string | number => v != null)
    .map((v) => v.toString())
})

const ouId = computed<string[] | null>(() => {
  // Organizations set on the component explicitly override the context.
  if (overrideOuIds.value.length) {
    return overrideOuIds.value
  }

  // Use the injected context.
  if (ouContext?.value.ids.length) {
    return ouContext.value.ids
  }

  return null
})

const variables = computed(() => {
  return {
    ouIds: ouId.value,
    limit: 3,
  }
})

const { data: items } = await useAsyncGraphqlQuery('debugNewsList', variables, {
  transform: (data) => {
    return (data.data.newsEntityQuery.items ?? []).filter(
      (v): v is NonNullable<typeof v> =>
        v != null && !!v.title && !!v.url?.path,
    )
  },
  default: () => [],
  graphqlCaching: {
    client: true,
  },
})

const actualOrgIds = computed(() => {
  return [...new Set(items.value.map((v) => v.organizationId))]
})

const isStale = computed(() => {
  if (!ouId.value) {
    return false
  }
  return actualOrgIds.value.some((id) => !ouId.value!.includes(id))
})
</script>
