<template>
  <div v-if="films">
    <h1>List of Films</h1>
    <ul>
      <li v-for="film in films" :key="film.id">
        <nuxt-link :to="'/film/' + film.id">{{ film.title }}</nuxt-link>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const { data: films } = await useAsyncData('filmList', () =>
  useGraphqlQuery('allFilms').then(({ data }) => {
    return data.allFilms.films
  }),
)
</script>
