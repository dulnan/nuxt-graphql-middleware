<template>
  <div>
    <Hero title="Client Caching" lead="Test the client caching feature" />

    <div class="container">
      <div class="title is-h1" id="current-time">{{ time }}</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useAsyncGraphqlQuery } from '#imports'

const { data: time } = await useAsyncGraphqlQuery('getCurrentTime', null, {
  transform: (v) => {
    return v.data.time
  },
  graphqlCaching: {
    client: true,
  },
})
</script>
