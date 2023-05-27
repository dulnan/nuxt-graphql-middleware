<template>
  <div>
    <div>
      This page performs calls useGraphqlQuery with arg and object params.
    </div>
    <hr />
    <div>One: {{ one?.data?.userById?.firstName }}</div>
    <div>Two: {{ two?.data?.userById?.firstName }}</div>
  </div>
</template>

<script lang="ts" setup>
const one = await useGraphqlQuery('userById', { id: '5' })
const two = await useGraphqlQuery({ name: 'userById', variables: { id: '5' } })
</script>
