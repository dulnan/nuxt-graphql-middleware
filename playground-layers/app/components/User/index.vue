<template>
  <tr>
    <td>{{ id }}</td>
    <td>{{ firstName }}</td>
    <td>{{ lastName }}</td>
  </tr>
</template>

<script lang="ts" setup>
defineProps<{
  id: number
  firstName: string
  lastName: string
}>()
</script>
