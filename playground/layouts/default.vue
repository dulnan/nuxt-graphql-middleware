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
            <div class="navbar-item">
              <nuxt-link to="/user/add" class="button is-white"
                >Add user</nuxt-link
              >
            </div>
          </div>

          <div class="navbar-end">
            <a
              href="https://github.com/dulnan/nuxt-graphql-middleware"
              class="navbar-item"
            >
              Github
            </a>

            <a href="/" class="navbar-item"> Documentation </a>
          </div>
        </div>
      </div>
    </nav>
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup></script>

<!-- Having a script tag with style in layouts leads to errors on the page after build -->
<!-- Styles are moved to assets/layut/_layout.scss -->
