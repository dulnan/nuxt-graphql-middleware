<template>
  <main>
    <Hero title="GraphQL State" />
    <div class="section">
      <div class="container">
        <h1>
          The initial value is:
          <span id="graphql-state-value">{{ foobarValue }}</span>
        </h1>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useFetch } from 'nuxt/app'

const state = useGraphqlState() as any

if (state && !state.foobar) {
  state.foobar = Math.round(Math.random() * 1000000)
}

const foobarValue = useState('stateTest', () => '')

if (process.server) {
  foobarValue.value = state.foobar
}
</script>
