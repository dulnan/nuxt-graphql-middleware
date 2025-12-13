<template>
  <div v-if="users">
    <Hero title="List of users" />
    <div class="section">
      <div class="container">
        <table class="table is-striped is-fullwidth is-hoverable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th class="has-text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>
                {{ user.id }}
              </td>
              <td>
                <nuxt-link :to="'/user/' + user.id">
                  {{ user.firstName }}
                  {{ user.lastName }}
                </nuxt-link>
              </td>
              <td>
                {{ user.email }}
              </td>
              <td class="has-text-right">
                <div class="buttons is-right">
                  <nuxt-link :to="'/user/' + user.id" class="button is-small"
                    >View Details</nuxt-link
                  >
                  <nuxt-link
                    v-if="user.articleCount > 0"
                    :to="'/user/' + user.id + '/content'"
                    class="button is-small is-info"
                    >View Content</nuxt-link
                  >
                  <button
                    class="button is-danger is-small"
                    @click="deleteUser(user.id)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGraphqlMutation, useNuxtApp, useAsyncGraphqlQuery } from '#imports'

const app = useNuxtApp()

const { data: users, refresh } = await useAsyncGraphqlQuery('users', null, {
  transform: (v) => v.data.users,
  graphqlCaching: {
    client: true,
  },
  default: () => {
    return []
  },
})

function purgeCache() {
  if (app.$graphqlCache) {
    app.$graphqlCache.purge()
  }
}

async function deleteUser(id: number) {
  await useGraphqlMutation('deleteUser', { id })
  purgeCache()
  await refresh()
}
</script>
