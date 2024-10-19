<template>
  <div>
    <div>This page throws a module specific error during the query.</div>
  </div>
</template>

<script lang="ts" setup>
import { useAsyncData, useGraphqlQuery } from '#imports'

const result = await useAsyncData(async () => {
  // @ts-ignore
  return await useGraphqlQuery('invalidquery')
})

console.log(result.error)
</script>
