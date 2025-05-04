<template>
  <Messages :messages title="Error messages" />
</template>

<script setup lang="ts">
import type { MessageFragment } from '#graphql-operations'
import { ref, useGraphqlSubscription } from '#imports'

const messages = ref<MessageFragment[]>([])

useGraphqlSubscription('errorMessageAdded', (data) => {
  messages.value.push(data.data.errorAdded)
})
</script>
