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
import { useGraphqlMutation } from '#imports'

const { data: users } = await useAsyncGraphqlQuery('users', null, {
  transform: (v) => v.data.users,
})

function deleteUser(id: number) {
  useGraphqlMutation('deleteUser', { id })
}
</script>
