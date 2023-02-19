<template>
  <div>
    <div>This page throws a module specific error during the query.</div>
  </div>
</template>

<script lang="ts" setup>
const result = await useAsyncData(async () => {
  return await useGraphqlQuery('invalidquery')
})

console.log(result.error)
</script>
