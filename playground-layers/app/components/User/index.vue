<template>
  <tr>
    <td>{{ id }}</td>
    <td>{{ firstName }}</td>
    <td>{{ lastName }}</td>
  </tr>
</template>

<script lang="ts" setup>
defineProps<{
  id: string
  firstName: string
  lastName: string
}>()
</script>
