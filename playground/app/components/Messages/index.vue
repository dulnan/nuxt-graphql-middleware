<template>
  <div>
    <h3 class="title is-3">{{ title }}</h3>
    <table class="table is-striped is-fullwidth">
      <thead>
        <tr>
          <th>Type</th>
          <th>User</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="message in messages" :key="message.timestamp">
          <td>
            <span
              class="tag"
              :class="{
                'is-info': message.type === 'info',
                'is-warning': message.type === 'warning',
                'is-danger': message.type === 'error',
              }"
              >{{ message.type }}</span
            >
          </td>
          <td>{{ message.user?.firstName }}</td>
          <td>{{ message.message }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { MessageFragment } from '#graphql-operations'

defineProps<{
  title: string
  messages: MessageFragment[]
}>()
</script>
