<template>
  <div v-if="groups.length" id="nuxt-graphql-middleware">
    <div id="nuxt-graphql-middleware-errors">
      <div
        id="nuxt-graphql-middleware-errors-background"
        @click="clearErrors"
      />
      <div id="nuxt-graphql-middleware-errors-content">
        <header>
          <h1>nuxt-graphql-middleware</h1>
          <button @click="clearErrors">Close</button>
        </header>

        <ErrorGroup
          v-for="group in groups"
          v-bind="group"
          :key="group.operation + group.operationName"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import './../css/output.css'
import { useState, computed } from '#imports'

import type { OperationResponseError } from '../types'
import ErrorGroup from './ErrorGroup.vue'

const errors = useState<OperationResponseError[]>(
  'nuxt-graphql-middleware-errors',
  () => [],
)

const groups = computed<OperationResponseError[]>(() => {
  return [
    ...errors.value
      .reduce<Map<string, OperationResponseError>>((acc, v) => {
        const key = `${v.operation}_${v.operationName}`
        if (!acc.has(key)) {
          acc.set(key, {
            operation: v.operation,
            operationName: v.operationName,
            errors: [],
            stack: v.stack,
          })
        }
        acc.get(key)!.errors.push(...v.errors)
        return acc
      }, new Map())
      .values(),
  ]
})

/** Clear the error state => close/hide the overlay */
function clearErrors() {
  errors.value = []
}
</script>
