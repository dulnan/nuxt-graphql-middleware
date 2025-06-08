<template>
  <section class="section">
    <div class="container">
      <button id="increment" @click="number++">Increment</button>
      <button id="decrement" @click="number--">Decrement</button>
      <button id="random" @click="random">Random</button>
      <button id="refresh" @click="onRefresh">Refresh</button>
      <table class="table is-fullwidth">
        <thead>
          <tr>
            <th>Value</th>
            <th>useWrappedGraphqlQuery</th>
            <th>useAsyncGraphqlQuery</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td id="value">{{ number }}</td>
            <td id="wrapped-value">{{ dataWrapped.returnSameValue }}</td>
            <td id="normal-value">{{ data?.returnSameValue }}</td>
          </tr>
          <tr>
            <td></td>
            <td id="wrapped-random">{{ dataWrapped.returnRandomNumber }}</td>
            <td id="normal-random">{{ data?.returnRandomNumber }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script lang="ts" setup>
import {
  computed,
  ref,
  useWrappedGraphqlQuery,
  useAsyncGraphqlQuery,
} from '#imports'

const number = ref(0)

const { data: dataWrapped, refresh: refreshWrapped } =
  await useWrappedGraphqlQuery(
    computed(() => {
      return {
        value: number.value,
        vary: 'wrapped',
      }
    }),
  )

const { data, refresh } = await useAsyncGraphqlQuery(
  'returnSameValue',
  computed(() => {
    return {
      value: number.value,
      vary: 'inline',
    }
  }),
  {
    transform: (data) => {
      return data.data
    },
    dedupe: 'cancel',
    graphqlCaching: {
      client: true,
    },
  },
)

function random() {
  number.value = Math.round(Math.random() * 1000)
}

function onRefresh() {
  refreshWrapped()
  refresh()
}
</script>
