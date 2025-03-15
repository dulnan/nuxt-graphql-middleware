<template>
  <div>
    <h1>{{ text }}</h1>
  </div>
</template>

<script setup lang="ts">
import { useAsyncGraphqlQuery } from '#imports'

const { data: text } = await useAsyncGraphqlQuery('hmr', null, {
  transform: function (data) {
    return data.data.text
  },
})
</script>
