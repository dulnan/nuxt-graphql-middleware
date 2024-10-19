<template>
  <div>
    <div>This page throws a GraphQL error during the query.</div>
    <h1 class="title">Errors:</h1>
    <ul>
      <li v-for="error in errors">
        {{ error.message }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { useGraphqlQuery } from '#imports'
const { data, errors } = await useGraphqlQuery('getError')

console.log(errors)
</script>
