<template>
  <main>
    <div>A page from a layer.</div>

    <code>{{ data }}</code>
  </main>
</template>

<script lang="ts" setup>
import { useAsyncGraphqlQuery } from '#imports'

const { data } = await useAsyncGraphqlQuery('layerData', null, {
  transform: function (v) {
    return v.data.dataForLayer
  },
})
</script>
