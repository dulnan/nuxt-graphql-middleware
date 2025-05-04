<template>
  <Messages :messages :title />
</template>

<script setup lang="ts">
import type { MessageFragment, MessageType } from '#graphql-operations'
import { computed, ref, useGraphqlSubscription } from '#imports'

const props = defineProps<{
  type: MessageType
}>()

const messages = ref<MessageFragment[]>([])

const title = computed(() => {
  return `Messages of type "${props.type}"`
})

useGraphqlSubscription(
  'messageAddedWithFilter',
  {
    type: props.type,
  },
  (data) => {
    if (data.data.messageAdded) {
      messages.value.push(data.data.messageAdded)
    }
  },
)
</script>
