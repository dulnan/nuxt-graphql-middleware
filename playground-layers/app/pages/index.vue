<template>
  <table v-if="users">
    <tbody>
      <User v-for="user in users" v-bind="user" :key="user.id" />
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { useAsyncGraphqlQuery } from '#imports'

const { data: users } = await useAsyncGraphqlQuery('usersLayer', null, {
  transform: (v) => v.data.users,
  graphqlCaching: {
    client: true,
  },
})
</script>
