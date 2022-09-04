import type { Ref } from 'vue'
import { GraphqlMiddlewareState } from './../types'
import { ref, useNuxtApp, defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin(() => {
  const nuxtApp = useNuxtApp() as Partial<{
    _graphql_middleware: Ref<GraphqlMiddlewareState>
  }>

  if (!nuxtApp?._graphql_middleware) {
    nuxtApp._graphql_middleware = ref({
      fetchOptions: {},
    })
  }
})
