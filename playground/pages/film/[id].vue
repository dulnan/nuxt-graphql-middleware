<template>
  <div>
    <Title>{{ data.film.title }}</Title>
    <h1 class="title">{{ data.film.title }}</h1>
    <p>Director: {{ data.film.director }}</p>
    <nuxt-link class="button is-text mt-6" to="/">To the list</nuxt-link>
  </div>
</template>

<script setup lang="ts">
import { NuxtApp } from '#app'
import { FilmByIdQuery } from '~/types/graphql-operations'

const route = useRoute()

const { data } = await useAsyncData('film', (ctx: NuxtApp) => {
  const variables = {
    filmId: route.params.id.toString(),
  }
  return ctx.$graphql.query('film', variables).then((data: FilmByIdQuery) => {
    return {
      film: data?.film,
    }
  })
})
</script>
