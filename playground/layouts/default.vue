<template>
  <div>
    <nav class="navbar is-dark" role="navigation" aria-label="main navigation">
      <div class="container">
        <div class="navbar-brand">
          <nuxt-link class="navbar-item has-text-weight-bold" to="/">
            Nuxt GraphQL Middleware
          </nuxt-link>
        </div>

        <div id="navbarBasicExample" class="navbar-menu">
          <div class="navbar-start">
            <nuxt-link class="navbar-item" to="/emails">All emails</nuxt-link>
            <nuxt-link class="navbar-item" to="/fetch-options"
              >Fetch options</nuxt-link
            >
            <nuxt-link class="navbar-item" to="/mutation/trigger-error"
              >Trigger error</nuxt-link
            >
            <nuxt-link class="navbar-item" to="/query/get-error"
              >Query error</nuxt-link
            >
            <nuxt-link class="navbar-item" to="/query/invalid-query-error"
              >Invalid query error</nuxt-link
            >
            <nuxt-link class="navbar-item" to="/query/simulate-endpoint-down"
              >Simulate endpoint down</nuxt-link
            >
            <div class="navbar-item">
              <button class="button is-white" @click="initState">
                Init default state
              </button>
            </div>
            <div class="navbar-item">
              <nuxt-link to="/user/add" class="button is-white"
                >Add user</nuxt-link
              >
            </div>
          </div>
        </div>
      </div>
    </nav>
    <main>
      <slot />
    </main>
  </div>
</template>

<script lang="ts" setup>
import { useGraphqlMutation } from '#imports'

function initState() {
  return useGraphqlMutation('initState')
}
</script>
