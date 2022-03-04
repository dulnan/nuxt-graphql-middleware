<template>
  <div>
    Nuxt module playground!

  </div>
</template>

<script setup lang="ts">
import {NuxtApp} from "#app";

const { $graphql } = useNuxtApp()

const variables = {}
const test =  $graphql
    .query('filmList', variables)
    .then((data: any) => {
      return {
        films: data?.allFilms?.films || [],
      }
    })


// const { data } = useAsyncData('data', (ctx: NuxtApp) => {
//   const variables = {}
//
//   // return $graphql
//   //     .query('filmList', variables)
//   //     .then((data: any) => {
//   //       return {
//   //         films: data?.allFilms?.films || [],
//   //       }
//   //     })
//
// })
</script>
