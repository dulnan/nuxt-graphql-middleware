<template>
  <Messages :messages title="All Messages" />
</template>

<script setup lang="ts">
import type { MessageFragment } from '#graphql-operations'
import { ref, useGraphqlSubscription } from '#imports'

const messages = ref<MessageFragment[]>([])

useGraphqlSubscription('messageAdded', null, {
  handler: (data) => {
    if (data.data.messageAdded) {
      messages.value.push(data.data.messageAdded)
    }
  },
})
</script>
