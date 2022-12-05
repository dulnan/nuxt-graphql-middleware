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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const id = route.params.id

const { data: user } = await useAsyncData(id.toString(), () => {
  if (!id || typeof id !== 'string') {
    throw createError({ statusCode: 404, message: 'User not found' })
  }
  return useGraphqlQuery('userById', { id }).then((v) => {
    return v.data.userById
  })
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
