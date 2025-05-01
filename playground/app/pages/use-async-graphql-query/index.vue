<template>
  <div>
    <button @click="number++">Incremenet</button>
    <div>Value: {{ data }}</div>
    <div>From GraphQL Response: {{ data }}</div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useWrappedGraphqlQuery } from '#imports'

const number = ref(0)

const variables = computed(() => {
  return {
    value: number.value,
  }
})

const { data } = await useWrappedGraphqlQuery(variables)
</script>
