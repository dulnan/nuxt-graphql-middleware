<template>
  <tr>
    <td>
      {{ id }}
    </td>
    <td>
      <nuxt-link :to="'/user/' + id">
        {{ firstName }}
        {{ lastName }}
      </nuxt-link>
    </td>
    <td>
      {{ email }}
    </td>
    <td class="has-text-right">
      <div class="buttons is-right">
        <nuxt-link :to="'/user/' + id" class="button is-small"
          >View Details</nuxt-link
        >
        <nuxt-link
          v-if="articleCount > 0"
          :to="'/user/' + id + '/content'"
          class="button is-small is-info"
          >View Content</nuxt-link
        >
        <button class="button is-danger is-small" @click="deleteUser">
          Delete
        </button>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type { UserFragment } from '#graphql-operations'
import { useGraphqlMutation, useNuxtApp } from '#imports'

const props = defineProps<UserFragment>()

const app = useNuxtApp()

const emit = defineEmits(['refresh'])

function purgeCache() {
  if (app.$graphqlCache) {
    app.$graphqlCache.purge()
  }
}

async function deleteUser() {
  await useGraphqlMutation('deleteUser', { id: props.id })
  purgeCache()
  emit('refresh')
}
</script>
