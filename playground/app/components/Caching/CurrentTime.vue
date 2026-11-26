<template>
  <div id="delayed-time" class="title is-h1">{{ time }}</div>
</template>

<script lang="ts" setup>
import { useAsyncGraphqlQuery } from '#imports'

const { data: time } = useAsyncGraphqlQuery('getCurrentTime', null, {
  transform: (v) => {
    return v.data.time
  },
  graphqlCaching: {
    client: true,
  },
})
</script>
