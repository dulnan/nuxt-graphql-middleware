<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { useNuxtApp, onMounted } from '#imports'
import type { WebsocketMessageSubscriptionResponse } from '../../src/runtime/types'

const app = useNuxtApp()

function onSubscriptionResponse(e: WebsocketMessageSubscriptionResponse) {
  console.log(e)
}

onMounted(() => {
  app.hook(
    'nuxt-graphql-middleware:subscription-response',
    onSubscriptionResponse,
  )
})
</script>

<style>
@import 'https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css';
</style>
