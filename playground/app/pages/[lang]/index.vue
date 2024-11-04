<template>
  <div>
    <div>
      <h1>Current language: {{ language }}</h1>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useCurrentLanguage } from '#imports'

const language = useCurrentLanguage()
</script>
