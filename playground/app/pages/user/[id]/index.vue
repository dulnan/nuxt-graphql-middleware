<template>
  <div v-if="user">
    <Title>{{ user.firstName }} {{ user.lastName }}</Title>
    <Hero :title="title" :lead="user.description" />

    <div class="section">
      <div class="container">
        <h2 class="title is-3">Email</h2>
        <p>{{ user.email }}</p>
        <hr />
        <h2 class="title is-3">Date of birth</h2>
        <p>{{ dateOfBirth }}</p>
        <h2 class="title is-3">Means of Contact</h2>
        <p v-if="user.meansOfContact === MeansOfContact.email">Email</p>
        <p v-else-if="user.meansOfContact === MeansOfContact.phone">Phone</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  MeansOfContact,
  type UserByIdQueryVariables,
} from '#build/graphql-operations'
import { computed } from 'vue'
import { useRoute, useAsyncGraphqlQuery } from '#imports'

const route = useRoute()

const variables = computed<UserByIdQueryVariables>(() => {
  const id = (route.params.id || '').toString()
  return {
    id,
  }
})

const { data: user } = await useAsyncGraphqlQuery('userById', variables, {
  transform: function (v) {
    return v.data.userById
  },
  graphqlCaching: {
    client: true,
  },
})

const title = computed(() => {
  if (!user.value) {
    return ''
  }
  return [user.value.firstName, user.value.lastName].join(' ')
})

const dateOfBirth = computed(() => {
  if (!user.value) {
    return ''
  }
  if (user.value.dateOfBirth) {
    return new Date(user.value.dateOfBirth).toLocaleDateString()
  }
  return ''
})
</script>
