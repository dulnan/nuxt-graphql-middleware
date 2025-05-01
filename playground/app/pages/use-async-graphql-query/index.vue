<template>
  <div>
    <button @click="number++">Increment</button>
    <button @click="number--">Decrement</button>
    <button @click="onRefresh">Refresh</button>
    <div>Value: {{ number }}</div>
    <div>From GraphQL Response: {{ data.returnSameValue }}</div>
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

const { data, refresh } = await useWrappedGraphqlQuery(variables)

function onRefresh() {
  refresh()
}
</script>
