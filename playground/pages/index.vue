<template>
  <div>
    <Title>List of Films</Title>
    <h1 class="title">List of Films</h1>
    <ul v-if="films">
      <li v-for="film in films" :key="film.id">
        <nuxt-link :to="'/film/' + film.id">{{ film.title }}</nuxt-link>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const films = await useAsyncData('init', () =>
  useGraphqlQuery('filmList', { path: '/en' }),
).then((data) => data.allFilms.films)
</script>
