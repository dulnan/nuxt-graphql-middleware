<template>
  <Messages :messages title="Error messages" />
</template>

<script setup lang="ts">
import type { MessageFragment } from '#graphql-operations'
import { ref, useGraphqlSubscription } from '#imports'

const messages = ref<MessageFragment[]>([])

useGraphqlSubscription('errorMessageAdded', null, (data) => {
  if (data.data.messageAdded) {
    messages.value.push(data.data.messageAdded)
  }
})
</script>
