<template>
  <main>
    <Hero
      title="All Emails"
      lead="This page shows all email addresses in use. The data is fetched from a custom server route."
    />
    <div class="section">
      <div class="container">
        <p class="subtitle is-5">
          This page loads the data via a custom API route that in turn uses
          useGraphqlQuery to fetch the data, map it and return it.
        </p>
        <ul>
          <li v-for="email in emails" :key="email">{{ email }}</li>
        </ul>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useFetch } from '#imports'

const { data: emails } = await useFetch('/api/server-route')
</script>
