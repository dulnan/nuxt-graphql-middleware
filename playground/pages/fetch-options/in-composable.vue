<template>
  <div>
    <Title>Test fetch options</Title>
    <Hero
      title="Test fetch options in composable"
      lead="These values are sent via HTTP headers and returned from the GraphQL server."
    />

    <div v-if="data" class="section">
      <div class="container">
        <h2 class="title is-3">using useGraphqlQuery</h2>
        <h2 class="title is-4">x-nuxt-header-client-from-composable</h2>
        <code id="x-nuxt-header-client-from-composable">{{
          data.headerValueFromComposable
        }}</code>
        <hr />
        <h2 class="title is-4">x-nuxt-header-server</h2>
        <code id="fetch-options-graphql-server">{{
          data.headerValueFromPlugin
        }}</code>
        <hr />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAsyncData, useGraphqlQuery } from '#imports'

const { data } = await useAsyncData('fetchOptions', () => {
  return useGraphqlQuery('fetchOptionsComposable', null, {
    fetchOptions: {
      headers: {
        'x-nuxt-header-client-from-composable': 'hello world',
      },
    },
  }).then((v) => {
    return v.data
  })
})
</script>
