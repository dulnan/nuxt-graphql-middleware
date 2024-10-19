<template>
  <div>
    <button class="button" @click="click">Trigger an error</button>
  </div>
</template>

<script lang="ts" setup>
import { useGraphqlMutation } from '#imports'

async function click() {
  const foo = await useGraphqlMutation('triggerError')
  console.log(foo)
}
</script>
