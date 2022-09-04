<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
const films = await useAsyncData('filmList', () =>
  useGraphqlQuery('filmList'),
).then((data) => data.allFilms.films)
</script>
