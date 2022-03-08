<template>
  <div>
    <Title>List of Films</Title>
    <h1 class="title">List of Films</h1>
    <ul v-if="data">
      <li v-for="film in data.films" :key="film.id">
        <nuxt-link :to="'/film/' + film.id">{{ film.title }}</nuxt-link>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { NuxtApp } from '#app'
import { AllFilmsQuery } from '~/types/graphql-operations'

const { data } = await useAsyncData('data', (ctx: NuxtApp) => {
  const variables = {}

  return ctx.$graphql
    .query('filmList', variables)
    .then((data: AllFilmsQuery) => {
      return {
        films: data?.allFilms?.films || [],
      }
    })
})
</script>
