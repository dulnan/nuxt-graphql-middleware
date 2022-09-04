<template>
  <div>
    <Title>{{ film.title }}</Title>
    <h1 class="title">{{ film.title }}</h1>
    <p>Director: {{ film.director }}</p>
    <nuxt-link class="button is-text mt-6" to="/">To the list</nuxt-link>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const { data: film } = await useAsyncData('film', () =>
  useGraphqlQuery('filmById', { filmId: route.params.id.toString() }).then(
    (v) => v.data.film,
  ),
)
</script>
