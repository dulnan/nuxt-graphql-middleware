<template>
  <div>
    <header class="header">
      <h1 class="title">
        <nuxt-link :to="'/'">
          <span>GraphQL Demo</span>
        </nuxt-link>
      </h1>
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup>

</script>

<!-- Having a script tag with style in layouts leads to errors on the page after build -->
<!-- Styles are moved to assets/layut/_layout.scss -->
