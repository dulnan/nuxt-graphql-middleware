<template>
  <div>
    <div class="field">
      <label class="label" for="message-type">Type</label>
      <div class="control">
        <div class="select">
          <select v-model="type" id="message-type">
            <option v-for="value in messageTypes" :key="value" :value>
              {{ value }}
            </option>
          </select>
        </div>
      </div>
    </div>
    <Messages :messages :title />
  </div>
</template>

<script setup lang="ts">
import type { MessageFragment, MessageType } from '#graphql-operations'
import { computed, ref, useGraphqlSubscription } from '#imports'

const messages = ref<MessageFragment[]>([])
const messageTypes: MessageType[] = ['error', 'warning', 'info']
const type = ref<MessageType>('warning')

const title = computed(() => `Messages of type "${type.value}"`)

const variables = computed(() => ({
  type: type.value,
}))

useGraphqlSubscription('messageAddedWithFilter', variables, {
  handler: (data) => {
    messages.value.push(data.data.messageAddedWithFilter)
  },
  clientContext: {
    language: 'override-language',
  },
})
</script>
