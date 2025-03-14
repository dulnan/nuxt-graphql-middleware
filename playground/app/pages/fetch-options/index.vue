<template>
  <div>
    <Title>Test fetch options</Title>
    <Hero
      title="Test fetch options"
      lead="These values are sent via HTTP headers and returned from the GraphQL server."
    />

    <div v-if="fetchOptions && fetchOptionsApi" class="section">
      <div class="container">
        <h2 class="title is-3">using useGraphqlQuery</h2>
        <h2 class="title is-4">x-nuxt-header-client</h2>
        <code id="fetch-options-graphql-client">{{
          fetchOptions.headerClient
        }}</code>
        <hr />
        <h2 class="title is-4">x-nuxt-header-server</h2>
        <code id="fetch-options-graphql-server">{{
          fetchOptions.headerServer
        }}</code>
        <hr />

        <h2 class="title is-3">using useFetch to custom API endpoint</h2>
        <h2 class="title is-4">x-nuxt-header-client</h2>
        <code id="fetch-options-api-client">{{
          fetchOptionsApi.headerClient
        }}</code>
        <p class="help">
          Should be empty because the plugin is not called here and the header
          value is not set.
        </p>
        <hr />
        <h2 class="title is-4">x-nuxt-header-server</h2>
        <code id="fetch-options-api-server">{{
          fetchOptionsApi.headerServer
        }}</code>
        <hr />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAsyncData, useGraphqlQuery, useFetch } from '#imports'

const { data: fetchOptions } = await useAsyncData('fetchOptions', () => {
  return useGraphqlQuery('fetchOptions').then((v) => {
    return v.data.testFetchOptions
  })
})

const { data: fetchOptionsApi } = await useFetch('/api/fetch-options', {
  key: 'api-fetch-options',
  transform: function (v) {
    return v.testFetchOptions
  },
})
</script>
