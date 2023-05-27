<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script lang="ts" setup>
import {
  useDevtoolsClient,
  onDevtoolsClientConnected,
} from '@nuxt/devtools-kit/iframe-client'
</script>
