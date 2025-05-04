<template>
  <div>
    <div class="container">
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
      <div class="field">
        <label class="label" for="message-message">Message</label>
        <div class="control">
          <input
            type="text"
            v-model="message"
            class="input"
            id="message-message"
          />
        </div>
      </div>
      <div class="field">
        <button class="button is-primary" @click="addMessage">
          Send message
        </button>
      </div>
    </div>

    <section class="section">
      <div class="container">
        <div class="columns">
          <div class="column">
            <MessageSubscriptionAll />
          </div>

          <div class="column">
            <MessageSubscriptionErrors />
          </div>

          <div class="column">
            <MessageSubscriptionFilter type="info" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import type { MessageType } from '#graphql-operations'
import { ref, useGraphqlMutation, useGraphqlSubscription } from '#imports'

const message = ref('Hello World')

const messageTypes: MessageType[] = ['error', 'warning', 'info']

const type = ref<MessageType>('warning')

useGraphqlSubscription('messageAdded', null, (data) => {
  console.log(data.data.messageAdded)
})

const addMessage = async () => {
  await useGraphqlMutation('addMessage', {
    message: message.value,
    type: type.value,
  }).then((data) => data.data.addMessage)
  message.value = ''
}
</script>
