<template>
  <div>
    <div id="context-time" class="title is-h1">{{ time }}</div>
    <div id="context-mounted-status">{{ mountedStatus }}</div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { definePageMeta, useAsyncGraphqlQuery, useRoute } from '#imports'

// Without a page transition, the page is mounted right away, so the status
// when it is mounted shows whether the cached response was returned right away.
definePageMeta({ pageTransition: false })

const route = useRoute()

// Not awaited, so that the page is mounted with the status of the cache lookup.
const { data: time, status } = useAsyncGraphqlQuery('getCurrentTime', null, {
  transform: (v) => v.data.time,
  graphqlCaching: {
    client: true,
  },
  clientContext: {
    language: String(route.query.lang || 'en'),
  },
})

const mountedStatus = ref('')

onMounted(() => {
  mountedStatus.value = status.value
})
</script>
