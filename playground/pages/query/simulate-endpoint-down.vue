<template>
  <div>
    <div>
      This page throws a module specific error because the endpoint is down.
    </div>
  </div>
</template>

<script lang="ts" setup>
const result = await useAsyncData(async () => {
  return await useGraphqlQuery('simulateEndpointDown')
})
</script>
