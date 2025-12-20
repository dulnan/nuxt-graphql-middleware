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
            <UserRow
              v-for="user in users"
              :key="user.id"
              v-bind="user"
              @refres="refresh"
            />
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAsyncGraphqlQuery } from '#imports'

const { data: users, refresh } = await useAsyncGraphqlQuery('users', null, {
  transform: (v) => v.data.users,
  graphqlCaching: {
    client: true,
  },
  default: () => {
    return []
  },
})
</script>
